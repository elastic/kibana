---
title: "Elastic catches DPRK passing out KANDYKORN"
slug: "elastic-catches-dprk-passing-out-kandykorn"
date: "2023-11-01"
description: "Elastic Security Labs exposes an attempt by the DPRK to infect blockchain engineers with novel macOS malware."
author:
  - slug: colson-wilhoit
  - slug: ricardo-ungureanu
  - slug: seth-goodwin
  - slug: andrew-pease
image: "photo-edited-01@2x.jpg"
category:
  - slug: malware-analysis
  - slug: attack-pattern
  - slug: activity-group
tags:
  - ref7001
  - KANDYKORN
  - SUGARLOADER
  - HLOADER
  - DPRK
  - Lazarus Group
  - Crypto
  - Financial Motivation
---

## Preamble

Elastic Security Labs is disclosing a novel intrusion targeting blockchain engineers of a crypto exchange platform. The intrusion leveraged a combination of custom and open source capabilities for initial access and post-exploitation.

We discovered this intrusion when analyzing attempts to reflectively load a binary into memory on a macOS endpoint. The intrusion was traced to a Python application posing as a cryptocurrency arbitrage bot delivered via a direct message on a public Discord server.

We attribute this activity to DPRK and recognize overlaps with the Lazarus Group based on our analysis of the techniques, network infrastructure, code-signing certificates, and custom Lazarus Group detection rules; we track this intrusion set as REF7001.

### Key takeaways
* Threat actors lured blockchain engineers with a Python application to gain initial access to the environment
* This intrusion involved multiple complex stages that each employed deliberate defense evasion techniques
* The intrusion set was observed on a macOS system where an adversary attempted to load binaries into memory, which is atypical of macOS intrusions

## Execution flow
![_REF7001 Execution Flow_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image31.jpg)


