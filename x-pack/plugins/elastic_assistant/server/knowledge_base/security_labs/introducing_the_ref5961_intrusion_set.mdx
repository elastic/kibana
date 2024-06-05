---
title: "Introducing the REF5961 intrusion set"
slug: "introducing-the-ref5961-intrusion-set"
date: "2023-10-04"
description: "The REF5961 intrusion set discloses three new malware families targeting ASEAN members. The threat actor leveraging this intrusion set continues to develop and mature their capabilities."
author:
  - slug: daniel-stepanic
  - slug: salim-bitam
  - slug: cyril-francois
  - slug: seth-goodwin
  - slug: andrew-pease
image: "photo-edited-08@2x.jpg"
category:
  - slug: security-research
  - slug: malware-analysis
tags:
  - security-research
  - malware-analysis
  - ref5961
  - ref2924
  - eagerbee
  - downtown
  - rudebird
---

## Preamble

**Updated October 11, 2023 to include links to the BLOODALCHEMY backdoor.**

Elastic Security Labs continues to monitor state-aligned activity, targeting governments and multinational government organizations in Southern and Southeastern Asia. We’ve observed a batch of new and unique capabilities within a complex government environment. This intrusion set is named REF5961.

In this publication, we will highlight distinctions between malware families, demonstrate relationships to known threats, describe their features, and share resources to identify or mitigate elements of an intrusion. Our intent is to help expose this ongoing activity so the community can better understand these types of threats.

