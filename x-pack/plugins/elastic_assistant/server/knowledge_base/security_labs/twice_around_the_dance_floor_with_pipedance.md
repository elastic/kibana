---
title: "Twice around the dance floor - Elastic discovers the PIPEDANCE backdoor"
slug: "twice-around-the-dance-floor-with-pipedance"
date: "2023-02-27"
subtitle: "Elastic Security Labs describes the PIPEDANCE backdoor"
description: "Elastic Security Labs is tracking an active intrusion into a Vietnamese organization using a recently discovered triggerable, multi-hop backdoor we are calling PIPEDANCE. This full-featured malware enables stealthy operations through the use of named"
author:
  - slug: daniel-stepanic
image: "photo-edited-12@2x.jpg"
category:
  - slug: malware-analysis
tags:
  - ref1326
  - pipedance
---

## Key takeaways

- Elastic Security Labs has identified PIPEDANCE, a previously unknown Windows backdoor used to enable post-compromise and lateral movement activities
- Built for stealthy operations through named pipes, PIPEDANCE employs capabilities for interactive terminals, discovery/file enumeration, process injection, and data exfiltration checks
- PIPEDANCE was observed deploying Cobalt Strike

## Preamble

In late December 2022, Elastic Security Labs observed new activity in a previously monitored environment targeting a Vietnamese organization. This new activity included the execution of a named pipe malware used to facilitate post-compromise activity. We are naming this malware family PIPEDANCE. By leveraging PIPEDANCE, the adversary is able to:

- Disguise activity through a custom function that randomly injects into a hard-coded list of Windows programs
- Perform discovery by enumerating files and processes
- Leverage standard backdoor capabilities such as running commands, writing files
- Check different network protocols for exfiltration
- Launch additional payloads through process injection techniques

In this post, we walk through the initial execution then detail the capabilities we have discovered from reviewing the malware.

