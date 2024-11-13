---
title: "Elastic charms SPECTRALVIPER"
slug: "elastic-charms-spectralviper"
date: "2023-06-09"
subtitle: "Elastic Security Labs has discovered the SPECTRALVIPER malware targeting a national Vietnamese agribusiness."
description: "Elastic Security Labs has discovered the P8LOADER, POWERSEAL, and SPECTRALVIPER malware families targeting a national Vietnamese agribusiness. REF2754 shares malware and motivational elements of the REF4322 and APT32 activity groups."
author:
  - slug: cyril-francois
  - slug: daniel-stepanic
  - slug: seth-goodwin
image: "photo-edited-10@2x.jpg"
category:
  - slug: malware-analysis
  - slug: campaigns
tags:
  - ref2754
  - spectralviper
  - p8loader
  - powerseal
---

## Key takeaways

- The REF2754 intrusion set leverages multiple PE loaders, backdoors, and PowerShell runners
- SPECTRALVIPER is a heavily obfuscated, previously undisclosed, x64 backdoor that brings PE loading and injection, file upload and download, file and directory manipulation, and token impersonation capabilities
- We are attributing REF2754 to a Vietnamese-based intrusion set and aligning with the Canvas Cyclone/APT32/OceanLotus threat actor

## Preamble

Elastic Security Labs has been tracking an intrusion set targeting large Vietnamese public companies for several months, REF2754. During this timeframe, our team discovered new malware being used in coordination by a state-affiliated actor.

This research discusses:

- The SPECTRALVIPER malware
- The P8LOADER malware loader
- The POWERSEAL malware
- Campaign and intrusion analysis of REF2754

## Execution flow

The first event recorded was the creation of a file (**C:\Users\Public\Libraries\dbg.config)** by the System service dropped over SMB from a previously compromised endpoint. The adversary renamed the SysInternals ProcDump utility, used for collecting memory metadata from running processes, to masquerade as the Windows debugger utility ( **windbg.exe** ). Using the renamed ProcDump application with the **-md** flag, the adversary loaded **dbg.config** , an unsigned DLL containing malicious code.

