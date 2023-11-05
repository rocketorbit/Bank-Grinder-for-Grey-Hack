metaxploit = include_lib("/lib/metaxploit.so")
if not metaxploit then
    metaxploit = include_lib(current_path + "/metaxploit.so")
	if not metaxploit then exit("Error: Missing metaxploit library")
end if //get metaxploit

crypto = include_lib("/lib/crypto.so")
if not crypto then
    crypto = include_lib(current_path + "/crypto.so")
    if not crypto then exit("Error: Missing crypto library")
end if //get crypto

//WARNING! API here was heavily modified to fix this specific script and will likely be dangerous for other script, get unmodified API from www.ExploitDatabase.org if you want to use this API on other things
getCloudExploitAPI = function(metaxploit)
    recursiveCheck = function(anyObject, maxDepth = -1)
        if maxDepth == 0 then return true
        if @anyObject isa map or @anyObject isa list then
            for key in indexes(@anyObject)
                if not recursiveCheck(@key, maxDepth - 1) then return false
            end for
            for val in values(@anyObject)
                if not recursiveCheck(@val, maxDepth - 1) then return false
            end for
        end if
        if @anyObject isa funcRef then return false
        return true
    end function
    if "" + metaxploit != "MetaxploitLib" then return print("metaxploit required for api to work.")
    netSession = metaxploit.net_use(nslookup("www.ExploitDatabase.org"), 22) //connect to server with metaxploit on ssh service
    if netSession then metaLib = netSession.dump_lib else metaLib = null
    if metaLib then remoteShell = metaLib.overflow("0xF8E54A6", "becolo") else remoteShell = null //exploit needed to grab a guest shell to the server
    if "" + remoteShell != "shell" then print("Server failed. API running in local mode.")
    
    api = {}
    api.classID = "api"
    api.connection = remoteShell
    api.metaxploit = metaxploit
    api.interface = get_custom_object
    api.typeofConnection = "" + remoteShell
    //clearInterface removed. no get_custom_object in this script therefore no need.

    //all api method start
    api.testConnection = function(self) //demo method.
        if self.typeofConnection != "shell" then return false
        self.interface.ret = null
        self.interface.args = ["testConnection"]
        self.connection.launch("/interfaces/exploitAPI")
        if not hasIndex(self.interface, "ret") then return false //not (not) is for casting null to false, false to false, empty set to false, everything else to true.
        if @self.interface.ret isa funcRef or @self.interface.ret isa map then return false
        ret = not (not @self.interface.ret)
        return ret
    end function
    api.scanMetaLib = function(self, metaLib)
        self.interface.ret = null
        self.interface.args = ["scanMetaLib", metaLib]
        if self.typeofConnection == "shell" then self.connection.launch("/interfaces/exploitAPI")
        print("IF YOU SEE ANY WEIRD OUTPUT ABOVE (ESPECIALLY OVERFLOW PROMPT), OR IF YOUR TERMINAL WAS CLEARED (OUTPUT SHOULD ONLY BE A PROGRESS BAR, NOTHING MORE NOTHING LESS), IT MEANS THE SERVER WAS HACKED AND YOU NEED TO STOP USING THIS API RIGHT NOW, AND CONTACT DISCORD:rocketorbit IMMEDIATELY.")
        if hasIndex(self.interface, "ret") and @self.interface.ret != null and recursiveCheck(@self.interface.ret) then return @self.interface.ret
        print("Server failed. Using local scan.")
        ret = {}
        ret.lib_name = lib_name(metaLib)
        ret.version = version(metaLib)
        ret.memorys = {}
        memorys = self.metaxploit.scan(metaLib)
        for memory in memorys
            addresses = split(self.metaxploit.scan_address(metaLib, memory), "Unsafe check:")
            ret.memorys[memory] = []
            for address in addresses
                if address == addresses[0] then continue
                value = address[indexOf(address, "<b>") + 3:indexOf(address, "</b>")].replace("\n", "")
                ret.memorys[memory] = ret.memorys[memory] + [value]
            end for
        end for
        return ret
    end function
    api.queryExploit = function(self, libVersion)
        if self.typeofConnection != "shell" then return null
        self.interface.ret = null
        self.interface.args = ["queryExploit", "kernel_router.so", libVersion]
        self.connection.launch("/interfaces/exploitAPI")
        if not hasIndex(self.interface, "ret") then return null
        if not recursiveCheck(@self.interface.ret) then return null
        return @self.interface.ret
    end function
    api.getHashes = function(self)
        if self.typeofConnection != "shell" then return null
        self.interface.ret = null
        self.interface.args = ["getHashes"]
        self.connection.launch("/interfaces/exploitAPI")
        if not hasIndex(self.interface, "ret") then return null
        if not recursiveCheck(@self.interface.ret) then return null
        return @self.interface.ret
    end function
    //all api method end

    if not api.testConnection then print("unable to reach server. API is in local mode.")

    return api
end function

api = getCloudExploitAPI(metaxploit)
hashMap = api.getHashes
if not hashMap isa map then hashMap = {}
print("loaded " + hashMap.len + " hashes from cloud.")