Note: Check out our follow-on publication on creating your own client to interact with a PIPEDANCE infected endpoint [here](https://www.elastic.co/security-labs/dancing-the-night-away-with-named-pipes).

## Overview

Unlike malware that might communicate with conventional network or application protocols, we identified a binary designed explicitly for lateral movement and post-compromise enablement within a contested environment: executing additional implants, running commands, performing file discovery, enumerating running processes, and checking outbound access; all through the use of Windows named pipes. This kind of functionality is comparable to Cobalt Strike or Metasploit’s SMB modules.

> [Named pipes](https://learn.microsoft.com/en-us/windows/win32/ipc/named-pipes) within Windows allow for inter-process communication on a single computer or between processes on separate machines within the same network. Named pipes can be set up for one-way or two-way communication between a pipe client and a pipe server. The data used within named pipes are all stored in memory where it is written and retrieved using standard Windows APIs ( **CreateFile** / **WriteFile** / **ReadFile** ) in the same way as reading/writing files.

[Elastic Defend](https://docs.elastic.co/en/integrations/endpoint) was installed after an unknown initial compromise. The [Suspicious Windows Service Execution](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/privilege_escalation_suspicious_windows_service_execution.toml) behavioral rule generated the first observed events. While unconfirmed, [published research](https://www.microsoft.com/en-us/security/blog/2020/11/30/threat-actor-leverages-coin-miner-techniques-to-stay-under-the-radar-heres-how-to-spot-them/) describes similar techniques by an adversary leveraging execution through a locally-mounted Administrator share and using [Microsoft’s SysInternals DebugView](https://learn.microsoft.com/en-us/sysinternals/downloads/debugview) ( **DbgView.exe** ) utility to load PIPEDANCE.

**DbgView.exe** was observed loading PIPEDANCE into [**makecab.exe**](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/makecab), the Windows utility used to package Cabinet files **.** The Windows performance data utility, [**typeperf.exe**](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/typeperf), was then injected into and spawned [**openfiles.exe**](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/openfiles) where Cobalt Strike was loaded into this process.

While **openfiles.exe** binary is a legitimate Microsoft application, Elastic Defend generated a Cobalt Strike memory signature. After extracting the memory regions from the alert in Kibana, we identified the Cobalt Strike module [**invokeassembly.x64.dll**](https://twitter.com/_RastaMouse/status/1104282852869525506?s=20&t=0_v846VUU-A0lE2gxgN_bg), validating that Cobalt Strike was injected into the legitimate **openfiles.exe** binary.

![Execution flow of DgbView.exe loading makecab.exe and then openfiles.exe (Cobalt Strike)](/assets/images/twice-around-the-dance-floor-with-pipedance/image19.png)

PIPEDANCE leverages named pipes as a communication mechanism between different infected endpoints within a compromised network. The adversary uses this capability as a bidirectional layer of command and control through which they can dispatch commands and pass data between named pipes.

## Initial set-up / Communication flow

At the beginning of the main function, there is a hardcoded string used as the pipe name. This string is also used in later stages as an RC4 key to encrypt/decrypt data between pipes. In the image below, we can see the hardcoded pipe name ( **u0hxc1q44vhhbj5oo4ohjieo8uh7ufxe** ) being set as a global variable.

![The hardcoded u0hxc1q44vhhbj5oo4ohjieo8uh7ufxe string used as the pipe name](/assets/images/twice-around-the-dance-floor-with-pipedance/image27.jpg)

During initial execution, the malware will use the **CreateNamedPipeA** and **ConnectNamedPipe** methods to create the named pipe ( **“\\.\pipe\u0hxc1q44vhhbj5oo4ohjieo8uh7ufxe**") and wait for an incoming client process to connect to the pipe. The figure below represents this activity showing the pipe name being formatted with hardcoded string and initializing the pipe.

![Initial Pipe Creation and Setup](/assets/images/twice-around-the-dance-floor-with-pipedance/image17.jpg)

During the first client connection, PIPEDANCE retrieves the following values from the local system and places them into a buffer:

- Process ID of the PIPEDANCE process
- Current working directory of the PIPEDANCE process.
- Domain & Username of the PIPEDANCE process

PIPEDANCE passes this buffer and an 8-byte structure containing the result flag from a **IsWow64Process** evaluation and the buffer size for the subsequent **WriteFile** operation to the pipe. PIPEDANCE then encrypts the buffer containing the previous process details with RC4 and then writes the encrypted data back to the client pipe.

![PIPEDANCE Write File Operation](/assets/images/twice-around-the-dance-floor-with-pipedance/image18.jpg)

Below is a high-level graphic that illustrates the purpose-built lateral movement functionality. With PIPEDANCE infections, the named pipe server process is run on a new victim machine, while the client instructions come from the operator from a previously compromised machine in the same network.

![PIPEDANCE communication flow](/assets/images/twice-around-the-dance-floor-with-pipedance/image19_2_V2.jpg)

### Command dispatching

After an initial handshake, PIPEDANCE’s primary functionality consists of a while loop with a command dispatching function. This dispatching function will retrieve the provided command ID of its respective function along with any arguments and their size from the operator.

![PIPEDANCE dispatching function](/assets/images/twice-around-the-dance-floor-with-pipedance/image23.jpg)

The parsing function passes an 8-byte structure consisting of the command instruction and the buffer size for the command argument. The command argument is decrypted using the previous RC4 key, then written back to the pipe.

![PIPEDANCE parsing function](/assets/images/twice-around-the-dance-floor-with-pipedance/image20.jpg)

Once the command ID has been received, PIPEDANCE performs several conditional checks using if/else and switch statements.

![PIPEDANCE conditional checks](/assets/images/twice-around-the-dance-floor-with-pipedance/image24.jpg)

The majority of the command functions return a result flag or error code to the operator. For some functions that may return large amounts of data, such as a list of running processes, the malware generates a new named pipe using the hardcoded string described earlier. Then it concatenates the PID of the PIPEDANCE process which sends and receives the data over this pipe.

![PIPEDANCE sending large datasets over a new named pipe](/assets/images/twice-around-the-dance-floor-with-pipedance/image9.jpg)

## Command functionality

PIPEDANCE supports more than 20 different functions, each accessed using their command ID via if/then and switch/case logic. Below is an example of the first 4 functions.

![Sample of PIPEDANCE functions](/assets/images/twice-around-the-dance-floor-with-pipedance/image26.jpg)

### Command handling table

| Command ID | Description                                                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| 0x1        | Terminates process based on provided PID                                                             |
| 0x2        | Run a single command through cmd.exe, returns output                                                 |
| 0x3        | Terminal shell using stdin/stdout redirection through named pipes                                    |
| 0x4        | File enumeration on current working directory                                                        |
| 0x6        | Create a new file with content from pipe                                                             |
| 0x7        | Retrieve current working directory                                                                   |
| 0x8        | Set current working directory                                                                        |
| 0x9        | Get running processes                                                                                |
| 0x16       | Perform injection (thread hijacking or Heaven’s Gate) with stdin/stdout option for the child process |
| 0x18       | Perform injection from hardcoded list (thread hijacking or Heaven’s Gate)                            |
| 0x1A       | Perform injection on provided PID (thread hijacking or Heaven’s Gate)                                |
| 0x3E       | Clear out global variable/pipe data                                                                  |
| 0x47       | Connectivity check via HTTP Get Request                                                              |
| 0x48       | Connectivity check via DNS with providing DNS Server IP                                              |
| 0x49       | Connectivity check via ICMP                                                                          |
| 0x4A       | Connectivity check via TCP                                                                           |
| 0x4B       | Connectivity check via DNS without providing DNS Server IP                                           |
| 0x63       | Disconnect pipe, close handle, exit thread                                                           |
| 0x64       | Disconnect pipe, close handle, exit process, exit thread                                             |

In order to detail the significant capabilities of PIPEDANCE, we’ve split our analysis into three sections:

- Standard backdoor functionality
- Network connectivity checks
- Process Injection techniques

### Backdoor functionality

PIPEDANCE offers various interactive backdoor capabilities needed by an operator in order to perform reconnaissance, and pivot through different systems.

#### Command execution

There are two functions related to command execution, **Function 0x2** and **0x3**. The first method ( **Function 0x2** ) accepts a command argument from the terminal, such as **ipconfig**. This function starts by creating an anonymous named pipe with read and write handles. Before creating the process, PIPEDANCE will configure the **STARTUPINFO** structure using **STARTF_USESTDHANDLES** to pipe the command output ( **hStdOutput** ) for the new process.

![Configuring the STARTUPINFO structure](/assets/images/twice-around-the-dance-floor-with-pipedance/image22.jpg)

A thread is then created passing the previous read pipe handle as an argument. Memory is allocated for the command output and read from this read pipe handle. The data is then looped over and encrypted in a similar manner as before and sent back through a new named pipe. In our example, this is the data from the **ipconfig** command.

![PIPEDANCE reading in the command output](/assets/images/twice-around-the-dance-floor-with-pipedance/image12.jpg)

The second execution command ( **Function 0x3** ) creates a new **cmd.exe** process in a suspended state and also leverages **STARTF_USESTDHANDLES** as before.

![PIPEDANCE sets up cmd.exe execution through STDIN/STDOUT](/assets/images/twice-around-the-dance-floor-with-pipedance/image25.jpg)

After the process is created, a new thread is created passing the **STARTUPINFO** where two named pipe server processes are created for input and output and the thread is resumed.

![PIPEDANCE processing STDIN/STDOUT for command execution](/assets/images/twice-around-the-dance-floor-with-pipedance/image15.jpg)

This functionality operates similarly to a reverse shell, where the attacker has the ability to directly interact and pass data back and forth.

#### Discovery and enumeration

PIPEDANCE has built-in functionality related to discovery and enumeration. For process enumeration ( **Function 0x9** ), it leverages the **CreateToolhelp32Snapshot** function to retrieve the process details. The function returns the process ID, the name of the process, the architecture of the process, whether a process is tied to a system (Session represented as a **0** ) or user session (Session represented as a **1** ), and the username associated with the process.

![PIPEDANCE performing process enumeration](/assets/images/twice-around-the-dance-floor-with-pipedance/image3.jpg)

Interestingly, in our observations with a few different modules, the results are mangled by the developer due to formatting the data with the C runtime library function **vsprintf_s** when working with Unicode data. This can be observed below in the process discovery module where the process name output gets mangled whereas PIPEDANCE only returns the first character of the process, architecture, and usernames. Below is the output table returned to the operator. In this example, PID **564** with a (mangled) “Name” of **w** is actually PID **564** with a full process name of **winlogon.exe** , a full architecture name of **x86** , a session ID of **1** , and a full user name of **NT AUTHORITY\SYSTEM** , etc.

![Table of PIPEDANCE's enumeration output](/assets/images/twice-around-the-dance-floor-with-pipedance/pipedance-table.jpg)

PIPEDANCE implements a terminal-like concept where it has a current or working directory for its process. This enables the adversary to use functions directly tied to the working directory, such as the file enumeration modules.

For file enumeration, PIPEDANCE will use a wildcard to pull back a file listing from the current working directory.

![PIPEDANCE performs file and directory enumeration](/assets/images/twice-around-the-dance-floor-with-pipedance/image14.jpg)

PIPEDANCE also offers functionality for creating files and writing content to files on the victim machine ( **Function 0x6** ). It does this by first creating and naming a file on the victim machine, then it creates a new thread with a new instance of a named pipe that will then wait for and read incoming data over the pipe. This data is XOR’d with the previous RC4 key and then written to the file.

![PIPEDANCE creates and writes a file on the victim machine](/assets/images/twice-around-the-dance-floor-with-pipedance/image6.jpg)

PIPEDANCE also has various administrator or maintenance commands used to terminate processes, terminate threads, disconnect pipes, clear global variables from memory, etc.

### Network connectivity checks

As adversaries pivot and move through a network, one of their objectives is understanding where the endpoint sits inside the network and determining what protocols are available for shipping data laterally or externally. PIPEDANCE is specifically built to identify exit points on an endpoint by checking DNS, ICMP, TCP, and HTTP protocols.

![PIPEDANCE performing protocol connectivity checks](/assets/images/twice-around-the-dance-floor-with-pipedance/image5.jpg)

As an example, PIPEDANCE will make a DNS request to bing[.]com when providing a DNS server as an argument, the result of the query will be returned back to the operator indicating success or not. For ICMP, PIPEDANCE will generate fake data for the ICMP request by looping over the alphabet and sending it to a provided IP address.

![PIPEDANCE performing ICMP checks](/assets/images/twice-around-the-dance-floor-with-pipedance/image10.jpg)

![PIPEDANCE generating ICMP data from the US alphabet](/assets/images/twice-around-the-dance-floor-with-pipedance/image7.jpg)

Similarly for HTTP, the operator can provide a domain where PIPEDANCE will perform a vanilla HTTP GET request over port 80 and then return a boolean value for success or not.

![PIPEDANCE performing an HTTP check](/assets/images/twice-around-the-dance-floor-with-pipedance/image4.jpg)

These are straightforward functions, but they provide great insight into the developer’s mindset and the type of objectives they are trying to achieve. These checks are likely used in a multi-stage process where these protocols are verified first in a lightweight method then additional shellcode/payloads are launched afterward.

### Process injection techniques

In a similar fashion to many post-exploitation frameworks, PIPEDANCE leverages different forms of process injection to execute shellcode and launch additional implants. Depending on the process architecture, the malware will perform injection using a standard thread execution hijacking technique or the [Heaven’s Gate technique](https://www.zdnet.com/article/malware-authors-are-still-abusing-the-heavens-gate-technique/).

![PIPEDANCE performing process injection](/assets/images/twice-around-the-dance-floor-with-pipedance/image16.jpg)

PIPEDANCE utilizes defense evasions to obscure their activity by randomly picking a Windows program from a hardcoded list to use as an injection target.

This method generates a seed value based on the current time and passes it to a pseudorandom number generator that returns a value between 0 and 5. This value determines which of 6 hard-coded binaries ( **makecab.exe** , **typeperf.exe** , **w32tm.exe** , **bootcfg.exe** , **diskperf.exe** , **esentutl.exe** ) is used.

![Hardcoded binaries that PIPEDANCE can use as injection targets](/assets/images/twice-around-the-dance-floor-with-pipedance/image1.jpg)

Below is an example of the Windows APIs used with the thread hijacking technique when PIPEDANCE is running under a 32-bit architecture.

![PIPEDANCE performs thread hijacking](/assets/images/twice-around-the-dance-floor-with-pipedance/image11.jpg)

If the processor architecture is 64-bit, PIPEDANCE will use the Heaven’s Gate technique calling Native API functions ( **NtGetContextThread** , **NtWriteVirtualMemory** , **RtlCreateUserThread** ), switching the CPU to 64-bit, and executing shellcode.

![PIPEDANCE using Heaven’s Gate for 64-bit architectures](/assets/images/twice-around-the-dance-floor-with-pipedance/image21.jpg)

![PIPEDANCE calling NtWriteVirtualMemory for injection](/assets/images/twice-around-the-dance-floor-with-pipedance/image8.jpg)

PIPEDANCE also supports other methods of injection using **CreateRemoteThread** or through a Heaven’s Gate call to **RtlCreateUserThread**. With this function, instead of choosing from the previously hardcoded list, the operator provides the PID for the injection target.

![PIPEDANCE allowing operator-supplied injection targets](/assets/images/twice-around-the-dance-floor-with-pipedance/image13.jpg)

## Summary

PIPEDANCE is designed to conduct covert operations using named pipes and has various features to enable the post-compromise stage. In terms of capabilities, it reminds us of an offensive attack framework's SMB module, but with its own customization. While leveraging named pipes is not a novel technique, it's interesting to see how it's been implemented as a command and control internal proxy and represents an in-house development capability.

## Detection logic

### Prevention

- Memory Threat Prevent Alert: Shellcode Injection

### Detection

- [Suspicious Windows Service Execution](https://github.com/elastic/endpoint-rules/blob/main/rules/privilege_escalation_suspicious_services_child.toml)
- [NullSessionPipe Registry Modification](https://www.elastic.co/guide/en/security/current/nullsessionpipe-registry-modification.html)
- [Potential Lateral Tool Transfer via SMB Share](https://www.elastic.co/guide/en/security/master/potential-lateral-tool-transfer-via-smb-share.html)

#### Hunting queries

The events for both KQL and EQL are provided with the Elastic Agent using the Elastic Defend integration. Hunting queries could return high signals or false positives. These queries are used to identify potentially suspicious behavior, but an investigation is required to validate the findings.

##### KQL queries

Using the Discover app in Kibana, the below query will identify network connections coming from the hardcoded injection targets within PIPEDANCE.

```
process.name:("makecab.exe" or "typeperf.exe" or  "w32tm.exe" or "bootcfg.exe" or "diskperf.exe" or "esentutl.exe") and event.dataset: endpoint.events.network
```

#### YARA

Elastic Security has created a [YARA rule](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_PipeDance.yar) to identify this activity. Below is the YARA rule to identify PIPEDANCE.

```
rule Windows_Trojan_PipeDance {
    meta:
        author = "Elastic Security"
        creation_date = "2023-02-02"
        last_modified = "2023-02-02"
        os = "Windows"
        arch = "x86"
        category_type = "Trojan"
        family = "PipeDance"
        threat_name = "Windows.Trojan.PipeDance"
        license = "Elastic License v2"
    strings:
        $str1 = "%-5d %-30s %-4s %-7d %s" wide fullword
        $str2 = "PID   Name                           Arch Session User" wide fullword
        $str3 = "%s %7.2f B" wide fullword
        $str4 = "\\\\.\\pipe\\%s.%d" ascii fullword
        $seq_rc4 = { 8D 46 ?? 0F B6 F0 8A 14 3E 0F B6 C2 03 C1 0F B6 C8 89 4D ?? 8A 04 0F 88 04 3E 88 14 0F 0F B6 0C 3E 0F B6 C2 03 C8 0F B6 C1 8B 4D ?? 8A 04 38 30 04 0B 43 8B 4D ?? 3B 5D ?? 72 ?? }
        $seq_srv_resp = { 8B CE 50 6A 04 5A E8 ?? ?? ?? ?? B8 00 04 00 00 8D 4E ?? 50 53 8B D0 E8 ?? ?? ?? ?? B8 08 02 00 00 8D 8E ?? ?? ?? ?? 50 57 8B D0 E8 ?? ?? ?? ?? }
        $seq_cmd_dispatch = { 83 FE 29 0F 87 ?? ?? ?? ?? 0F 84 ?? ?? ?? ?? 83 FE 06 0F 87 ?? ?? ?? ?? 0F 84 ?? ?? ?? ?? 8B C6 33 D2 2B C2 0F 84 ?? ?? ?? ?? 83 E8 01 }
        $seq_icmp = { 59 6A 61 5E 89 45 ?? 8B D0 89 5D ?? 2B F0 8D 04 16 8D 4B ?? 88 0A 83 F8 77 7E ?? 80 E9 17 88 0A 43 42 83 FB 20 }
    condition:
        4 of ($str*) or 2 of ($seq*)
}
```

## Observed adversary tactics and techniques

Elastic uses the MITRE ATT&CK framework to document common tactics, techniques, and procedures that advanced persistent threats use against enterprise networks.

### Tactics

Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.

- [Reconnaissance](https://attack.mitre.org/tactics/TA0043/)
- [Execution](https://attack.mitre.org/tactics/TA0002)
- [Defense evasion](https://attack.mitre.org/tactics/TA0005)
- [Discovery](https://attack.mitre.org/tactics/TA0007)
- [Lateral movement](https://attack.mitre.org/tactics/TA0008/)
- [Collection](https://attack.mitre.org/tactics/TA0009)
- [Command and control](https://attack.mitre.org/tactics/TA0011/)
- [Exfiltration](https://attack.mitre.org/tactics/TA0010/)

### Techniques / Sub techniques

Techniques and Sub techniques represent how an adversary achieves a tactical goal by performing an action.

- [Gather victim network information](https://attack.mitre.org/techniques/T1590/)
- [File and directory discovery](https://attack.mitre.org/techniques/T1083/)
- [Process discovery](https://attack.mitre.org/techniques/T1057/)
- [Process injection: thread execution hijacking](https://attack.mitre.org/techniques/T1055/003/)
- [Token impersonation/theft](https://attack.mitre.org/techniques/T1134/001/)
- [Lateral tool transfer](https://attack.mitre.org/techniques/T1570/)
- [Internal proxy](https://attack.mitre.org/techniques/T1090/001/)
- [Inter-Process communication](https://attack.mitre.org/techniques/T1559/)
- [Application layer protocol](https://attack.mitre.org/techniques/T1071/)
- [Obfuscated files or information](https://attack.mitre.org/techniques/T1027)
- [Create or modify system process: Windows service](https://attack.mitre.org/techniques/T1543/003/)

## Observables

All observables are also available for [download](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltf10ee41eec4f6caf/63fcd87852820c02597c04f3/1326-indicators.zip) in both ECS and STIX format in a combined zip bundle.

The following observables were discussed in this research.

| Indicator                                                        | Type    | Reference                       |
| ---------------------------------------------------------------- | ------- | ------------------------------- |
| 9d3f739e35182992f1e3ade48b8999fb3a5049f48c14db20e38ee63eddc5a1e7 | SHA-256 | PIPEDANCE server-side component |
| 805a4250ec1f6b99f1d5955283c05cd491e1aa378444a782f7bd7aaf6e1e6ce7 | SHA-256 | Cobalt Strike beacon            |
| exl.officeappsreviews[.]com/lanche-334e58sfj4eeu7h4dd3sss32d     | URL     | Cobalt Strike C2 server         |