It should be noted, the ProcDump LOLBAS [technique](https://lolbas-project.github.io/lolbas/OtherMSBinaries/Procdump/) requires a valid process in the arguments; so while **winlogon.exe** is being included in the arguments, it is being used because it is a valid process, not that it is being targeted for collection by ProcDump.

![ProcDump masquerading as WinDbg.exe](/assets/images/elastic-charms-spectralviper/image22.jpg)

The unsigned DLL (**dbg.config)** contained DONUTLOADER shellcode which it attempted to inject into **sessionmsg.exe** , the Microsoft Remote Session Message Server. DONUTLOADER was configured to load the SPECTRALVIPER backdoor, and ultimately the situationally-dependent P8LOADER or POWERSEAL malware families. Below is the execution flow for the REF2754 intrusion set.

![REF2754 execution flow](/assets/images/elastic-charms-spectralviper/image16.png)

Our team also observed a similar workflow described above, but with different techniques to proxy their malicious execution. One example leveraged the Internet Explorer program ( **ExtExport.exe** ) to load a DLL, while another technique involved side-loading a malicious DLL ( **dnsapi.dll** ) using a legitimate application ( **nslookup.exe** ).

These techniques and malware families make up the REF2754 intrusion set.

## SPECTRALVIPER code analysis

### Overview

During our investigation, we observed a previously-undiscovered backdoor malware family that we’re naming SPECTRALVIPER. SPECTRALVIPER is a 64-bit Windows backdoor coded in C++ and heavily obfuscated. It operates with two distinct communication modes, allowing it to receive messages either via HTTP or a Windows named pipe.

Through our analysis, we have identified the following capabilities:

- **PE loading/Injection** : SPECTRALVIPER can load and inject executable files, supporting both x86 and x64 architectures. This capability enables it to execute malicious code within legitimate processes.
- **Token Impersonation** : The malware possesses the ability to impersonate security tokens, granting it elevated privileges and bypassing certain security measures. This enables unauthorized access and manipulation of sensitive resources.
- **File downloading/uploading** : SPECTRALVIPER can download and upload files to and from the compromised system. This allows the attacker to exfiltrate data or deliver additional malicious payloads to the infected machine.
- **File/directory manipulation** : The backdoor is capable of manipulating files and directories on the compromised system. This includes creating, deleting, modifying, and moving files or directories, providing the attacker with extensive control over the victim's file system.

![SPECTRALVIPER overview](/assets/images/elastic-charms-spectralviper/image30.jpg)

### Execution flow

#### Launch

SPECTRALVIPER can be compiled as a PE executable or DLL file. Launching the malware as a PE is straightforward by executing **.\spectralviper.exe**.

However, when the malware is a DLL it will attempt to disguise itself as a legitimate library with known exports such as sqlite3 in our observed sample.

![SPECTRALVIPER DLL sample exports](/assets/images/elastic-charms-spectralviper/image14.jpg)

The SPECTRALVIPER entrypoint is hidden within these exports. In order to find the right one, we can brute-force call them using PowerShell and [rundll-ng](https://github.com/BenjaminSoelberg/RunDLL-NG). The PowerShell command depicted below calls each SPECTRALVIPER export in a **for** loop until we find the one launching the malware capabilities.

```
for($i=0; $i -lt 20; $i++){.\rundll-ng\rundll64-ng.exe ".\7e35ba39c2c77775b0394712f89679308d1a4577b6e5d0387835ac6c06e556cb.dll" "#$i"}
```

![Brute-forcing calls to SPECTRALVIPER exports](/assets/images/elastic-charms-spectralviper/image33.jpg)

Upon execution, the binary operates in either HTTP mode or pipe mode, determined by its hardcoded configuration.

#### Pipe mode

In pipe mode, SPECTRALVIPER opens a named pipe with a hardcoded name and waits for incoming commands, in this example **\\.\pipe\raSeCIR4gg**.

![SPECTRALVIPER sample operating in pipe mode](/assets/images/elastic-charms-spectralviper/image19.jpg)

This named pipe doesn’t have any security attributes meaning it’s accessible by everyone. This is interesting because an unsecured named pipe can be overtaken by a co-resident threat actor (either known or unknown to the SPECTRALVIPER operator) or defensive teams as a way to interrupt this execution mode.

![SPECTRALVIPER’s pipe security attributes](/assets/images/elastic-charms-spectralviper/image6.jpg)

However, a specific protocol is needed to communicate with this pipe. SPECTRALVIPER implements the [Diffie-Helman key exchange protocol](https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange) to exchange the key needed to encrypt and decrypt commands transmitted via the named pipe, which is AES-encrypted.

#### HTTP mode

In HTTP mode, the malware will beacon to its C2 every _n_ seconds, the interval period is generated randomly in a range between 10 and 99 seconds.

![SPECTRALVIPER’s other sample operates in HTTP mode](/assets/images/elastic-charms-spectralviper/image20.jpg)

Using a debugger, we can force the binary to use the HTTP channel instead of the named pipe if the binary contains a hard-coded domain.

![Debugging SPECTRALVIPER to force the HTTP mode](/assets/images/elastic-charms-spectralviper/image28.jpg)

Below is an HTTP request example.

![SPECTRALVIPER HTTP request example](/assets/images/elastic-charms-spectralviper/image15.jpg)

The request contains a cookie header, “ **euconsent-v2** ”, which contains host-gathered information. This information is encrypted using RSA1024 asymmetric encryption and base64-encoded using Base64. Below is an example of the cookie content before encryption.

![Cookie data pre RSA1024 encryption](/assets/images/elastic-charms-spectralviper/image10.jpg)

We believe that the first value, in this example “ **H9mktfe2k0ukk64nZjw1ow==** ”, is the randomly generated AES key that is shared with the server to encrypt communication data.

### Commands

While analyzing SPECTRALVIPER samples we discovered its command handler table containing between 33 and 36 handlers.

![SPECTRALVIPER registering command handlers](/assets/images/elastic-charms-spectralviper/image17.jpg)

Below is a table listing of the commands that were identified.

| ID  | Name                                         |
| --- | -------------------------------------------- |
| 2   | DownloadFile                                 |
| 3   | UploadFile                                   |
| 5   | SetBeaconIntervals                           |
| 8   | CreateRundll32ProcessAndHollow               |
| 11  | InjectShellcodeInProcess                     |
| 12  | CreateProcessAndInjectShellcode              |
| 13  | InjectPEInProcess                            |
| 14  | CreateProcessAndHollow                       |
| 20  | CreateRundll32ProcessWithArgumentAndInjectPE |
| 81  | StealProcessToken                            |
| 82  | ImpersonateUser                              |
| 83  | RevertToSelf                                 |
| 84  | AdjustPrivileges                             |
| 85  | GetCurrentUserName                           |
| 103 | ListFiles                                    |
| 106 | ListRunningProcesses                         |
| 108 | CopyFile                                     |
| 109 | DeleteFile                                   |
| 110 | CreateDirectory                              |
| 111 | MoveFile                                     |
| 200 | RunDLLInOwnProcess                           |

In order to speed up the process of interacting with SPECTRALVIPER, we bypassed the communication protocols and injected our own backdoor into the binary. This backdoor will open a socket and call the handlers upon receiving our messages.

![Injecting our backdoor to call SPECTRALVIPER handlers](/assets/images/elastic-charms-spectralviper/image13.jpg)

When the **AdjustPrivileges** command is executed, and depending on the process's current privilege level, the malware will try to set the following list of privileges.

![SPECTRALVIPER setting privileges](/assets/images/elastic-charms-spectralviper/image3.jpg)

### Defense evasion

#### Code obfuscation

The binary code is heavily obfuscated by splitting each function into multi-level dummy functions that encapsulate the initial logic. On top of that, the control flow of those functions is also obfuscated using control flow flattening. [Control flow flattening](https://news.sophos.com/en-us/2022/05/04/attacking-emotets-control-flow-flattening/) is an obfuscation technique that removes clean program structures and places the blocks next to each other inside a loop with a switch statement to control the flow of the program.

Below is an example of a second-level identity function where the highlighted parameter **p_a1** is just returned despite the complexity of the function.

![SPECTRALVIPER obfuscated function example](/assets/images/elastic-charms-spectralviper/image21.jpg)

#### String obfuscation

SPECTRALVIPER’s strings are obfuscated using a custom structure and AES decryption. The key is hardcoded ( **"\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f"** ) and the IV is contained within the encrypted string structure.

![Encrypted string structure 1/2](/assets/images/elastic-charms-spectralviper/image24.jpg)

![Encrypted string structure 2/2](/assets/images/elastic-charms-spectralviper/image2.jpg)

We can decrypt the strings by instrumenting the malware and calling its AES decryption functions.

![Decrypting strings by instrumenting the binary 1/2](/assets/images/elastic-charms-spectralviper/image27.jpg)

![Decrypting strings by instrumenting the binary 2/2](/assets/images/elastic-charms-spectralviper/image31.png)

### Summary

SPECTRALVIPER is an x64 backdoor discovered during intrusion analysis by Elastic Security Labs. It can be compiled as an executable or DLL which usually would imitate known binary exports.

It enables process loading/injection, token impersonation, and file manipulation. It utilizes encrypted communication channels (HTTP and named pipe) with AES encryption and Diffie-Hellman or RSA1024 key exchange.

All samples are heavily obfuscated using the same obfuscator with varying levels of hardening.

Using the information we collected through static and dynamic analysis, we were able to identify several other samples in VirusTotal. Using the debugging process outlined above, we were also able to collect the C2 infrastructure for these samples.

## P8LOADER

### Overview

The Portable Executable (PE) described below is a Windows x64 PE loader, written in C++, which we are naming P8LOADER after one of its exports, **P8exit**.

![P8exit export name](/assets/images/elastic-charms-spectralviper/image5.jpg)

### Discovery

P8LOADER was initially discovered when an unbacked shellcode alert was generated by the execution of a valid Windows process, **RuntimeBroker.exe**. Unbacked executable sections, or _floating code_, are the result of code section types set to “Private” instead of “Image” like you would see when code is mapped to a file on disk. Threads starting from these types of memory regions are anomalous and a good indicator of malicious activity.

![P8LOADER unbacked observation](/assets/images/elastic-charms-spectralviper/image1.jpg)

> If you want to learn more about unbacked executable events, check out the [Hunting in Memory research](https://www.elastic.co/security-labs/hunting-memory) publication by Joe Desimone.

### Execution flow

The loader exports two functions that have the capability to load PE binaries into its own process memory, either from a file or from memory.

![P8LOADER functions](/assets/images/elastic-charms-spectralviper/image26.jpg)

The PE to be executed is loaded into memory using the **VirtualAlloc** method with a classic PE loading algorithm (loading sections, resolving imports, and applying relocations).

![P8LOADER loading the PE to be executed](/assets/images/elastic-charms-spectralviper/image9.jpg)

Next, a new thread is allocated with the entry point of the PE as the starting address.

![P8LOADER setting the PE starting address](/assets/images/elastic-charms-spectralviper/image34.jpg)

Finally, the loaded PE’s STDOUT handle is replaced with a pipe and a reading pipe thread is created as a way to redirect the output of the binary to the loader logging system.

![P8LOADER redirecting to the loader logging system](/assets/images/elastic-charms-spectralviper/image29.jpg)

On top of redirecting the loaded PE output, the loader uses an API interception mechanism to hook certain APIs of the loaded process, log any calls to it, and send the data through a named pipe (with a randomly generated UUID string as the name).

The hooking of the PE's import table is done at import resolution time by replacing the originally imported function addresses with their own stub.

### Defense evasion

#### String obfuscation

P8LOADER uses a C++ template-based obfuscation technique to obscure errors and debug strings with a set of different algorithms chosen randomly at compile time.

These strings are obfuscated to hinder analysis as they provide valuable information about the loader functions and capabilities.

![String decryption algorithm example 1/3](/assets/images/elastic-charms-spectralviper/image7.png)

![String decryption algorithm example 2/3](/assets/images/elastic-charms-spectralviper/image23.png)

![String decryption algorithm example 3/3](/assets/images/elastic-charms-spectralviper/image25.jpg)

### Summary

P8LOADER is a newly discovered x64 Windows loader that is used to execute a PE from a file or from memory. This malware is able to redirect the loaded PE output to its logging system and hook the PE imports to log import calls.

## POWERSEAL code analysis

### Overview

During this intrusion, we observed a lightweight .NET PowerShell runner that we call POWERSEAL based on embedded strings. After SPECTRALVIPER was successfully deployed, the POWERSEAL utility would be used to launch supplied PowerShell scripts or commands. The malware leverages syscalls ( **NtWriteVirtualMemory** ) for evading defensive solutions (AMSI/ETW).

![POWERSEAL Classes/Functions](/assets/images/elastic-charms-spectralviper/image11.jpg)

### Defense evasion

Event Tracing for Windows (ETW) provides a mechanism to trace and log events that are raised by user-mode applications and kernel-mode drivers. The Anti Malware Scan Interface (AMSI) provides enhanced malware protection for data, applications, and workloads. POWERSEAL adopts well-known and publicly-available bypasses in order to patch these technologies in memory. This increases their chances of success while decreasing their detectable footprint.

For example, POWERSEAL employs [common approaches to unhooking and bypassing AMSI](https://www.mdsec.co.uk/2018/06/exploring-powershell-amsi-and-logging-evasion/) in order to bypass Microsoft Defender’s signature

![POWERSEAL bypassing AMSI](/assets/images/elastic-charms-spectralviper/image8.jpg)

### Launch PowerShell

POWERSEAL’s primary function is to execute PowerShell. In the following depiction of POWERSEAL’s source code, we can see that POWERSEAL uses PowerShell to execute a script and arguments ( **command** ). The script and arguments are provided by the threat actor and were not observed in the environment.

![POWERSEAL executing shellcode with PowerShell](/assets/images/elastic-charms-spectralviper/image32.jpg)

### Summary

POWERSEAL is a new and purpose-built PowerShell runner that borrows freely from a variety of open source offensive security tools, delivering offensive capabilities in a streamlined package with built-in defense evasion.

## Campaign and adversary modeling

### Overview

REF2754 is an ongoing campaign against large nationally important public companies within Vietnam. The malware execution chain in this campaign is initiated with DONUTLOADER, but goes on to utilize previously unreported tooling.

1. SPECTRALVIPER, an obfuscated x64 backdoor that brings PE loading and injection, file upload and download, file and directory manipulation, token impersonation, and named pipe and HTTP command and control
2. P8LOADER, an obfuscated Windows PE loader allowing the attacker to minimize and obfuscate some logging on the victim endpoints, and
3. POWERSEAL, a PowerShell runner with ETW and AMSI bypasses built in for enhanced defensive evasion when using PowerShell tools

Elastic Security Labs concludes with moderate confidence that this campaign is executed by a Vietnamese state-affiliated threat.

![REF2754 and REF4322 campaign intersections](/assets/images/elastic-charms-spectralviper/image4.png)

### Victimology

Using our SPECTRALVIPER YARA signature, we identified two endpoints in a second environment infected with SPECTRALVIPER implants. That environment was discussed in Elastic Security Labs research in 2022 which describes [REF4322](https://www.elastic.co/security-labs/phoreal-malware-targets-the-southeast-asian-financial-sector).

The REF4322 victim is a Vietnam-based financial services company. Elastic Security Labs first talked about this victim and activity group in 2022.

The REF2754 victim has been identified as a large Vietnam-based agribusiness.

Further third party intelligence from VirusTotal, based on retro-hunting the YARA rules available at the end of this research, indicate additional Vietnam-based victims. There were eight total Retrohunt hits:

- All were manually confirmed to be SPECTRALVIPER
- All samples were between 1.59MB and 1.77MB in size
- All VirusTotal samples were initially submitted from Vietnam

Some samples were previously identified in our first party collection, and some were new to us.

> Be mindful of the analytic limitations of relying on “VT submitter” too heavily. This third party reporting mechanism may be subject to circular reporting concerns or VPN usage that modifies the GEOs used, and inadvertent reinforcement of a hypothesis. In this case, it was used in an attempt to try to find samples with apparent non-VN origins, without success.

At the time of publication, all known victims are large public companies physically within Vietnam, and conducting business primarily within Vietnam.

### Campaign analysis

The overlap with the REF4322 environment occurred fairly recently, on April 20, 2023. One of these endpoints was previously infected with the PHOREAL implant, while the other endpoint was compromised with PIPEDANCE.

These SPECTRALVIPER infections were configured under pipe mode as opposed to hardcoded domains set to wait for incoming connection over a named pipe ( **\\.\pipe\ydZb0bIrT** ).

![SPECTRALVIPER coresident on a PIPEDANCE-infected host](/assets/images/elastic-charms-spectralviper/image18.jpg)

This activity appears to be a handoff of access or swapping out of one tool for another.

> If you’re interested in a detailed breakdown of the PIPEDANCE malware, check out our [previous research](https://www.elastic.co/security-labs/twice-around-the-dance-floor-with-pipedance) and stay tuned, more to come.

Post-exploitation collection of intended effects has been limited, however, while speculative in nature, a motivation assessment based on malware, implant, and technical capabilities points to achieving initial access, maintaining persistence, and operating as a backdoor for intelligence gathering purposes.

Domains from REF4322, REF2754, and from samples collected from VirusTotal used for C2 have all been registered in the last year with the most recent being in late April 2023.

| Domain:                          | Created:   |
| -------------------------------- | ---------- |
| stablewindowsapp[.]com           | 2022-02-10 |
| webmanufacturers[.]com           | 2022-06-10 |
| toppaperservices[.]com           | 2022-12-15 |
| hosting-wordpress-services[.]com | 2023-03-15 |
| appointmentmedia[.]com           | 2023-04-26 |

GEOs for associated IPs for these domains are globally distributed, and they use Sectigo, Rapid SSL, and Let’s Encrypt certs. Further infrastructure analysis did not uncover anything of note beyond their registration date, which does give us a campaign timebox. Based on the recent registration of **appointmentmedia[.]com**, this campaign could still be ongoing with new domains being registered for future intrusions.

### Campaign associations

Elastic Security Labs concludes with moderate confidence that both REF4322 and REF2754 activity groups represent campaigns planned and executed by a Vietnamese state-affiliated threat. Based on our analysis, this activity group overlaps with prior reporting of Canvas Cyclone, APT32, and OCEANLOTUS threat groups.

As stated above and in previous reporting, the REF4322 victim is a financial institution that manages capital for business acquisitions and former State-Owned-Enterprises.

The REF2754 victim is a large agribusiness that is systemically important in the food production and distribution supply chains of Vietnam. Ongoing urbanization, pollution, the COVID-19 pandemic, and climate change have been challenges for Vietnam’s food security. As a data point, in March of 2023, Vietnam’s Prime Minister [approved](https://apps.fas.usda.gov/newgainapi/api/Report/DownloadReportByFileName?fileName=Vietnam%20Issues%20National%20Action%20Plan%20on%20Food%20Systems%20Transformation%20toward%20Transparency%20Responsibility%20and%20Sustainability%20by%202030_Hanoi_Vietnam_VM2023-0017.pdf) the National Action Plan on Food Systems Transformation toward Transparency, Responsibility, and Sustainability in Vietnam by 2030. Its overall objective is to transform the food systems including production, processing, distribution, and consumption towards transparency, responsibility, and sustainability based on local advantages; to ensure national food and nutrition security; to improve people's income and living standards; to prevent and control natural disasters and epidemics; to protect the environment and respond to climate change; and finally to contribute to the rolling-out of the Vietnam and Global Sustainable Development Goals by 2030. All of this highlights that food security has been a point of national policy emphasis, which also makes the victims of REF2754 an attractive target to threat actors because of their intersection with Vietnam’s strategic objectives.

In addition to the nationally-aligned strategic interests of the victims for REF4322 and REF2754, both victims were infected with the DONUTLOADER, P8LOADER, POWERSEAL, and SPECTRALVIPER malware families using similar deployment techniques, implant management, and naming conventions in both intrusions.

A threat group with access to the financial transaction records available in REF4322, combined with the national strategic food safety policy for REF2754 would provide insight into competency of management, corruption, foreign influence, or price manipulations otherwise unavailable through regulatory reporting.

### Diamond model

Elastic Security utilizes the [Diamond Model](https://www.activeresponse.org/wp-content/uploads/2013/07/diamond.pdf) to describe high-level relationships between the adversaries, capabilities, infrastructure, and victims of intrusions. While the Diamond Model is most commonly used with single intrusions, and leveraging Activity Threading (section 8) as a way to create relationships between incidents, an adversary-centered (section 7.1.4) approach allows for a (cluttered) single diamond.

![REF2754 Diamond Model](/assets/images/elastic-charms-spectralviper/image12.png)

## Observed adversary tactics and techniques

Elastic uses the MITRE ATT&CK framework to document common tactics, techniques, and procedures that advanced persistent threats use against enterprise networks.

### Tactics

Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.

- [Initial access](https://attack.mitre.org/tactics/TA0001)
- [Execution](https://attack.mitre.org/tactics/TA0002)
- [Defense evasion](https://attack.mitre.org/tactics/TA0005)
- [Discovery](https://attack.mitre.org/tactics/TA0007)
- [Lateral movement](https://attack.mitre.org/tactics/TA0008/)
- [Collection](https://attack.mitre.org/tactics/TA0009)
- [Command and control](https://attack.mitre.org/tactics/TA0011)

### Techniques / Sub techniques

Techniques and Sub techniques represent how an adversary achieves a tactical goal by performing an action.

- [Gather host information](https://attack.mitre.org/techniques/T1592/)
- [Gather victim network information](https://attack.mitre.org/techniques/T1590/)
- [Network share discovery](https://attack.mitre.org/techniques/T1135/)
- [Remote system discovery](https://attack.mitre.org/techniques/T1018/)
- [File and directory discovery](https://attack.mitre.org/techniques/T1083/)
- [Process discovery](https://attack.mitre.org/techniques/T1057/)
- [System service discovery](https://attack.mitre.org/techniques/T1007/)
- [System owner/user discovery](https://attack.mitre.org/techniques/T1033/)
- [Process injection](https://attack.mitre.org/techniques/T1055/)
- [Masquerading](https://attack.mitre.org/techniques/T1036/)
- [Application layer protocol: Web protocols](https://attack.mitre.org/techniques/T1071/001/)
- [Access Token Manipulation: Make and Impersonate Token](https://attack.mitre.org/techniques/T1134/003/)

## Detection logic

### Preventions

All of the malware discussed in this research publication have protections included in Elastic Defend.

- [Windows.Trojan.SpectralViper](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_SpectralViper.yar)
- [Windows.Trojan.PowerSeal](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_PowerSeal.yar)
- [Windows.Trojan.P8Loader](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_P8Loader.yar)

### YARA

Elastic Security has created YARA rules to identify this activity. Below are YARA rules to identify SPECTRALVIPER, POWERSEAL, and P8LOADER

```
rule Windows_Trojan_SpectralViper_1 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-04-13"
        last_modified = "2023-05-26"
        os = "Windows"
        arch = "x86"
        category_type = "Trojan"
        family = "SpectralViper"
        threat_name = "Windows.Trojan.SpectralViper"
        reference_sample = "7e35ba39c2c77775b0394712f89679308d1a4577b6e5d0387835ac6c06e556cb"
       license = "Elastic License v2"

    strings:
        $a1 = { 13 00 8D 58 FF 0F AF D8 F6 C3 01 0F 94 44 24 26 83 FD 0A 0F 9C 44 24 27 4D 89 CE 4C 89 C7 48 89 D3 48 89 CE B8 }
        $a2 = { 15 00 8D 58 FF 0F AF D8 F6 C3 01 0F 94 44 24 2E 83 FD 0A 0F 9C 44 24 2F 4D 89 CE 4C 89 C7 48 89 D3 48 89 CE B8 }
        $a3 = { 00 8D 68 FF 0F AF E8 40 F6 C5 01 0F 94 44 24 2E 83 FA 0A 0F 9C 44 24 2F 4C 89 CE 4C 89 C7 48 89 CB B8 }
        $a4 = { 00 48 89 C6 0F 29 30 0F 29 70 10 0F 29 70 20 0F 29 70 30 0F 29 70 40 0F 29 70 50 48 C7 40 60 00 00 00 00 48 89 C1 E8 }
        $a5 = { 41 0F 45 C0 45 84 C9 41 0F 45 C0 EB BA 48 89 4C 24 08 89 D0 EB B1 48 8B 44 24 08 48 83 C4 10 C3 56 57 53 48 83 EC 30 8B 05 }
        $a6 = { 00 8D 70 FF 0F AF F0 40 F6 C6 01 0F 94 44 24 25 83 FF 0A 0F 9C 44 24 26 89 D3 48 89 CF 48 }
        $a7 = { 48 89 CE 48 89 11 4C 89 41 08 41 0F 10 01 41 0F 10 49 10 41 0F 10 51 20 0F 11 41 10 0F 11 49 20 0F 11 51 30 }
        $a8 = { 00 8D 58 FF 0F AF D8 F6 C3 01 0F 94 44 24 22 83 FD 0A 0F 9C 44 24 23 48 89 D6 48 89 CF 4C 8D }
    condition:
        5 of them
}
```

```
rule Windows_Trojan_SpectralViper_2 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-10"
        last_modified = "2023-05-10"
        os = "Windows"
        arch = "x86"
        category_type = "Trojan"
        family = "SpectralViper"
        threat_name = "Windows.Trojan.SpectralViper"
        reference_sample = "d1c32176b46ce171dbce46493eb3c5312db134b0a3cfa266071555c704e6cff8"
       license = "Elastic License v2"

    strings:
        $a1 = { 18 48 89 4F D8 0F 10 40 20 0F 11 47 E0 0F 10 40 30 0F 11 47 F0 48 8D }
        $a2 = { 24 27 48 83 C4 28 5B 5D 5F 5E C3 56 57 53 48 83 EC 20 48 89 CE 48 }
        $a3 = { C7 84 C9 0F 45 C7 EB 86 48 8B 44 24 28 48 83 C4 30 5B 5F 5E C3 48 83 }
        $s1 = { 40 53 48 83 EC 20 48 8B 01 48 8B D9 48 8B 51 10 48 8B 49 08 FF D0 48 89 43 18 B8 04 00 00 }
        $s2 = { 40 53 48 83 EC 20 48 8B 01 48 8B D9 48 8B 49 08 FF D0 48 89 43 10 B8 04 00 00 00 48 83 C4 20 5B }
        $s3 = { 48 83 EC 28 4C 8B 41 18 4C 8B C9 48 B8 AB AA AA AA AA AA AA AA 48 F7 61 10 48 8B 49 08 48 C1 EA }
    condition:
        2 of ($a*) or any of ($s*)
}
```

```
rule Windows_Trojan_PowerSeal_1 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-03-16"
        last_modified = "2023-05-26"
        os = "Windows"
        arch = "x86"
        category_type = "Trojan"
        family = "PowerSeal"
        threat_name = "Windows.Trojan.PowerSeal"
        license = "Elastic License v2"

    strings:
        $a1 = "PowerSeal.dll" wide fullword
        $a2 = "InvokePs" ascii fullword
        $a3 = "amsiInitFailed" wide fullword
        $a4 = "is64BitOperatingSystem" ascii fullword
    condition:
        all of them
}
```

```
rule Windows_Trojan_PowerSeal_2 {
    meta:
        author = "Elastic Security"
        creation_date = "2023-05-10"
        last_modified = "2023-05-10"
        os = "Windows"
        arch = "x86"
        category_type = "Trojan"
        family = "PowerSeal"
        threat_name = "Windows.Trojan.PowerSeal"
        license = "Elastic License v2"

    strings:
        $a1 = "[+] Loading PowerSeal"
        $a2 = "[!] Failed to exec PowerSeal"
        $a3 = "AppDomain: unable to get the name!"
    condition:
        2 of them
}
```

```
rule Windows_Trojan_P8Loader {
    meta:
        author = "Elastic Security"
        creation_date = "2023-04-13"
        last_modified = "2023-05-26"
        os = "Windows"
        arch = "x86"
        category_type = "Trojan"
        family = "P8Loader"
        threat_name = "Windows.Trojan.P8Loader"
        license = "Elastic License v2"

    strings:
        $a1 = "\t[+] Create pipe direct std success\n" fullword
        $a2 = "\tPEAddress: %p\n" fullword
        $a3 = "\tPESize: %ld\n" fullword
        $a4 = "DynamicLoad(%s, %s) %d\n" fullword
        $a5 = "LoadLibraryA(%s) FAILED in %s function, line %d" fullword
        $a6 = "\t[+] No PE loaded on memory\n" wide fullword
        $a7 = "\t[+] PE argument: %ws\n" wide fullword
        $a8 = "LoadLibraryA(%s) FAILED in %s function, line %d" fullword
    condition:
        5 of them
}
```

## References

The following were referenced throughout the above research:

- [https://www.elastic.co/security-labs/hunting-memory](https://www.elastic.co/security-labs/hunting-memory)
- [https://www.elastic.co/security-labs/phoreal-malware-targets-the-southeast-asian-financial-sector](https://www.elastic.co/security-labs/phoreal-malware-targets-the-southeast-asian-financial-sector)
- [https://www.elastic.co/security-labs/twice-around-the-dance-floor-with-pipedance](https://www.elastic.co/security-labs/twice-around-the-dance-floor-with-pipedance)
- [https://www.microsoft.com/en-us/security/blog/2020/11/30/threat-actor-leverages-coin-miner-techniques-to-stay-under-the-radar-heres-how-to-spot-them/](https://www.microsoft.com/en-us/security/blog/2020/11/30/threat-actor-leverages-coin-miner-techniques-to-stay-under-the-radar-heres-how-to-spot-them/)
- [https://learn.microsoft.com/en-us/microsoft-365/security/intelligence/microsoft-threat-actor-naming](https://learn.microsoft.com/en-us/microsoft-365/security/intelligence/microsoft-threat-actor-naming?view=o365-worldwide)

## Observations

All observables are also available for [download](https://github.com/elastic/labs-releases/tree/main/indicators/spectralviper) in both ECS and STIX format in a combined zip bundle.

The following observables were discussed in this research.

| Observable                                                       | Type    | Name                                      | Reference                            |
| ---------------------------------------------------------------- | ------- | ----------------------------------------- | ------------------------------------ |
| 56d2d05988b6c23232b013b38c49b7a9143c6649d81321e542d19ae46f4a4204 | SHA-256 | -                                         | SPECTRALVIPER Related to 1.dll below |
| d1c32176b46ce171dbce46493eb3c5312db134b0a3cfa266071555c704e6cff8 | SHA-256 | 1.dll                                     | SPECTRALVIPER                        |
| 7e35ba39c2c77775b0394712f89679308d1a4577b6e5d0387835ac6c06e556cb | SHA-256 | asdgb.exe                                 | SPECTRALVIPER                        |
| 4e3a88cf00e0b4718e7317a37297a185ff35003192e5832f5cf3020c4fc45966 | SHA-256 | Settings.db                               | SPECTRALVIPER                        |
| 7b5e56443812eed76a94077763c46949d1e49cd7de79cde029f1984e0d970644 | SHA-256 | Microsoft.MicrosoftEdge_8wekyb3d8bbwe.pkg | SPECTRALVIPER                        |
| 5191fe222010ba7eb589e2ff8771c3a75ea7c7ffc00f0ba3f7d716f12010dd96 | SHA-256 | UpdateConfig.json                         | SPECTRALVIPER                        |
| 4775fc861bc2685ff5ca43535ec346495549a69891f2bf45b1fcd85a0c1f57f7 | SHA-256 | Microsoft.OneDriveUpdatePackage.mca       | SPECTRALVIPER                        |
| 2482c7ececb23225e090af08feabc8dec8d23fe993306cb1a1f84142b051b621 | SHA-256 | ms-certificates.sst                       | SPECTRALVIPER                        |
| stablewindowsapp[.]com                                           | Domain  | n/a                                       | C2                                   |
| webmanufacturers[.]com                                           | Domain  | n/a                                       | C2                                   |
| toppaperservices[.]com                                           | Domain  | n/a                                       | C2                                   |
| hosting-wordpress-services[.]com                                 | Domain  | n/a                                       | C2                                   |
| appointmentmedia[.]com                                           | Domain  | n/a                                       | C2                                   |