Attackers impersonated blockchain engineering community members on a public Discord frequented by members of this community. The attacker social-engineered their initial victim, convincing them to download and decompress a ZIP archive containing malicious code. The victim believed they were installing an [arbitrage bot](https://wundertrading.com/en/crypto-arbitrage-bot), a software tool capable of profiting from cryptocurrency rate differences between platforms.

This execution kicked off the primary malware execution flow of the REF7001 intrusion, culminating in KANDYKORN:
* Stage 0 (Initial Compromise) - `Watcher.py`
* Stage 1 (Dropper) - `testSpeed.py` and `FinderTools`
* Stage 2 (Payload) - `.sld` and `.log` - SUGARLOADER
* Stage 3 (Loader)- Discord (fake) - HLOADER
* Stage 4 (Payload) - KANDYKORN

## Stage 0 Initial compromise: Watcher.py

The initial breach was orchestrated via a camouflaged Python application designed and advertised as an arbitrage bot targeted at blockchain engineers. This application was distributed as a .zip file titled `Cross-Platform Bridges.zip`. Decompressing it reveals a `Main.py` script accompanied by a folder named `order_book_recorder`, housing 13 Python scripts.

![_Cross-Platform Bridges.zip folder structure_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image21.png)


The victim manually ran the `Main.py` script via their PyCharm IDE Python interpreter.

Initially, the `Main.py` script appears benign. It imports the accompanying Python scripts as modules and seems to execute some mundane functions. 

While analyzing the modules housed in the `order_book_recorder` folder, one file -- `Watcher.py` -- clearly stood out and we will see why.

`Main.py` acts as the initial trigger, importing `Watcher.py` as a module that indirectly executes the script. The Python interpreter runs every top-level statement in `Watcher.py` sequentially.

The script starts off by establishing local directory paths and subsequently attempts to generate a `_log` folder at the specified location. If the folder already exists, the script remains passive.

![*Creating a folder within the Python application directory structure and name it _log*](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image17.png)


The script pre-defines a `testSpeed.py` file path (destined for the just created `_log` folder) and assigns it to the `output` variable. The function `import_networklib` is then defined. Within it, a Google Drive URL is initialized. 

Utilizing the Python `urllib` library, the script fetches content from this URL and stashes it in the `s_args` variable. In case of retrieval errors, it defaults to returning the operating system's name. Subsequently, the content from Google Drive (now in `s_args`) is written into the `testSpeed.py` file.

![_Malicious downloader function import_networklib_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image25.png)


![_Connect to Google Drive url and download data saved to a variable s_args_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image24.png)


![*Write data from s_args to testSpeed.py file in newly created _log directory*](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image1.png)


The next function, `get_modules_base_version`, probes the Python version and invokes the `import_networklib` function if it detects version 3. This call sets the entire sequence in motion.

![_Check if Python version 3, calls the import_networklib function_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image14.png)


`Watcher.py` imports `testSpeed.py` as a module, executing the contents of the script.

![_Import testSpeed.py to execute it_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image7.png)


Concluding its operation, the malicious script tidies up, deleting the `testSpeed.py` file immediately after its one-time execution.

![_Delete the downloaded testSpeed.py file following its import and execution_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image8.png)


![_Watcher.py deletes the testSpeed.py immediately following its execution_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image35.png)


## Stage 1 droppers testSpeed.py and FinderTools

When executed, `testSpeed.py` establishes an outbound network connection and fetches another Python file from a Google Drive URL, named `FinderTools`. This new file is saved to the `/Users/Shared/` directory, with the method of retrieval mirroring the `Watcher.py` script.

![_testSpeed.py network connection_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image9.png)


![_FinderTools file creation _](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image2.png)


After download, `testSpeed.py` launches `FinderTools`, providing a URL (`tp-globa[.]xyz//OdhLca1mLUp/lZ5rZPxWsh/7yZKYQI43S/fP7savDX6c/bfC`) as an argument which initiates an outbound network connection. 

![_FinderTools execution_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image3.png)


![_FinderTools network connections_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image13.png)


`FinderTools` is yet another dropper, downloading and executing a hidden second stage payload `.sld` also written to the `/Users/Shared/` directory.

![_FinderTools executes .sld_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image5.png)


## Stage 2 payload .sld and .log: SUGARLOADER

Stage 2 involves the execution of an obfuscated binary we have named SUGARLOADER, which is utilized twice under two separate names (`.sld` and `.log`).

SUGARLOADER is first observed at `/Users/shared/.sld`. The second instance of SUGARLOADER, renamed to `.log`, is used in the persistence mechanism REF7001 implements with Discord. 

### Obfuscation

SUGARLOADER is used for initial access on the machine, and initializing the environment for the final stage. This binary is obfuscated using a binary packer, limiting what can be seen with static analysis.

The start function of this binary consists of a jump (`JMP`) to an undefined address. This is common for binary packers.

```
HEADER:00000001000042D6 start:
HEADER:00000001000042D6                 jmp     0x10000681E
```

Executing the macOS file object tool `otool -l ./log` lists all the sections that will be loaded at runtime.

```
Section
  sectname __mod_init_func
   segname lko2
      addr 0x00000001006983f0
      size 0x0000000000000008
    offset 4572144
     align 2^3 (8)
    reloff 0
    nreloc 0
     flags 0x00000009
 reserved1 0
 reserved2 0
```

`__mod_init_func` contains initialization functions. The C++ compiler places static constructors here. This is the code used to unpack the binary in memory.

A successful method of reverse engineering such files is to place a breakpoint right after the execution of initialization functions and then take a snapshot of the process's virtual memory. When the breakpoint is hit, the code will already be decrypted in memory and can be analyzed using traditional methods.

Adversaries commonly use obfuscation techniques such as this to bypass traditional static signature-based antimalware capabilities. As of this publication, VirusTotal [shows 0 detections of this file](https://www.virustotal.com/gui/file/3ea2ead8f3cec030906dcbffe3efd5c5d77d5d375d4a54cca03bfe8a6cb59940), which suggests these defense evasions continue to be cost-effective.

![_SUGARLOADER VirusTotal Detections_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image11.png)


### Execution

The primary purpose of SUGARLOADER is to connect to a Command and Control server (C2), in order to download a final stage payload we refer to as KANDYKORN, and execute it directly in memory. 

SUGARLOADER checks for the existence of a configuration file at `/Library/Caches/com.apple.safari.ck`. If the configuration file is missing, it will be downloaded and created via a default C2 address provided as a command line argument to the `.sld` binary. In our sample, the C2 address was `23.254.226[.]90` over TCP port `443`. We provide additional information about the C2 in the Network Infrastructure section below.

![_SUGARLOADER C2 established and configuration file download_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image4.png)


![_SUGARLOADER writing configuration file_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image40.png)


The configuration file is encrypted using RC4 and the encryption key (in the Observations section) is hardcoded within SUGARLOADER itself. The `com.apple.safari.ck` file is utilized by both SUGARLOADER and KANDYKORN for establishing secure network communications.
```
struct MalwareConfig
{
  char computerId[8];
  _BYTE gap0[12];
  Url c2_urls[2];
  Hostname c2_ip_address[2];
  _BYTE proxy[200];
  int sleepInterval;
};
```

`computerId` is a randomly generated string identifying the victim’s computer.

A C2 server can either be identified with a fully qualified URL (`c2_urls`) or with an IP address and port (`c2_ip_ddress`). It supports two C2 servers, one as the main server, and the second one as a fallback. The specification or hardcoding of multiple servers like this is commonly used by malicious actors to ensure their connection with the victim is persistent should the original C2 be taken down or blocked. `sleepInterval` is the default sleeping interval for the malware between separate actions.

Once the configuration file is read into memory and decrypted, the next step is to initialize a connection to the remote server. All the communication between the victim’s computer and the C2 server is detailed in the Network Protocol section.

The last step taken by SUGARLOADER is to download a final stage payload from the C2 server and execute it. REF7001 takes advantage of a technique known as [reflective binary loading](https://attack.mitre.org/techniques/T1620/) (allocation followed by the execution of payloads directly within the memory of the process) to execute the final stage, leveraging APIs such as `NSCreateObjectFileImageFromMemory` or `NSLinkModule`. Reflective loading is a powerful technique. If you'd like to learn more about how it works, check out this research by [slyd0g](https://slyd0g.medium.com/understanding-and-defending-against-reflective-code-loading-on-macos-e2e83211e48f) and [hackd](https://hackd.net/posts/macos-reflective-code-loading-analysis/).

This technique can be utilized to execute a payload from an in-memory buffer. Fileless execution such as this [has been observed previously](https://objective-see.org/blog/blog_0x51.html) in attacks conducted by the Lazarus Group.

SUGARLOADER reflectively loads a binary (KANDYKORN) and then creates a new file initially named `appname` which we refer to as `HLOADER` which we took directly from the process code signature’s signing identifier.

![_SUGARLOADER reflective binary load alert_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image12.png)


![_SUGARLOADER creates HLOADER_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image36.png)


![_HLOADER code signature identifier_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image10.png)


![_Pseudocode for SUGARLOADER (stage2)_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image34.png)


## Stage 3 loader Discord: HLOADER

HLOADER (`2360a69e5fd7217e977123c81d3dbb60bf4763a9dae6949bc1900234f7762df1`) is a payload that attempts to masquerade as the legitimate Discord application. As of this writing, [it has 0 detections on VirusTotal](https://www.virustotal.com/gui/file/2360a69e5fd7217e977123c81d3dbb60bf4763a9dae6949bc1900234f7762df1).

![_HLOADER VirusTotal Detections_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image15.png)


HLOADER was identified through the use of a macOS binary code-signing technique that has been [previously linked](https://objective-see.org/blog/blog_0x73.html) to the [DPRK’s Lazarus Group 3CX intrusion](https://www.eset.com/int/about/newsroom/press-releases/research/eset-research-discovers-new-lazarus-dreamjob-campaign-and-links-it-to-phone-provider-3cx-supply-chai/). In addition to other published research, Elastic Security Labs has also used the presence of this technique as an indicator of DPRK campaigns, as seen in our June 2023 research publication on [JOKERSPY](https://www.elastic.co/security-labs/inital-research-of-jokerspy#the-xcc-binary).

### Persistence

We observed the threat actor adopting a technique we have not previously seen them use to achieve persistence on macOS, known as [execution flow hijacking](https://attack.mitre.org/techniques/T1574/). The target of this attack was the widely used application Discord. The Discord application is often configured by users as a login item and launched when the system boots, making it an attractive target for takeover. HLOADER is a self-signed binary written in Swift. The purpose of this loader is to execute both the legitimate Discord bundle and `.log` payload, the latter of which is used to execute Mach-O binary files from memory without writing them to disk.

The legitimate binary `/Applications/Discord.app/Contents/MacOS/Discord` was renamed to `.lock`, and replaced by `HLOADER`. 

![_Discord replaced by HLOADER_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image18.png)


Below is the code signature information for `HLOADER`, which has a self-signed identifier structure consistent with other Lazarus Group samples.
```
Executable=Applications/Discord.app/Contents/MacOS/Discord
Identifier=HLOADER-5555494485b460f1e2343dffaef9b94d01136320
Format=bundle with Mach-O universal (x86_64 arm64)
CodeDirectory flags=0x2(adhoc) hashes=12+7 location=embedded
```

When executed, `HLOADER` performs the following operations:
* Renames itself from `Discord` to `MacOS.tmp`
* Renames the legitimate Discord binary from `.lock` to `Discord`
* Executes both Discord and `.log` using `NSTask.launchAndReturnError`
* Renames both files back to their initial names

![_HLOADER execution event chain_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image37.png)


![_HLOADER Discord Application Hijack_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image33.png)


The following process tree also visually depicts how persistence is obtained. The root node `Discord` is actually HLOADER disguised as the legitimate app. As presented above, it first runs .lock, which is in fact Discord, and, alongside, spawns SUGARLOADER as a process named .log.

![_Process Tree Analyzer_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image23.png)


As seen in stage 2, SUGARLOADER reads the configuration file, connects to the C2 server, and waits for a payload to be received. Another alert is generated when the new payload (KANDYKORN) is loaded into memory. 

![_Reflective Dylib Load Alert for KANDYKORN_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image27.png)


## Stage 4 Payload: KANDYKORN

KANDYKORN is the final stage of this execution chain and possesses a full-featured set of capabilities to access and exfiltrate data from the victim’s computer. Elastic Security Labs was able to retrieve this payload from one C2 server which hadn’t been deactivated yet.

### Execution

KANDYCORN processes are forked and run in the background as daemons before loading their configuration file from `/Library/Caches/com.apple.safari.ck`. The configuration file is read into memory then decrypted using the same RC4 key, and parsed for C2 settings. The communication protocol is similar to prior stages using the victim ID value for authentication.

### Command and control

Once communication is established, KANDYKORN awaits commands from the server. This is an interesting characteristic in that the malware waits for commands instead of polling for commands. This would reduce the number of endpoint and network artifacts generated and provide a way to limit potential discovery.

Each command is represented by an integer being transmitted, followed by the data that is specific to each action. Below is a list of the available commands KANDYKORN provides.

#### Command 0xD1

Action: Exit command where the program gracefully exists.

#### Command 0xD2

Name: `resp_basicinfo`
Action: Gathers information about the system such as hostname, uid, osinfo, and image path of the current process, and reports back to the server.

![_resp_basicinfo routine_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image16.png)


#### Command 0xD3

Name: `resp_file_dir`
Action: Lists content of a directory and format the output similar to `ls -al`, including type, name, permissions, size, acl, path, and access time.

![_resp_file_dir routine_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image20.png)


#### Command 0xD4

Name: `resp_file_prop`

Action: Recursively read a directory and count the number of files, number of subdirectories, and total size.

![_resp_file_prop routine_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image26.png)


#### Command 0xD5

Name: `resp_file_upload`

Action: Used by the adversary to upload a file from their C2 server to the victim’s computer. This command specifies a path, creates it, and then proceeds to download the file content and write it to the victim’s computer.

#### Command 0xD6

Name: `resp_file_down`

Action: Used by the adversary to transfer a file from the victim’s computer to their infrastructure.

#### Command 0xD7

Name: `resp_file_zipdown`

Action: Archive a directory and exfiltrate it to the C2 server. The newly created archive’s name has the following pattern`/tmp/tempXXXXXXX`.

![_resp_file_zipdown routine _](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image29.png)


#### Command 0xD8

Name: `resp_file_wipe`
Action: Overwrites file content to zero and deletes the file. This is a common technique used to impede recovering the file through digital forensics on the filesystem.

![_resp_file_wipe routine_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image28.png)


#### Command 0xD9

Name: `resp_proc_list`

Action: Lists all running processes on the system along with their PID, UID and other information.

#### Command 0xDA

Name: `resp_proc_kill`

Action: Kills a process by specified PID.

![_resp_proc_kill routine_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image19.png)


#### Command 0xDB

Name: `resp_cmd_send`

Action: Executes a command on the system by using a pseudoterminal.

#### Command 0xDC

Name: `resp_cmd_recv`

Action: Reads the command output from the previous command `resp_cmd_send`.

#### Command 0xDD

Name: `resp_cmd_create`

Action: Spawns a shell on the system and communicates with it via a pseudoterminal. Once the shell process is executed, commands are read and written through the `/dev/pts` device.

![_resp_cmd_create routine (interactive shell)_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image38.png)


#### Command 0xDE

Name: `resp_cfg_get`

Action: Sends the current configuration to the C2 from `/Library/Caches/com.apple.safari.ck`.

#### Command 0xDF

Name: `resp_cfg_set`

Action: Download a new configuration file to the victim’s machine. This is used by the adversary to update the C2 hostname that should be used to retrieve commands from.

#### Command 0xE0

Name: `resp_sleep`

Action: Sleeps for a number of seconds.

### Summary

KANDYKORN is an advanced implant with a variety of capabilities to monitor, interact with, and avoid detection. It utilizes reflective loading, a direct-memory form of execution that may bypass detections.

## Network protocol

All the executables that communicate with the C2 (both stage 3 and stage 4) are using the same protocol. All the data is encrypted with RC4 and uses the same key previously referenced in the configuration file.

Both samples implement wrappers around the send-and-receive system calls. It can be observed in the following pseudocode that during the send routine, the buffer is first encrypted and then sent to the socket, whereas when data is received it is first decrypted and then processed.

![_send routine_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image22.png)


![_recv routine_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image32.png)


When the malware first connects to the C2 during the initialization phase, there is a handshake that needs to be validated in order to proceed. Should the handshake fail, the attack would stop and no other commands would be processed.

On the client side, a random number is generated and sent to the C2, which replies with a nonce variable. The client then computes a challenge with the random number and the received nonce and sends the result back to the server. If the challenge is successful and the server accepts the connection, it replies with a constant such as `0x41C3372` which appears in the analyzed sample.

![_Handshake routine_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image39.png)


Once the connection is established, the client sends its ID and awaits commands from the server. Any subsequent data sent or received from here is serialized following a common schema used to serialize binary objects. First, the length of the content is sent, then the payload, followed by a return code which indicates if any error occurred.

![_Overview of communication protocol_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image6.png)


## Network infrastructure

During REF7001, the adversary was observed communicating with network infrastructure to collect various payloads and loaders for different stages of the intrusion.

As detailed in the Stage 1 section above, the link to the initial malware archive, `Cross-Platform Bridges.zip`, was provided in a direct message on a popular blockchain Discord server. This archive was hosted on a Google Drive (`https://drive.google[.]com/file/d1KW5nQ8MZccug6Mp4QtKyWLT3HIZzHNIL2`), but this was removed shortly after the archive was downloaded.

Throughout the analysis of the REF7001 intrusion, there were two C2 servers observed.
* `tp-globa[.]xyz//OdhLca1mLUp/lZ5rZPxWsh/7yZKYQI43S/fP7savDX6c/bfC`
* `23.254.226[.]90`

### tp-globa[.]xyz

The C2 domain `tp-globa[.]xyz` is used by `FinderTools` to download SUGARLOADER and is likely an attempt at [typosquatting](https://en.wikipedia.org/wiki/Typosquatting) a legitimate foreign exchange market broker. We do not have any information to indicate that the legitimate company is involved in this intrusion. This typosquatted domain was likely chosen in an attempt to appear more legitimate to the victims of the intrusion.

`tp-globa[.]xyz`, as of this writing, resolves to an IP address (`192.119.64[.]43`) that has been observed distributing malware attributed to the DPRK’s Lazarus Group ([1](https://twitter.com/TLP_R3D/status/1677617586349981696), [2](https://twitter.com/_reboot_xxxx/status/1679054436289880065), [3](https://twitter.com/KSeznec/status/1678319191110082560)).

### 23.254.226[.]90

23.254.226[.]90 is the C2 IP used for the `.sld` file (SUGARLOADER malware). How this IP is used for C2 is highlighted in the stage 2 section above. 

On October 14, 2023, `23.254.226[.]90` was used to register the subdomain, `pesnam.publicvm[.]com`. While we did not observe this domain in our intrusion, it is [documented](https://www.virustotal.com/gui/domain/publicvm.com/detection) as hosting other malicious software.

## Campaign intersections

`tp-globa[.]xyz`, has a TLS certificate with a Subject CN of `bitscrunnch.linkpc[.]net`. The domain `bitscrunnch.linkpc[.]net` has been [attributed](https://twitter.com/tiresearch1/status/1708141542261809360?s=20) to other Lazarus Group intrusions.

As noted above, this is likely an attempt to typosquat a legitimate domain for a decentralized NFT data platform. We do not have any information to indicate that the legitimate company is involved in this intrusion.
```
…
Issuer: C = US, O = Let's Encrypt, CN = R3
Validity
Not Before: Sep 20 12:55:37 2023 GMT
Not After : Dec 19 12:55:36 2023 GMT
Subject: CN = bitscrunnch[.]linkpc[.]net
…
```

The `bitscrunnch.linkpc[.]net`’s TLS certificate is also used for [other additional domains](https://www.virustotal.com/gui/search/entity%253Adomain%2520ssl_subject%253Abitscrunnch.linkpc.net/domains), all of which are registered to the same IP address reported above in the `tp-globa[.]xyz` section above, `192.119.64[.]43`.
* `jobintro.linkpc[.]net`
* `jobdescription.linkpc[.]net`
* `docsenddata.linkpc[.]net`
* `docsendinfo.linkpc[.]net`
* `datasend.linkpc[.]net`
* `exodus.linkpc[.]net`
* `bitscrunnch.run[.]place`
* `coupang-networks[.]pics`

While LinkPC is a legitimate second-level domain and dynamic DNS service provider, it is [well-documented](https://www.virustotal.com/gui/domain/linkpc.net/community) that this specific service is used by threat actors for C2. In our [published research into RUSTBUCKET](https://www.elastic.co/security-labs/DPRK-strikes-using-a-new-variant-of-rustbucket), which is also attributed to the DPRK, we observed LinkPC being used for C2.

All registered domains, 48 as of this writing, for `192.119.64[.]43` are included in the observables bundle.

Finally, in late July 2023, there were reports on the Subreddits [r/hacking](https://www.reddit.com/r/hacking/comments/15b4uti/comment/jtprebt/), [r/Malware](https://www.reddit.com/r/Malware/comments/15b595e/looks_like_a_try_to_steel_some_data/), and [r/pihole](https://www.reddit.com/r/pihole/comments/15d11do/malware_project_mimics_pihole/jtzmpqh/) with URLs that matched the structure of `tp-globa[.]xyz//OdhLca1mLUp/lZ5rZPxWsh/7yZKYQI43S/fP7savDX6c/bfC`. The user on Reddit reported that a recruiter contacted them to solve a Python coding challenge as part of a job offer. The code challenge was to analyze Python code purported to be for an internet speed test. This aligns with the REF7001 victim’s reporting on being offered a Python coding challenge and the script name `testSpeed.py` detailed earlier in this research.

The domain reported on Reddit was `group.pro-tokyo[.]top//OcRLY4xsFlN/vMZrXIWONw/6OyCZl89HS/fP7savDX6c/bfC` which follows the same structure as the REF7001 URL (`tp-globa[.]xyz//OdhLca1mLUp/lZ5rZPxWsh/7yZKYQI43S/fP7savDX6c/bfC`):

* Two `//`’s after the TLD
* 5 subdirectories using an `//11-characters/10-characters/10-characters/` structure
* The last 2 subdirectories were `/fP7savDX6c/bfC`

While we did not observe GitHub in our intrusion, the Redditors who reported this did observe GitHub profiles being used. They have all been deactivated.

Those accounts were:
* `https://github[.]com/Prtof`
* `https://github[.]com/wokurks`

## Summary

The DPRK, via units like the LAZARUS GROUP, continues to target crypto-industry businesses with the goal of stealing cryptocurrency in order to circumvent international sanctions that hinder the growth of their economy and ambitions. In this intrusion, they targeted blockchain engineers active on a public chat server with a lure designed to speak to their skills and interests, with the underlying promise of financial gain.

The infection required interactivity from the victim that would still be expected had the lure been legitimate. Once executed, via a Python interpreter, the REF7001 execution flow went through 5 stages:
* Stage 0 (staging) - `Main.py` executes `Watcher.py` as an imported module. This script checks the Python version, prepares the local system directories, then downloads, executes, and cleans up the next stage.
* Stage 1 (generic droppers) - `testSpeed.py` and `FinderTools` are intermediate dropper Python scripts that download and execute SUGARLOADER.
* Stage 2 (SUGARLOADER) - `.sld` and `.log` are Mach-O executable payloads that establish C2, write the configuration file and reflectively load KANDYKORN.
* Stage 3 (HLOADER) - `HLOADER`/`Discord`(fake) is a simple loader used as a persistence mechanism masquerading as the legitimate Discord app for the loading of SUGARLOADER.
* Stage 4 (KANDYKORN) - The final reflectively loaded payload. KANDYKORN is a full-featured memory resident RAT with built-in capabilities to:
    * Conduct encrypted command and control
    * Conduct system enumeration
    * Upload and execute additional payloads
    * Compress and exfil data
    * Kill processes
    * Run arbitrary system commands through an interactive pseudoterminal

Elastic traced this campaign to April 2023 through the RC4 key used to encrypt the SUGARLOADER and KANDYKORN C2. This threat is still active and the tools and techniques are being continuously developed.

## The Diamond Model

Elastic Security utilizes the Diamond Model to describe high-level relationships between adversaries, capabilities, infrastructure, and victims of intrusions. While the Diamond Model is most commonly used with single intrusions, and leveraging Activity Threading (section 8) as a way to create relationships between incidents, an adversary-centered (section 7.1.4) approach allows for an, although cluttered, single diamond.

![_REF7001 Diamond Model_](/assets/images/elastic-catches-dprk-passing-out-kandykorn/image30.jpg)


## [Malware] and MITRE ATT&CK

Elastic uses the [MITRE ATT&CK](https://attack.mitre.org/) framework to document common tactics, techniques, and procedures that advanced persistent threats used against enterprise networks.

#### Tactics

Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.
* [Execution](https://attack.mitre.org/tactics/TA0002)
* [Persistence](https://attack.mitre.org/tactics/TA0003)
* [Defense Evasion](https://attack.mitre.org/tactics/TA0005)
* [Discovery](https://attack.mitre.org/tactics/TA0007)
* [Collection](https://attack.mitre.org/tactics/TA0009)
* [Command and Control](https://attack.mitre.org/tactics/TA0011)
* [Exfiltration](https://attack.mitre.org/tactics/TA0010)

#### Techniques

Techniques represent how an adversary achieves a tactical goal by performing an action.
* [User Execution: Malicious File](https://attack.mitre.org/techniques/T1204/002/)
* [Command and Scripting Interpreter: Python](https://attack.mitre.org/techniques/T1059/006/)
* [Command and Scripting Interpreter: Unix Shell](https://attack.mitre.org/techniques/T1059/004/)
* [Hijack Execution Flow](https://attack.mitre.org/techniques/T1574/)
* [Deobfuscate/Decode Files or Information](https://attack.mitre.org/techniques/T1140/)
* [Hide Artifacts: Hidden Files and Directories](https://attack.mitre.org/techniques/T1564/001/)
* [Indicator Removal: File Deletion](https://attack.mitre.org/techniques/T1070/004/)
* [Masquerading: Match Legitimate Name or Location](https://attack.mitre.org/techniques/T1036/005/)
* [Obfuscated Files or Information: Software Packing](https://attack.mitre.org/techniques/T1027/002/)
* [Reflective Code Loading](https://attack.mitre.org/techniques/T1620/)
* [File and Directory Discovery](https://attack.mitre.org/techniques/T1083/)
* [Process Discovery](https://attack.mitre.org/techniques/T1057/)
* [System Information Discovery](https://attack.mitre.org/techniques/T1082/)
* [Archive Collected Data: Archive via Custom Method](https://attack.mitre.org/techniques/T1560/003/)
* [Local Data Staging](https://attack.mitre.org/techniques/T1074/001/)
* [Application Layer Protocol: Web Protocols](https://attack.mitre.org/techniques/T1071/001/)
* [Fallback Channels](https://attack.mitre.org/techniques/T1008/)
* [Ingress Tool Transfer](https://attack.mitre.org/techniques/T1105/)
* [Exfiltration Over C2 Channel](https://attack.mitre.org/techniques/T1041/)

## Malware prevention capabilities
* [MacOS.Trojan.SUGARLOADER](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/MacOS_Trojan_SugarLoader.yar)
* [MacOS.Trojan.HLOADER](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/MacOS_Trojan_HLoader.yar)
* [MacOS.Trojan.KANDYKORN](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/MacOS_Trojan_KandyKorn.yar)

## Malware detection capabilities

### Hunting queries

The events for EQL are provided with the Elastic Agent using the Elastic Defend integration. Hunting queries could return high signals or false positives. These queries are used to identify potentially suspicious behavior, but an investigation is required to validate the findings.

#### EQL queries

Using the Timeline section of the Security Solution in Kibana under the “Correlation” tab, you can use the below EQL queries to hunt for similar behaviors.

The following EQL query can be used to identify when a hidden executable creates and then immediately deletes a file within a temporary directory:

```
sequence by process.entity_id, file.path with maxspan=30s
  [file where event.action == "modification" and process.name : ".*" and 
   file.path : ("/private/tmp/*", "/tmp/*", "/var/tmp/*")]
  [file where event.action == "deletion" and process.name : ".*" and 
   file.path : ("/private/tmp/*", "/tmp/*", "/var/tmp/*")]
```

The following EQL query can be used to identify when a hidden file makes an outbound network connection followed by the immediate download of an executable file:

```
sequence by process.entity_id with maxspan=30s
[network where event.type == "start" and process.name : ".*"]
[file where event.action != "deletion" and file.Ext.header_bytes : ("cffaedfe*", "cafebabe*")]
```

The following EQL query can be used to identify when a macOS application binary gets renamed to a hidden file name within the same directory:

```
file where event.action == "rename" and file.name : ".*" and 
 file.path : "/Applications/*/Contents/MacOS/*" and 
 file.Ext.original.path : "/Applications/*/Contents/MacOS/*" and 
 not startswith~(file.Ext.original.path,Effective_process.executable)
 ```

The following EQL query can be used to identify when an IP address is supplied as an argument to a hidden executable:

```
sequence by process.entity_id with maxspan=30s
[process where event.type == "start" and event.action == "exec" and process.name : ".*" and process.args regex~ "[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}"]
[network where event.type == "start"]
```

The following EQL query can be used to identify the rename or modification of a hidden executable file within the /Users/Shared directory or the execution of a hidden unsigned or untrusted process in the /Users/Shared directory:

```
any where 
 (
  (event.category : "file" and event.action != "deletion" and file.Ext.header_bytes : ("cffaedfe*", "cafebabe*") and 
   file.path : "/Users/Shared/*" and file.name : ".*" ) or 
  (event.category : "process" and event.action == "exec" and process.executable : "/Users/Shared/*" and 
   (process.code_signature.trusted == false or process.code_signature.exists == false) and process.name : ".*")
 )
```

The following EQL query can be used to identify when a URL is supplied as an argument to a python script via the command line:

```
sequence by process.entity_id with maxspan=30s
[process where event.type == "start" and event.action == "exec" and 
 process.args : "python*" and process.args : ("/Users/*", "/tmp/*", "/var/tmp/*", "/private/tmp/*") and process.args : "http*" and 
 process.args_count &lt;= 3 and 
 not process.name : ("curl", "wget")]
[network where event.type == "start"]
```

The following EQL query can be used to identify the attempt of in memory Mach-O loading specifically by looking for the predictable temporary file creation of "NSCreateObjectFileImageFromMemory-*":

```
file where event.type != "deletion" and 
file.name : "NSCreateObjectFileImageFromMemory-*"
```

The following EQL query can be used to identify the attempt of in memory Mach-O loading by looking for the load of the "NSCreateObjectFileImageFromMemory-*" file or a load with no dylib name provided:

```
any where ((event.action == "load" and not dll.path : "?*") or 
  (event.action == "load" and dll.name : "NSCreateObjectFileImageFromMemory*"))
```

### YARA

Elastic Security has created YARA rules to identify this activity. Below are YARA rules to identify the payloads:
* [MacOS.Trojan.SUGARLOADER](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/MacOS_Trojan_SugarLoader.yar)
* [MacOS.Trojan.HLOADER](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/MacOS_Trojan_HLoader.yar)
* [MacOS.Trojan.KANDYKORN](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/MacOS_Trojan_KandyKorn.yar)

## Observations

All observables are also available for [download](https://github.com/elastic/labs-releases/tree/main/indicators/ref7001) in both ECS and STIX format. 

The following observables were discussed in this research.

| Observable                                                                                                                       | Type         | Name                | Reference               |
|----------------------------------------------------------------------------------------------------------------------------------|--------------|---------------------|-------------------------|
| `3ea2ead8f3cec030906dcbffe3efd5c5d77d5d375d4a54cca03bfe8a6cb59940`                                                                 | SHA-256      | .log, .sld          | SUGARLOADER             |
| `2360a69e5fd7217e977123c81d3dbb60bf4763a9dae6949bc1900234f7762df1`                                                                | SHA-256      | Discord (fake)      | HLOADER                 |
| `927b3564c1cf884d2a05e1d7bd24362ce8563a1e9b85be776190ab7f8af192f6`                                                                 | SHA-256      |                     | KANDYKORN               |
| `http://tp-globa[.]xyz//OdhLca1mLUp/lZ5rZPxWsh/7yZKYQI43S/fP7savDX6c/bfC`                                                          | url          |                     | FinderTools C2 URL      |
| `tp-globa[.]xyz`                                                                                                                   | domain-name  |                     | FinderTools C2 domain   |
| `192.119.64[.]43`                                                                                                                  | ipv4-addr    | tp-globa IP address | FinderTools C2 IP       |
| `23.254.226[.]90`                                                                                                                  | ipv4-addr    |                     | SUGARLOADER C2 IP       |
| `D9F936CE628C3E5D9B3695694D1CDE79E470E938064D98FBF4EF980A5558D1C90C7E650C2362A21B914ABD173ABA5C0E5837C47B89F74C5B23A7294CC1CFD11B` | 64 byte key  | RC4 key             | SUGARLOADER, KANDYKORN  |

## References

The following were referenced throughout the above research:
* [The DPRK strikes using a new variant of RUSTBUCKET — Elastic Security Labs](https://www.elastic.co/security-labs/DPRK-strikes-using-a-new-variant-of-rustbucket) 
* [https://x.com/tiresearch1/status/1708141542261809360](https://x.com/tiresearch1/status/1708141542261809360) 
* [https://www.reddit.com/r/hacking/comments/15b4uti/comment/jtprebt/](https://www.reddit.com/r/hacking/comments/15b4uti/comment/jtprebt/) 
* [Looks like a try to steel some data : r/Malware](https://www.reddit.com/r/Malware/comments/15b595e/looks_like_a_try_to_steel_some_data/) 
* [https://www.reddit.com/r/pihole/comments/15d11do/malware_project_mimics_pihole/jtzmpqh/](https://www.reddit.com/r/pihole/comments/15d11do/malware_project_mimics_pihole/jtzmpqh/) 
* [Lazarus Group Goes 'Fileless'](https://objective-see.org/blog/blog_0x51.html)
* [Understanding and Defending Against Reflective Code Loading on macOS | by Justin Bui](https://slyd0g.medium.com/understanding-and-defending-against-reflective-code-loading-on-macos-e2e83211e48f)
* [macOS reflective code loading analysis · hackd](https://hackd.net/posts/macos-reflective-code-loading-analysis/)