randomKey = function(length = 8, charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
    charlen = charset.len
    k = ""
    while k.len < length
        k = k + charset[floor(rnd * charlen)]
    end while
    return k
end function

rndIp = function
    ip0 = floor((rnd * 220) + 2)
    ip1 = floor((rnd * 255))
    if ip0 == 10 then ip0 = 222
    if ip0 == 127 then ip0 = 223
    if (ip0 == 192 and ip1 == 168) or (ip0 == 172 and ip1 == 16) then ip1 = 255
    return ip0 + "." + ip1 + "." + floor((rnd * 256)) + "." + floor((rnd * 256)) //Generate a random ip, doesnt start with 1
end function //Generate random IP

timeDecipher = null

crack = function(hsh)
    if hashMap.hasIndex(hsh) then return hashMap[hsh]
    if timeDecipher and timeDecipher > 2 then return null //throw away value that can not be instantly deciphered, if you want the value, comment out this line.
    startTime = time
    hsh = crypto.decipher(hsh)
    globals.timeDecipher = time - startTime
    print("<color=orange>" + hsh + "</color>")
    return hsh
end function

computerBank = function(computer)
    ret = []
    homeFolder = computer.File("/home")
    if not homeFolder then return ret
    for folder in homeFolder.get_folders
        folderName = folder.name
        if folderName == "guest" then continue
        bankFile = computer.File("/home/" + folderName + "/Config/Bank.txt")
        if not bankFile then break
        bank = bankFile.get_content
        if not bank then break
        bank = bank.trim.split(":")
        if bank.len != 2 then break
        bank[1] = crack(bank[1])
        if not bank[1] then continue
        ret.push(bank[0] + ":" + bank[1])
    end for
    return ret
end function

attackLanIp = function(publicIp, lanIp, metaLib, exploits, routerVersion) //we only work with bounce exploits, because it gives access over the entire network.
    if not metaLib then return []
    for e in exploits.memorys
        for value in e.value
            result = metaLib.overflow(e.key, value, lanIp)
            if "" + result != "computer" then continue //bounce exploits can only be computer.
            if result.get_name == "router" then return [] //router does not contain banks.
            newBanks = computerBank(result)
            if newBanks then return [newBanks, e.key, value] else return [] //if we did not get bank, it might be player network. we return anyway because a failed computer object means other exploits will also fail.
        end for
    end for
    return routerVersion //no computer. we return the version number so that we avoid it the next time.
end function

counter = 0
banks = []
avoidedVersions = [ //predefined for public V0.8.5000 Alpha UTC20231104 0830
    "1.0.0", "1.1.3", "1.1.6", "1.1.8", "1.1.9", "1.2.1", "1.2.3", "1.2.4", "1.2.6", "1.2.7", "1.2.8", "1.3.4", "1.3.6", "1.4.9", "1.5.1", "1.6.2", "1.6.4", "1.6.5", "1.6.6", "1.6.7", "1.6.8", "1.6.9", "1.8.2", "1.8.3", "1.8.7", "1.8.8", "1.8.9", "1.9.0", "1.9.1", "1.9.2", "1.9.4", "1.9.5", "1.9.6", "1.9.7", "1.9.8", "1.9.9", "2.0.2", "2.0.3", "2.0.4", "2.0.6",
]
usedExploits = {}
while true
    print("<color=red>currently at " + banks.len + " banks</color>")
    if banks.len >= 500 then
        counter = counter + 1
        computer = get_shell.host_computer
        computer.create_folder(current_path, "banksFolder")
        banksFolder = computer.File(current_path + "/banksFolder")
        fileName = randomKey
        while computer.File(banksFolder.path + "/" + fileName)
            fileName = randomKey
        end while
        computer.touch(banksFolder.path, fileName)
        computer.File(banksFolder.path + "/" + fileName).set_content(banks.join(char(10)))
        print("<color=red>more than " + (counter * 5) + "00 banks achieved, saving to file.</color>" + char(10) + "<color=orange>" + time + "</color>", true)
        banks = []
    end if
    ip = rndIp
    router = get_router(ip)
    if not router then continue
    routerVersion = router.kernel_version
    if avoidedVersions.indexOf(routerVersion) != null then continue //we avoid hacking mechines that will most likely fail
    lanIps = router.devices_lan_ip
    if not lanIps or lanIps.len <= 3 or lanIps.len >= 9 then continue //length here gets compared to magic numbers, have great impact on efficiency. we avoid networks with certain amount of machines in it.
    netSession = metaxploit.net_use(ip, 0)
    if not netSession then continue
    metaLib = netSession.dump_lib
    if not metaLib then continue
    if usedExploits.hasIndex(routerVersion) then
        exploits = usedExploits[routerVersion] //use local cache to boost speed
    else
        exploits = api.queryExploit(routerVersion)
        if not exploits then exploits = api.scanMetaLib(metaLib)
        usedExploits[routerVersion] = exploits //cache exploit so no more need to get from cloud.
    end if
    for lanIp in lanIps
        newBanks = attackLanIp(ip, lanIp, metaLib, exploits, routerVersion)
        if not newBanks then continue
        if newBanks isa string and avoidedVersions.push(newBanks) then break //no computer exploit, we will avoid it next time.
        banks = banks + newBanks[0]
        exploits = {"memorys": {newBanks[1]:[newBanks[2]]}}
    end for
end while