The samples in this research were discovered to be co-residents with a previously reported intrusion set, REF2924 (original reporting [here](https://www.elastic.co/security-labs/siestagraph-new-implant-uncovered-in-asean-member-foreign-ministry) and updated [here](https://www.elastic.co/security-labs/update-to-the-REF2924-intrusion-set-and-related-campaigns)). The victim is the Foreign Affairs Ministry of a member of the Association of Southeast Asian Nations (ASEAN).  

Elastic Security Labs describes the operators of the REF2924 and REF5961 intrusion sets as state-sponsored and espionage-motivated due to observed targeting and post-exploitation collection activity. Further, the correlation of execution flows, tooling, infrastructure, and victimology of multiple campaigns we’re tracking along with numerous third-party reports makes us confident this is a China-nexus actor.

![REF5961 intrusion execution flow](/assets/images/introducing-the-ref5961-intrusion-set/image27.jpg)


Part of this intrusion set includes a new x86-based backdoor called BLOODALCHEMY, and it is covered in depth [here](https://www.elastic.co/security-labs/disclosing-the-bloodalchemy-backdoor).

## Key takeaways

* Elastic Security Labs is disclosing three new malware families:
  * EAGERBEE
  * RUDEBIRD
  * DOWNTOWN
* Code sharing and network infrastructure have connected malware in this intrusion set to other campaigns
* The threat actors targeting ASEAN governments and organizations continue to develop and deploy additional capabilities

## EAGERBEE

EAGERBEE is a newly identified backdoor discovered by Elastic Security Labs that loads additional capabilities using remotely-downloaded PE files, hosted in C2. However, its implementation and coding practices reveal a lack of advanced skills from the author, relying on basic techniques.

During our research outlined below, we identified string formatting and underlying behavior that aligns with previous research attributed to a Chinese-speaking threat actor referred to as [LuckyMouse](https://malpedia.caad.fkie.fraunhofer.de/actor/apt27) (APT27, EmissaryPanda).

### Code analysis

EAGERBEE dynamically constructs its Import Address Table (IAT) during runtime, populating a designated data structure with the memory addresses of essential Windows APIs that the malware needs.

![EAGERBEE dynamically constructs its Import Address Table](/assets/images/introducing-the-ref5961-intrusion-set/image25.png)


**_Note: Dynamic import tables are used as an anti-analysis technique by malware authors to impair static analysis of their binaries. These techniques prevent most static analysis software from determining the imports and thus force analysts through laborious manual methods to determine what the malware is doing._**

After resolving all the required Windows APIs, the malware creates a mutex with the string `mstoolFtip32W` to prevent multiple instances of the malware from running on the same machine.

![Mutex setup](/assets/images/introducing-the-ref5961-intrusion-set/image1.png)


The malware gathers key information about the compromised system:
* The computer's name is obtained using the `GetComputerNameW` function
* The malware retrieves the Windows version by utilizing the `GetVersionExW` function
* A globally unique identifier (GUID) is generated through the `CoCreateGuid` function
* The processor architecture information is acquired using the `GetNativeSystemInfo` function
* The ProductName, EditionID, and CurrentBuildNumber are extracted from the designated registry key `SOFTWARE\Microsoft\Windows NT\CurrentVersion`

![Information collection](/assets/images/introducing-the-ref5961-intrusion-set/image19.png)


The sample’s operational schedule is controlled by the string `0-5:00:23;6:00:23;`. In our sample the malware conforms to the outlined schedule using the ISO 8601 24-hour timekeeping system: 
* active from Sunday(0) to Friday(5)
* all hours between 00 and 23
* Saturday(6) all hours between 00 and 23

This functionality allows the malware to impose self-restrictions during specific timeframes, showcasing both its adaptability and control.

![Configuration scheduling](/assets/images/introducing-the-ref5961-intrusion-set/image3.png)


The malware's C2 addresses are either hardcoded values or stored in an XOR-encrypted file named `c:\users\public\iconcache.mui`. This file is decrypted using the first character as the decryption key.

This configuration file contains a list of semicolon-delimited IP addresses. The format adheres to the structure `IP:PORT`, where the character `s` is optional and instructs the malware to open a Secure Socket Layer (SSL) for encrypted communication between C2 and the malware.
![Malware’s hardcoded configuration of C2 IPs](/assets/images/introducing-the-ref5961-intrusion-set/image18.png)


The configuration optionally accepts a list of port numbers on which the malware will listen. The specific configuration mode, whether it's for reverse or forward connections, determines this behavior.

A configuration flag is embedded directly into the code in both operating modes. This flag empowers the malware to select between utilizing SSL encryption during its interactions with the C2 server or plain text communication.

In passive listening mode, the malware opens a listening socket on the port indicated in its configuration.

When operating in active connection mode, the malware attempts to load its configuration from the file `c:\users\public\iconcache.mui`. In the event that this file is not found, the malware falls back to its hardcoded configuration to acquire the necessary IPs

The author employs a global variable embedded in the source code to select between modes. Importantly, both are included in the binary, with only one being executed based on the selection. Leaving this dormant capability in the binary may have been a mistake, but one that helps researchers understand the technical maturity of this group. Generally speaking, malware authors benefit from removing unused code that may be used against them.

![Both forward and reverse connection functionalities are present in the binary](/assets/images/introducing-the-ref5961-intrusion-set/image16.png)


**_Note: In C programming, modularity is achieved through the use of #define directives to selectively include or exclude code parts in the compiled binary. However, the malware developer employed a less advisable approach in this case. They utilized static global variables whose values are set during compilation. Consequently, the resulting binary contains both utilized and unused functions. During runtime, the binary assesses the value of these static global variables to determine its behavior. Though functional, this is neither the best programming nor tradecraft practice as it permits analysis and detection engineering of code used outside the identified intrusion._**

The malware has the capability to detect the presence of an HTTP proxy configuration on the host machine by inspecting the `ProxyEnable` registry key within `Software\Microsoft\windows\CurrentVersion\Internet Settings`. If this key value is set to `1`, the malware extracts the information in the `ProxyServer` key. 

If no proxy server is set, the malware connects directly to C2. 

However, if the proxy settings are defined, the malware also initializes the proxy by sending a `CONNECT` request, and its data to the configured destination. The malware author made a typo in the HTTP request code; they mistakenly wrote `DONNECT` instead of `CONNECT` in the HTTP request string in the binary. This is a reliably unique indicator for those analyzing network captures.
	
![HTTP request string to connect to the setup proxy](/assets/images/introducing-the-ref5961-intrusion-set/image12.png)


Upon establishing a connection to C2, The malware downloads executable files from C2, likely pushed automatically. It validates that each executable is 64bit, then extracts the entry point and modifies memory protections to allow execution using the VirtualProtect API.

![Payload execution in the same process](/assets/images/introducing-the-ref5961-intrusion-set/image7.png)


### EAGERBEE connection to a Mongolian campaign

During our EAGERBEE analysis, we also saw an additional two (previously unnamed) EAGERBEE [samples](https://www.virustotal.com/gui/search/09005775FC587AC7BF150C05352E59DC01008B7BF8C1D870D1CEA87561AA0B06%250AA191D8059E93C0AB479DE45CDD91C41B985F9BCCD7B2CAD9F171FEA1C5F19E2E/files) involved in a targeted campaign focused on Mongolia. These two EAGERBEE samples were both respectively bundled with other files and used a similar naming convention (`iconcache.mui` for EAGERBEE and `iconcaches.mui` in the Mongolian campaign). The samples consisted of multiple files and a lure document.

![Decompressed files inside Mongolian campaign sample](/assets/images/introducing-the-ref5961-intrusion-set/image15.png)


While analyzing the Mongolian campaign samples, we found a previous [webpage](https://www.virustotal.com/gui/url/7e0d899d54c6a0f43fbac0e633d821eefa9057e29df8c4956321fe947daaaa54) (`http://president[.]mn/en/ebooksheets.php`) hosted under Mongolian infrastructure serving a [RAR file](https://www.virustotal.com/gui/file/af8cb76d9d955d654ec89b85d1ab35e1886ec2ba1a8c600a451d1bd383fb4e66/detection) named `20220921_2.rar`. Given the VirusTotal scan date of the file and the filename, it is likely to have been created in September 2022.

The lure text is centered around the regulations for the “Billion Trees National Movement Fund” and has been an important [topic](https://thediplomat.com/2022/06/mongolias-1-billion-tree-movement/) in recent years related to an initiative taken on by Mongolia. To address food security, climate impacts, and naturally occurring but accelerating desertification, Mongolia’s government has undertaken an ambitious goal of planting one billion trees throughout the country.

![Lure document](/assets/images/introducing-the-ref5961-intrusion-set/image5.png)


For this infection chain, they leveraged a signed Kaspersky application in order to sideload a [malicious DLL](https://www.virustotal.com/gui/file/4b3dc8609cba089e666b2086264e6f71dada57fdb3f160d2f5e546881a278766/relations). Upon execution, sensitive data and files were collected from the machine and uploaded to a hard-coded Mongolian government URL (`www.president[.]mn/upload.php`) via cURL. Persistence is configured using a Registry Run Key.

![Hard-coded domain in first sample](/assets/images/introducing-the-ref5961-intrusion-set/image14.png)


**_Note: Though it does not contain the .gov second-level domain, www.president[.]mn does appear to be the official domain of the President of Mongolia, and is hosted within government infrastructure. Abuse email is directed to oyunbold@datacenter.gov[.]mn which appears to be legitimate._** Based on string formatting and underlying behavior, this sample aligns with public [reporting](https://decoded.avast.io/luigicamastra/apt-group-targeting-governmental-agencies-in-east-asia/) from AVAST related to a utility they call DataExtractor1.

![Sensitive file collection on different drives](/assets/images/introducing-the-ref5961-intrusion-set/image9.png)


While we didn’t find a WinRAR archive for the other linked sample, we found this related [executable](https://www.virustotal.com/gui/file/a191d8059e93c0ab479de45cdd91c41b985f9bccd7b2cad9f171fea1c5f19e2e). It functions similarly, using a different callback domain hosted on Mongolian infrastructure (`https://intranet.gov[.]mn/upload.php`).

![Hard-coded domain in the second sample](/assets/images/introducing-the-ref5961-intrusion-set/image13.png)


While it is not clear how this infrastructure was compromised or the extent to which it has been used, impersonating trusted systems may have enabled the threat to compromise other victims and collect intelligence.

### EAGERBEE Summary

EAGERBEE is a technically straightforward backdoor with forward and reverse C2 and SSL encryption capabilities, used to conduct basic system enumeration and deliver subsequent executables for post-exploitation. The C2 mode is defined at compile time, and configurable with an associated config file with hardcoded fallback.

Using code overlap analysis, and the fact that EAGERBEE was bundled with other samples from VirusTotal, we identified a C2 server hosted on Mongolian government infrastructure. The associated lure documents also reference Mongolian government policy initiatives. This leads us to believe that the Mongolian government or non-governmental organizations (NGOs) may have been targeted by the REF2924 threat actor.

## RUDEBIRD

Within the contested REF2924 environment, Elastic Security Labs identified a lightweight Windows backdoor that communicates over HTTPS and contains capabilities to perform reconnaissance and execute code. We refer to this malware family as RUDEBIRD.

### Initial execution

The backdoor was executed by a file with an invalid signature, `C:\Windows\help\RVTDM.exe`, which resembles the Sysinternals screen magnifier utility ZoomIt. Shortly after being executed, Elastic Defend registered a process injection alert. 

![PE signature and original filename details of RVTDM.exe](/assets/images/introducing-the-ref5961-intrusion-set/image28.png)


The process was executed with the parent process (`w3wp.exe`) coming from a Microsoft Exchange application pool. This is consistent with the exploitation of an unpatched Exchange vulnerability, and prior research supports that hypothesis.

### Lateral movement

RUDEBIRD used PsExec (`exec.exe`) to execute itself from the SYSTEM account and then move laterally from victim 0 to another targeted host. It is unclear if PsExec was brought to the environment by the threat actor or if it was already present in the environment. 

`"C:\windows\help\exec.exe" /accepteula \\{victim-1} -d -s C:\windows\debug\RVTDM.EXE`

### Code analysis

RUDEIBIRD is composed of shellcode that resolves imports dynamically by accessing the Thread Environment Block (TEB) / Process Environment Block (PEB) and walking the loaded modules to find base addresses for the `kernel32.dll` and `ntdll.dll` modules. These system DLLs contain crucial functions that will be located by the malware in order to interact with the Windows operating system.

![Resolving imports using TEB/PEB](/assets/images/introducing-the-ref5961-intrusion-set/image22.png)


RUDEBIRD uses a straightforward API hashing algorithm with multiplication (`0x21`) and addition that is [publicly available](https://github.com/OALabs/hashdb/blob/main/algorithms/mult21_add.py) from OALabs. This provides defense against static-analysis tools that analysts may use to inspect the import table and discern what capabilities a binary has.

![RUDEBIRD API Hashing algorithm](/assets/images/introducing-the-ref5961-intrusion-set/image11.png)


After resolving the libraries, there is an initial enumeration function that collects several pieces of information including:
* Hostname
* Computer name
* Username
* IP Address
* System architecture
* Privilege of the current user

For some functions that return larger amounts of data, the malware implements compression using `RtlCompressBuffer`. The malware communicates using HTTPS to IP addresses loaded in memory from its configuration. We observed two IP addresses in the configuration in our sample:

* `45.90.58[.]103`
* `185.195.237[.]123`

Strangely, there are several functions throughout the program that include calls to `OutputDebugStringA`. This function is typically used during the development phase and serves as a mechanism to send strings to a debugger while testing a program. Normally, these debug messages are expected to be removed after development is finished. For example, the result of the administrator check is printed if run inside a debugger.

![RUDEBIRD debug string](/assets/images/introducing-the-ref5961-intrusion-set/image21.png)


RUDEBIRD uses mutexes to maintain synchronization throughout its execution. On launch, the mutex is set to `VV.0`.

![RUDEBIRD mutex](/assets/images/introducing-the-ref5961-intrusion-set/image24.png)


After the initial enumeration stage, RUDEBIRD operates as a traditional backdoor with the following capabilities:
* Retrieve victim’s desktop directory path
* Retrieve disk volume information 
* Perform file/directory enumeration
* Perform file operations such as reading/writing file content
* Launch new processes
* File/folder operations such as creating new directories, move/copy/delete/rename files
* Beacon timeout option

## DOWNTOWN (SManager/PhantomNet)

In the REF2924 environment, we observed a modular implant we call DOWNTOWN. This sample shares a plugin architecture, and code similarities, and aligns with the victimology described in the publicly reported malware [SManager/PhantomNet](https://malpedia.caad.fkie.fraunhofer.de/details/win.smanager). While we have little visibility into the impacts of its overall use, we wanted to share any details that may help the community. 

SManager/PhantomNet has been attributed to [TA428](https://malpedia.caad.fkie.fraunhofer.de/actor/ta428) (Colourful Panda, BRONZE DUDLEY), a threat actor likely sponsored by the Chinese government. Because of the shared plugin architecture, code similarities, and victimology, we are attributing DOWNTOWN with a moderate degree of confidence to a nationally sponsored Chinese threat actor.

### Code analysis

For DOWNTOWN, we collected the plugin from a larger framework. This distinction is made based on unique and shared exports from previously published [research](https://www.welivesecurity.com/2020/12/17/operation-signsight-supply-chain-attack-southeast-asia/) by ESET. One of the exports contains the same misspelling previously identified in the ESET blog, `GetPluginInfomation` (note: `Infomation` is missing an `r`). The victimology of REF2924 is consistent with their reported victim vertical and region.

![DOWNTOWN exports](/assets/images/introducing-the-ref5961-intrusion-set/image8.png)


In our sample, the plugin is labeled as “ExplorerManager”. 

![GetPlugInfomation export](/assets/images/introducing-the-ref5961-intrusion-set/image26.png)


The majority of the code appears to be centered around middleware functionality (linked lists, memory management, and thread synchronization) used to task the malware. 

![Strings found inside DOWNTOWN sample](/assets/images/introducing-the-ref5961-intrusion-set/image4.png)


In a similar fashion to RUDEBIRD above, DOWNTOWN also included the debug functionality using  `OutputDebugStringA`. Again, debugging frameworks are usually removed once the software is moved from development to production status. This could indicate that this module is still in active development or a lack of operational scrutiny by the malware author(s).

![OutputDebugStringA usage](/assets/images/introducing-the-ref5961-intrusion-set/image2.png)


Some functionality observed in the sample included:
* File/folder enumeration
* Disk enumeration
* File operations (delete/execute/rename/copy)

Unfortunately, our team did not encounter any network/communication functionality or find any domain or IP addresses tied to this sample.  

### DOWNTOWN Summary

DOWNTOWN is part of a modular framework that shows probable ties to an established threat group. The observed plugin appears to provide middleware functionality to the main implant and contains several functions to perform enumeration.

## Network infrastructure intersection

When performing an analysis of the network infrastructure for EAGERBEE and RUDEBIRD, we identified similarities in the domain hosting provider, subdomain naming, registration dates, and service enablement between the two malware families’ C2 infrastructure. Additionally, we were able to use TLS leaf certificate fingerprints to establish another connection between EAGERBEE and the Mongolian campaign infrastructure.

### Shared network infrastructure

As identified in the malware analysis section for EAGERBEE, there were two IP addresses used for C2: `185.82.217[.]164` and `195.123.245[.]79`.

Of the two, `185.82.217[.]164` had an expired TLS certificate registered to it for `paper.hosted-by-bay[.]net`. The subdomain registration for `paper.hosted-by-bay[.]net` and the TLS certificate were registered on December 14, 2020.

![paper.hosted-by-bay[.]net TLS certificate](/assets/images/introducing-the-ref5961-intrusion-set/image17.jpg)


As identified in the malware analysis section for RUDEBIRD, there were two IP addresses used for C2: `45.90.58[.]103` and `185.195.237[.]123`.

`45.90.58[.]103` was used to register the subdomain `news.hosted-by-bay[.]net`, on December 13, 2020.

Both IP addresses (one from EAGERBEE and one from RUDEBIRD) were assigned to subdomains (`paper.hosted-by-bay[.]net` and `news.hosted-by-bay[.]net`) within one day at the domain `hosted-by-bay[.]net`.

**_Note: While `195.123.245[.]79` (EAGERBEE) and `185.195.237[.]123` (RUDEBIRD) are malicious, we were unable to identify anything atypical of normal C2 nodes. They used the same defense evasion technique (described below) used by `185.82.217[.]164` (EAGERBEE) and `45.90.58[.]103` (RUDEBIRD)._**

### Domain analysis

When performing an analysis of the `hosted-by-bay[.]net` domain, we see that it is registered to the IP address `45.133.194[.]106`. This IP address exposes two TCP ports, one is the expected TLS port of `443`, and the other is `62753`.

**_Note: Port `443` has a Let’s Encrypt TLS certificate for `paypal.goodspaypal[.]com`. This domain does not appear to be related to this research but should be categorized as malicious based on its registration to this IP._**

On port `62753`, there was a self-signed wildcard TLS leaf certificate with a fingerprint of `d218680140ad2c6e947bf16020c0d36d3216f6fc7370c366ebe841c02d889a59` (`*.REDACTED[.]mn`). This fingerprint is used for one host, `shop.REDACTED[.]mn`. The 10-year TLS certificate was registered on December 13, 2020.

```
Validity
Not Before: 2020-12-13 11:53:20
Not After: 2030-12-11 11:53:20
Subject: CN=shop.REDACTED[.]mn
```

`.mn` is the Internet ccTLD for Mongolia and REDACTED is a large bank in Mongolia. When researching the network infrastructure for REDACTED, we can see that they do currently own their DNS infrastructure.

It does not appear that `shop.REDACTED[.]mn` was ever registered. This self-signed TLS certificate was likely used to encrypt C2 traffic. While we cannot confirm that this certificate was used for EAGERBEE or RUDEBIRD, in the malware code analysis of both EAGERBEE and RUDEBIRD, we identified that TLS to an IP address is an available malware configuration option. We do believe that this domain is related to EAGERBEE and RUDEBIRD based on the registration dates, IP addresses, and subdomains of the `hosted-by-bay[.]net` domain.

As noted in the EAGERBEE malware analysis, we identified two other previously unnamed EAGERBEE samples used to target Mongolian victims and also leveraged Mongolian C2 infrastructure.

### Defense evasion

Finally, we see all of the C2 IP addresses add and remove services at similar dates and times. This is a tactic to hinder the analysis of the C2 infrastructure by limiting its availability. It should be noted that the history of the service enablement and disablement (provided by [Censys.io](https://search.censys.io/) databases) is meant to show possible coordination in C2 availability. The images below show the last service change windows, further historical data was not available.

`192.123.245[.]79` had TCP port `80` enabled on September 22, 2023 at 07:31 and then disabled on September 24, 2023 at 07:42.

![192.123.245[.]79 C2 service windows](/assets/images/introducing-the-ref5961-intrusion-set/image6.jpg)


`185.195.237[.]123` had TCP port `443` enabled on September 22, 2023 at 03:33 and then disabled on September 25, 2023 at 08:08.

![185.195.237[.]123 C2 service windows](/assets/images/introducing-the-ref5961-intrusion-set/image23.jpg)


`185.82.217[.]164` had TCP port `443` enabled on September 22, 2023 at 08:49 and then disabled on September 25, 2023 at 01:02.

![185.82.217[.]164 C2 service windows](/assets/images/introducing-the-ref5961-intrusion-set/image20.jpg)


`45.90.58[.]103` had TCP port `443` enabled on September 22, 2023 at 04:46 and then disabled on September 24, 2023 at 09:57.

![45.90.58[.]103 C2 service windows](/assets/images/introducing-the-ref5961-intrusion-set/image10.jpg)


### Network intersection summary

EAGERBEE and RUDEBIRD are two malware samples, co-resident on the same infected endpoint, in the same environment. This alone builds a strong association between the families. 

When adding the fact that both families use C2 endpoints that have been used to register subdomains on the same domain `hosted-by-bay[.]net`), and the service availability coordination, leads us to say with a high degree of confidence that the malware and campaign operators are from the same tasking authority, or organizational umbrella.

## Summary

EAGERBEE, RUDEBIRD, and DOWNTOWN backdoors all exhibit characteristics of incompleteness whether using “Test” in file/service names, ignoring compilation best practices, leaving orphaned code, or leaving a smattering of extraneous debug statements.

They all, however, deliver similar tactical capabilities in the context of this environment.
* Local enumeration
* Persistence
* Download/execute additional tooling
* C2 options

The variety of tooling performing the same or similar tasks with varying degrees and types of miscues causes us to speculate that this environment has attracted the interest of multiple players in the REF2924 threat actor’s organization. The victim's status as a government diplomatic agency would make it an ideal candidate as a stepping-off point to other targets within and outside the agency’s national borders. Additionally, it is easy to imagine that multiple entities within a national intelligence apparatus would have collection requirements that could be satisfied by this victim directly. 

This environment has already seen the emergence of the REF2924 intrusion set (SIESTAGRAPH, NAPLISTENER, SOMNIRECORD, and DOORME), as well as the deployment of SHADOWPAD and COBALTSTRIKE. The REF2924 and REF5961 threat actor(s) continue to deploy new malware into their government victim’s environment.

## REF5961 and MITRE ATT&CK

Elastic uses the [MITRE ATT&CK](https://attack.mitre.org/) framework to document common tactics, techniques, and procedures that advance persistent threats used against enterprise networks.

### Tactics

Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.
* EAGERBEE
  * [Defense Evasion](https://attack.mitre.org/tactics/TA0005/)
  * [Discovery](https://attack.mitre.org/tactics/TA0007/)
  * [Command and Control](https://attack.mitre.org/tactics/TA0011/)
  * [Execution](https://attack.mitre.org/tactics/TA0002/)
* RUDEBIRD
  * [Defense Evasion](https://attack.mitre.org/tactics/TA0005/)
  * [Collection](https://attack.mitre.org/tactics/TA0009/)
  * [Command and Control](https://attack.mitre.org/tactics/TA0011/)
  * [Discovery](https://attack.mitre.org/tactics/TA0007/)
  * [Lateral Movement](https://attack.mitre.org/tactics/TA0008/)
  * [Execution](https://attack.mitre.org/tactics/TA0002/)
* DOWNTOWN
  * [Discovery](https://attack.mitre.org/tactics/TA0007/)
  * [Collection](https://attack.mitre.org/tactics/TA0009/)

### Techniques

Techniques represent how an adversary achieves a tactical goal by performing an action.
* EAGERBEE
  * [Obfuscated Files or Information](https://attack.mitre.org/techniques/T1027/)
  * [System Information Discovery](https://attack.mitre.org/techniques/T1082/)
  * [Exfiltration Over C2 Channel](https://attack.mitre.org/techniques/T1041/)
  * [Proxy](https://attack.mitre.org/techniques/T1090/)
  * [Process Injection](https://attack.mitre.org/techniques/T1055/)
* RUDEBIRD
  * [File and Directory Discovery](https://attack.mitre.org/tactics/TA0007/#:~:text=T1083-,File%20and%20Directory%20Discovery,-Adversaries%20may%20enumerate)
  * [System Information Discovery](https://attack.mitre.org/techniques/T1082)
  * [Command and Scripting Interpreter](https://attack.mitre.org/techniques/T1059)
  * [Lateral Tool Transfer](https://attack.mitre.org/techniques/T1570/)
  * [Data from Local System](https://attack.mitre.org/techniques/T1005)
* DOWNTOWN
  * [File and Directory Discovery](https://attack.mitre.org/tactics/TA0007/#:~:text=T1083-,File%20and%20Directory%20Discovery,-Adversaries%20may%20enumerate)
  * [System Information Discovery](https://attack.mitre.org/techniques/T1082)

## Malware prevention capabilities
* [EAGERBEE](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_EagerBee.yar)
* [RUDEBIRD](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_RudeBird.yar)
* [DOWNTOWN](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_DownTown.yar)

## YARA

Elastic Security has created YARA rules to identify this activity. Below are YARA rules to identify the EAGERBEE, RUDEBIRD, and DOWNTOWN malware:

### EAGERBEE
```
rule Windows_Trojan_EagerBee_1 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-09"
        last_modified = "2023-06-13"
        threat_name = "Windows.Trojan.EagerBee"
        reference_sample = "09005775fc587ac7bf150c05352e59dc01008b7bf8c1d870d1cea87561aa0b06"
        license = "Elastic License v2"
        os = "windows"

    strings:
        $a1 = { C2 EB D6 0F B7 C2 48 8D 0C 80 41 8B 44 CB 14 41 2B 44 CB 0C 41 }
        $a2 = { C8 75 04 33 C0 EB 7C 48 63 41 3C 8B 94 08 88 00 00 00 48 03 D1 8B }

    condition:
        all of them
}

rule Windows_Trojan_EagerBee_2 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-09-04"
        last_modified = "2023-09-20"
        threat_name = "Windows.Trojan.EagerBee"
        reference_sample = "339e4fdbccb65b0b06a1421c719300a8da844789a2016d58e8ce4227cb5dc91b"
        license = "Elastic License v2"
        os = "windows"

    strings:
        $dexor_config_file = { 48 FF C0 8D 51 FF 44 30 00 49 03 C4 49 2B D4 ?? ?? 48 8D 4F 01 48 }
        $parse_config = { 80 7C 14 20 3A ?? ?? ?? ?? ?? ?? 45 03 C4 49 03 D4 49 63 C0 48 3B C1 }
        $parse_proxy1 = { 44 88 7C 24 31 44 88 7C 24 32 48 F7 D1 C6 44 24 33 70 C6 44 24 34 3D 88 5C 24 35 48 83 F9 01 }
        $parse_proxy2 = { 33 C0 48 8D BC 24 F0 00 00 00 49 8B CE F2 AE 8B D3 48 F7 D1 48 83 E9 01 48 8B F9 }

    condition:
        2 of them
}
```

### RUDEBIRD
```
rule Windows_Trojan_RudeBird {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-09"
        last_modified = "2023-06-13"
        threat_name = "Windows.Trojan.RudeBird"
        license = "Elastic License v2"
        os = "windows"

  strings:
        $a1 = { 40 53 48 83 EC 20 48 8B D9 B9 D8 00 00 00 E8 FD C1 FF FF 48 8B C8 33 C0 48 85 C9 74 05 E8 3A F2 }

    condition:
        all of them
}
```

### DOWNTOWN
```
rule Windows_Trojan_DownTown_1 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-10"
        last_modified = "2023-06-13"
        threat_name = "Windows.Trojan.DownTown"
        license = "Elastic License v2"
        os = "windows"

    strings:
        $a1 = "SendFileBuffer error -1 !!!" fullword
        $a2 = "ScheduledDownloadTasks CODE_FILE_VIEW " fullword
        $a3 = "ExplorerManagerC.dll" fullword

    condition:
        3 of them
}

rule Windows_Trojan_DownTown_2 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-08-23"
        last_modified = "2023-09-20"
        threat_name = "Windows.Trojan.DownTown"
        license = "Elastic License v2"
        os = "windows"

    strings:
        $a1 = "DeletePluginObject"
        $a2 = "GetPluginInfomation"
        $a3 = "GetPluginObject"
        $a4 = "GetRegisterCode"

    condition:
        all of them
}
```

## Observations

All observables are also available for [download](https://github.com/elastic/labs-releases/tree/main/indicators/ref5961) in both ECS and STIX format.

The following observables were discussed in this research.

| Observable                                                       | Type    | Name               | Reference      |
|------------------------------------------------------------------|---------|--------------------|----------------|
| `ce4dfda471f2d3fa4e000f9e3839c3d9fbf2d93ea7f89101161ce97faceadf9a` | SHA-256 | EAGERBEE shellcode | iconcaches.mui |
| `29c90ac124b898b2ff2a4897921d5f5cc251396e8176fc8d6fa475df89d9274d` | SHA-256 | DOWNTOWN           | In-memory DLL  |
| `185.82.217[.]164`                                                 | ipv4    | EAGERBEE C2        |                |
| `195.123.245[.]79`                                                 | ipv4    | EAGERBEE C2        |                |
| `45.90.58[.]103`                                                   | ipv4    | RUDEBIRD C2        |                |
| `185.195.237[.]123`                                                | ipv4    | RUDEBIRD C2        |                |

## References

The following were referenced throughout the above research:
* [https://www.elastic.co/security-labs/siestagraph-new-implant-uncovered-in-asean-member-foreign-ministry](https://www.elastic.co/security-labs/siestagraph-new-implant-uncovered-in-asean-member-foreign-ministry) 
* [https://www.elastic.co/security-labs/update-to-the-REF2924-intrusion-set-and-related-campaigns](https://www.elastic.co/security-labs/update-to-the-REF2924-intrusion-set-and-related-campaigns) 
* [https://thediplomat.com/2022/06/mongolias-1-billion-tree-movement/](https://thediplomat.com/2022/06/mongolias-1-billion-tree-movement/) 
* [https://decoded.avast.io/luigicamastra/apt-group-targeting-governmental-agencies-in-east-asia/](https://decoded.avast.io/luigicamastra/apt-group-targeting-governmental-agencies-in-east-asia/) 
* [https://github.com/OALabs/hashdb/blob/main/algorithms/mult21_add.py](https://github.com/OALabs/hashdb/blob/main/algorithms/mult21_add.py) 
* [https://malpedia.caad.fkie.fraunhofer.de/details/win.smanager](https://malpedia.caad.fkie.fraunhofer.de/details/win.smanager)
* [https://malpedia.caad.fkie.fraunhofer.de/actor/ta428](https://malpedia.caad.fkie.fraunhofer.de/actor/ta428) 
* [https://www.welivesecurity.com/2020/12/17/operation-signsight-supply-chain-attack-southeast-asia/](https://www.welivesecurity.com/2020/12/17/operation-signsight-supply-chain-attack-southeast-asia/) 
