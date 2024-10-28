---
title: "ICEDIDs network infrastructure is alive and well"
slug: "icedids-network-infrastructure-is-alive-and-well"
date: "2022-10-31"
description: "Elastic Security Labs details the use of open source data collection and the Elastic Stack to analyze the ICEDID botnet C2 infrastructure."
author:
  - slug: daniel-stepanic
  - slug: seth-goodwin
  - slug: derek-ditch
  - slug: andrew-pease
image: "blog-banner-network-graph-dots.jpg"
category:
  - slug: attack-pattern
tags:
  - malware
  - icedid
  - ref1021
  - bokbot
---

## Key takeaways

- ICEDID is a full-featured trojan that uses TLS certificate pinning to validate C2 infrastructure.
- While the trojan has been tracked for several years, it continues to operate relatively unimpeded.
- A combination of open source collection tools can be used to track the C2 infrastructure.

> For information on the ICEDID configuration extractor and C2 infrastructure validator, check out our posts detailing this:
>
> - [ICEDID configuration extractor](https://www.elastic.co/security-labs/icedid-configuration-extractor)
> - [ICEDID network infrastructure checking utility](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltb86bffd1aef20c5b/6351aba34e565f1cdce29da5/icedid-checker.tar.gz)

## Preamble

[ICEDID](https://malpedia.caad.fkie.fraunhofer.de/details/win.icedid), also known as Bokbot, is a modular banking trojan first discovered in 2017 and has remained active over the last several years. It has been recently known more for its ability to load secondary payloads such as post-compromise frameworks like Cobalt Strike, and has been [linked](https://www.trendmicro.com/en_us/research/21/a/expanding-range-and-improving-speed-a-ransomexx-approach.html) to ransomware activity.

ICEDID is implemented through a multistage process with different components. Initial access is typically gained through phishing campaigns leveraging malicious documents or file attachments.

We’ll be discussing aspects of ICEDID in the next couple of sections as well as exploring our analysis technique in tracking ICEDID infrastructure.

- Initial access
- Command and control
- Persistence
- Core functionality
- Network infrastructure

> As mentioned in the Preamble, ICEDID has been around for many years and has a rich feature set. As the malware has been analyzed multiple times over the years, we are going to focus on some of the more interesting features.

## Initial access

ICEDID infections come in many different forms and have been adjusted using different techniques and novel execution chains to avoid detection and evade antimalware products. In this sample, ICEDID was delivered through a phishing email. The email contains a ZIP archive with an embedded ISO file. Inside the ISO file is a Windows shortcut (LNK) that, when double-clicked, executes the first stage ICEDID loader (DLL file).

![Initial infection - Windows shortcut & DLL](/assets/images/icedids-network-infrastructure-is-alive-and-well/image14.jpg)

The Windows shortcut target value is configured to execute **%windir%\system32\rundll32.exe olasius.dll,PluginInit** calling the **PluginInit** export, which starts the initial stage of the ICEDID infection. This stage is responsible for decrypting the embedded configuration, downloading a GZIP payload from a C2 server, writing an encrypted payload to disk ( **license.dat** ), and transferring execution to the next stage.

![Windows shortcut command-line](/assets/images/icedids-network-infrastructure-is-alive-and-well/image12.jpg)

The first ICEDID stage starts off by deciphering an encrypted configuration blob of data stored within the DLL that is used to hold C2 domains and the campaign identifier. The first 32 bytes represent the XOR key; the encrypted data is then deciphered with this key.

![Configuration decryption function](/assets/images/icedids-network-infrastructure-is-alive-and-well/image11.jpg)

## Command and control

ICEDID constructs the initial HTTP request using cookie parameters that contain hexadecimal data from the infected machine used for fingerprinting the victim machine. This request will proceed to download the GZIP payload irrespective of any previous identifying information.

eSentire has [published research](https://www.esentire.com/blog/esentire-threat-intelligence-malware-analysis-gootloader-and-icedid) that describes in detail how the gads, gat, ga, u, and io cookie parameters are created.

![ICEDID HTTP request](/assets/images/icedids-network-infrastructure-is-alive-and-well/image4.jpg)

Below are the cookie parameters and example associated values behind them.

| Parameter | Example Data                                                                                 | Note                                                                  |
| --------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| \_\_gads  | 3000901376:1:16212:134                                                                       | Contains campaign ID, flag, GetTickCount, number of running processes |
| \_\_gat   | 10.0.19044.64                                                                                | OS version, architecture                                              |
| \_\_ga    | 1.591594.1635208534.76                                                                       | Hypervisor/processor information from CPUID/SwitchToThread function   |
| \_\_u     | 4445534B544F502D4A4B4738455432:6A6F656C2E68656E646572736F6E:33413945354637303742414339393534 | Stores computer name, username, and bot ID                            |
| \_\_io    | 21_3990468985_3832573211_2062024380                                                          | Security Identifier (SID)                                             |
| \_\_gid   | 006869A80704                                                                                 | Encrypted MAC address                                                 |

The downloaded GZIP payload contains a custom structure with a second loader ( **hollow.dat** ) and the encrypted ICEDID core payload ( **license.dat** ). These two files are written to disk and are used in combination to execute the core payload in memory.

![ICEDID writing the second stage loader and payload](/assets/images/icedids-network-infrastructure-is-alive-and-well/image1.jpg)

The next phase highlights a unique element with ICEDID in how it loads the core payload ( **license.dat** ) by using a custom header structure instead of the traditional PE header. Memory is allocated with the sections of the next payload looped over and placed into their own virtual memory space. This approach has been well [documented](https://www.malwarebytes.com/blog/news/2019/12/new-version-of-icedid-trojan-uses-steganographic-payloads) and serves as a technique to obstruct analysis.

![ICEDID loading custom structure (header/sections)](/assets/images/icedids-network-infrastructure-is-alive-and-well/image9.jpg)

Each section has its memory protection modified by the **VirtualProtect** function to enable read-only or read/write access to the committed region of memory using the **PAGE_READWRITE** constant.

![ICEDID using the PAGE_READWRITE constant](/assets/images/icedids-network-infrastructure-is-alive-and-well/image6.jpg)

Once the image entry point is set up, the ICEDID core payload is then loaded by a call to the [rax x86 register](https://www.cs.uaf.edu/2017/fall/cs301/lecture/09_11_registers.html#:~:text=rax%20is%20the%2064%2Dbit,processors%20with%20the%2080386%20CPU.).

![ICEDID loading its core payload](/assets/images/icedids-network-infrastructure-is-alive-and-well/image2.jpg)

## Persistence

ICEDID will attempt to set up persistence first using a scheduled task, if that fails it will instead create a Windows Registry run key. Using the Bot ID and **RDTSC** instruction, a scheduled task or run key name is randomly generated. A scheduled task is created using **taskschd.dll** , configured to run at logon for the user, and is triggered every 1 hour indefinitely.

![ICEDID scheduled task](/assets/images/icedids-network-infrastructure-is-alive-and-well/image17.jpg)

## Core functionality

The core functionality of the ICEDID malware has been well documented and largely unchanged. To learn more about the core payload and functionality, check out the [Malpedia page](https://malpedia.caad.fkie.fraunhofer.de/details/win.icedid) that includes a corpus of completed research on ICEDID.

That said, we counted 23 modules during the time of our analysis including:

- MitM proxy for stealing credentials
- Backconnect module
- Command execution (PowerShell, cmd)
- Shellcode injection
- Collect
  - Registry key data
  - Running processes
  - Credentials
  - Browser cookies
  - System information (network, anti-virus, host enumeration)
- Search and read files
- Directory/file listing on user’s Desktop

## ICEDID configuration extractor

Elastic Security Labs has released an open source tool, under the Apache 2.0 license, that will allow for configurations to be extracted from ICEDID samples. The tool can be downloaded [here](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blt95ce19ae8cffda29/6351abcf20f42038fb989fae/icedid-config-extractor.tar.gz).

![IcedID configuration decryption tool output](/assets/images/icedids-network-infrastructure-is-alive-and-well/image13.jpg)

## TLS certificate pinning

Previous [research](https://research.checkpoint.com/2021/melting-ice-tracking-icedid-servers-with-a-few-simple-steps/) into the ICEDID malware family has highlighted a repetitive way in how the campaigns create their self-signed TLS certificates. Of particular note, this technique for creating TLS certificates has not been updated in approximately 18 months. While speculative in nature, this could be reflective of the fact that this C2 infrastructure is not widely tracked by threat data providers. This allows ICEDID to focus on updating the more transient elements of their campaigns (file hashes, C2 domains, and IP addresses).

The team at Check Point published in-depth and articulate research on tracking ICEDID infrastructure using ICEDID’s TLS certificate pinning feature. Additionally, Check Point [released a script](https://research.checkpoint.com/2021/melting-ice-tracking-icedid-servers-with-a-few-simple-steps/#Appendix-A:~:text=147.228.198%0A91%5B.%5D193.19.251-,Appendix%20A,-Testing%20a%20server) that takes an IP address and port, and validates the suspect TLS serial number against a value calculated by the ICEDID malware to confirm whether or not the IP address is currently using an ICEDID TLS certificate.

We are including a wrapper that combines internet scanning data from Censys, and ICEDID C2 infrastructure conviction from the Check Point script. It can be downloaded [here](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltb86bffd1aef20c5b/6351aba34e565f1cdce29da5/icedid-checker.tar.gz).

### Dataset

As reported by Check Point, the TLS certificate information uses the same Issuer and Subject distinguished names to validate the C2 server before sending any data.

![ICEDID C2 TLS certificate pinning](/assets/images/icedids-network-infrastructure-is-alive-and-well/image7.jpg)

To build our dataset, we used the [Censys CLI tool](https://censys-python.readthedocs.io/en/stable/quick-start.html) to collect the certificate data. We needed to make a slight adjustment to the query from Check Point research, but the results were similar.

```
censys search 'services.tls.certificates.leaf_data.subject_dn:"CN=localhost, C=AU, ST=Some-State, O=Internet Widgits Pty Ltd" and services.tls.certificates.leaf_data.issuer_dn:"CN=localhost, C=AU, ST=Some-State, O=Internet Widgits Pty Ltd" and services.port=443'

[
  {
    "ip": "103.208.85.237",
    "services": [
      {
        "port": 22,
        "service_name": "SSH",
        "transport_protocol": "TCP"
      },
      {
        "port": 80,
        "service_name": "HTTP",
        "transport_protocol": "TCP"
      },
      {
        "port": 443,
        "service_name": "HTTP",
        "certificate": "c5e7d92ba63be7fb2c44caa92458beef7047d7f987aaab3bdc41161b84ea2850",
        "transport_protocol": "TCP"
      }
    ],
    "location": {
      "continent": "Oceania",
      "country": "New Zealand",
      "country_code": "NZ",

…truncated…
```

This provided us with 113 IP addresses that were using certificates we could begin to attribute to ICEDID campaigns.

### JARM / JA3S

When looking at the data from Censys, we also identified other fields that are useful in tracking TLS communications: [JARM](https://github.com/salesforce/jarm) and [JA3S](https://github.com/salesforce/ja3), both TLS fingerprinting tools from the Salesforce team.

At a high-level, JARM fingerprints TLS servers by _actively_ collecting specific elements of the TLS Server Hello responses. JA3S _passively_ collects values from the TLS Server Hello message. JARM and JA3S are represented as a 62-character or 32-character fingerprint, respectively.

![JARM and JA3S TLS fingerprints in Kibana](/assets/images/icedids-network-infrastructure-is-alive-and-well/image16.png)

JARM and JA3S add additional data points that improve our confidence in connecting the ICEDID C2 infrastructure. In our research, we identified **2ad2ad16d2ad2ad22c2ad2ad2ad2adc110bab2c0a19e5d4e587c17ce497b15** as the JARM and **e35df3e00ca4ef31d42b34bebaa2f86e** as the JA3S fingerprints.

> It should be noted that JARM and JA3S are frequently not uncommon enough to convict a host by themselves. As an example, in the Censys dataset, the JARM fingerprint identified over 15k hosts, and the JA3S fingerprint identified over 3.3M hosts. Looking at the JARM and JA3S values together still had approximately 8k hosts. These are data points on the journey to an answer, not the answer itself.

### ICEDID implant defense

Before ICEDID communicates with its C2 server, it performs a TLS certificate check by comparing the certificate serial number with a hash of the certificate's public key. As certificate serial numbers should all be unique, ICEDID uses a self-signed certificate and an expected certificate serial number as a way to validate the TLS certificate. If the hash of the public key and serial number do not match, the communication with the C2 server does not proceed.

![ICEDID certificate validation function](/assets/images/icedids-network-infrastructure-is-alive-and-well/image10.jpg)

We used the Check Point Python script (which returns a **true** or **false** result for each passed IP address) to perform an additional check to improve our confidence that the IP addresses were part of the ICEDID C2 infrastructure and not simply a coincidence in having the same subject and issuer information of the ICEDID TLS certifications. A **true** result has a matching ICEDID fingerprint and a **false** result does not. This resulted in 103 IPs that were confirmed as having an ICEDID TLS certificate and 10 that did not (as of October 14, 2022).

![ICEDID TLS certificate confirmation](/assets/images/icedids-network-infrastructure-is-alive-and-well/image5.jpg)

### Importing into Elasticsearch

Now that we have a way to collect IPs based on the TLS certificate elements and a way to add additional context to aid in conviction; we can wrap the logic in a Bash script as a way to automate this process and parse the data for analysis in Elasticsearch.

```
#!/bin/bash -eu

set -o pipefail

SEARCH='services.tls.certificates.leaf_data.subject_dn:"CN=localhost, C=AU, ST=Some-State, O=Internet Widgits Pty Ltd" and services.tls.certificates.leaf_data.issuer_dn:"CN=localhost, C=AU, ST=Some-State, O=Internet Widgits Pty Ltd" and services.port=443'

while read -r line; do
    _ts=$(date -u +%FT%TZ)
    _ip=$(echo ${line} | base64 -d | jq '.ip' -r)
    _port=$(echo ${line} | base64 -d | jq '.port' -r)
    _view=$(censys view "${_ip}" | jq -c)
    _is_icedid=$(python3 -c "import icedid_checker; print(icedid_checker.test_is_icedid_c2('${_ip}','${_port}'))")

    echo "${_view}" | jq -S --arg is_icedid "${_is_icedid}" --arg timestamp "${_ts}" '. + {"@timestamp": $timestamp, "threat": {"software": {"icedid": {"present": $is_icedid}}}}'
done < <(censys search --pages=-1 "${SEARCH}" | jq '.[] | {"ip": .ip, "port": (.services[] | select(.certificate?).port)} | @base64' -r) | tee icedid_infrastructure.ndjson
```

This outputs the data as an NDJSON document called **icedid_infrastructure.ndjson** that we can upload into Elasticsearch.

![Identified ICEDID IP infrastructure](/assets/images/icedids-network-infrastructure-is-alive-and-well/image8.png)

In the above image, we can see that there are hosts that have the identified JARM fingerprint, the identified TLS issuer and subject elements, but did not pass the Check Point validation check. Additionally, one of the two hosts has a different JA3S fingerprint. This highlights the value of the combination of multiple data sources to inform confidence scoring.

We are also [providing this script](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltb86bffd1aef20c5b/6351aba34e565f1cdce29da5/icedid-checker.tar.gz) for others to use.

## Observed adversary tactics and techniques

Elastic uses the MITRE ATT&CK framework to document common tactics, techniques, and procedures that advanced persistent threats use against enterprise networks.

As stated above, ICEDID has been extensively analyzed, so below we are listing the tactics and techniques that we observed and are covered in this research publication. If you’re interested in the full set of MITRE ATT&CK tactics and techniques, you can check out MITRE’s [page](https://attack.mitre.org/software/S0483/) on ICEDID.

### Tactics

Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.

- [Discovery](https://attack.mitre.org/tactics/TA0007/)
- [Execution](https://attack.mitre.org/tactics/TA0002)
- [Persistence](https://attack.mitre.org/tactics/TA0003)
- [Defense evasion](https://attack.mitre.org/tactics/TA0005)
- [Reconnaissance](https://attack.mitre.org/tactics/TA0043)
- [Resource development](https://attack.mitre.org/tactics/TA0042)
- [Initial access](https://attack.mitre.org/tactics/TA0001)
- [Command and control](https://attack.mitre.org/tactics/TA0011)
- [Privilege Escalation](https://attack.mitre.org/tactics/TA0004)

### Techniques / Sub techniques

Techniques and Sub techniques represent how an adversary achieves a tactical goal by performing an action.

- [Permission Groups Discovery](https://attack.mitre.org/techniques/T1069/)
- [Account Discovery](https://attack.mitre.org/techniques/T1087/)
- [Command and Scripting Interpreter](https://attack.mitre.org/techniques/T1087/)
- [Software Discovery](https://attack.mitre.org/techniques/T1518/)
- [System Binary Proxy Execution](https://attack.mitre.org/techniques/T1218/)
- [Remote System Discovery](https://attack.mitre.org/techniques/T1018/)
- [Network Share Discovery](https://attack.mitre.org/techniques/T1135/)
- [Phishing: Spearphishing attachment](https://attack.mitre.org/techniques/T1566/001)
- [Scheduled Task/Job: Scheduled Task](https://attack.mitre.org/techniques/T1053/005/)
- [Obfuscated Files or Information](https://attack.mitre.org/techniques/T1027/)
- [Process Injection](https://attack.mitre.org/techniques/T1055/)

## Detections and preventions

### Detection logic

- [Enumeration of Administrator Accounts](https://www.elastic.co/guide/en/security/current/enumeration-of-administrator-accounts.html)
- [Command Shell Activity Started via RunDLL32](https://www.elastic.co/guide/en/security/current/command-shell-activity-started-via-rundll32.html)
- [Security Software Discovery using WMIC](https://www.elastic.co/guide/en/security/current/security-software-discovery-using-wmic.html)
- [Suspicious Execution from a Mounted Device](https://www.elastic.co/guide/en/security/current/suspicious-execution-from-a-mounted-device.html)
- [Windows Network Enumeration](https://www.elastic.co/guide/en/security/current/windows-network-enumeration.html)

### Preventions

- Malicious Behavior Detection Alert: Command Shell Activity
- Memory Threat Detection Alert: Shellcode Injection
- Malicious Behavior Detection Alert: Unusual DLL Extension Loaded by Rundll32 or Regsvr32
- Malicious Behavior Detection Alert: Suspicious Windows Script Interpreter Child Process
- Malicious Behavior Detection Alert: RunDLL32 with Unusual Arguments
- Malicious Behavior Detection Alert: Windows Script Execution from Archive File

### YARA

Elastic Security has created [YARA rules](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_IcedID.yar) to identify this activity. Below is a YARA rule specifically to identify the TLS certificate pinning function used by ICEDID.

```
rule Windows_Trojan_IcedID_cert_pinning {
    meta:
        author = "Elastic Security"
        creation_date = "2022-10-17"
        last_modified = "2022-10-17"
        threat_name = "Windows.Trojan.IcedID"
        arch_context = "x86"
        license = "Elastic License v2"
        os = "windows"
    strings:
		$cert_pinning = { 74 ?? 8B 50 ?? E8 ?? ?? ?? ?? 48 8B 4C 24 ?? 0F BA F0 ?? 48 8B 51 ?? 48 8B 4A ?? 39 01 74 ?? 35 14 24 4A 38 39 01 74 ?? }
    condition:
        $cert_pinning
}
```

## References

The following were referenced throughout the above research:

- [https://malpedia.caad.fkie.fraunhofer.de/details/win.icedid](https://malpedia.caad.fkie.fraunhofer.de/details/win.icedid)
- [https://research.checkpoint.com/2021/melting-ice-tracking-icedid-servers-with-a-few-simple-steps/](https://research.checkpoint.com/2021/melting-ice-tracking-icedid-servers-with-a-few-simple-steps/)
- [https://attack.mitre.org/software/S0483/](https://attack.mitre.org/software/S0483/)

## Indicators

The indicators observed in this research are posted below. All artifacts (to include those discovered through TLS certificate pinning) are also [available for download](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/bltc090b3574bb4e7be/633615e4a920fd42f67e7534/ref2731-indicators.zip) in both ECS and STIX format in a combined zip bundle.

| Indicator                                                        | Type      | Note                 |
| ---------------------------------------------------------------- | --------- | -------------------- |
| db91742b64c866df2fc7445a4879ec5fc256319e234b1ac5a25589455b2d9e32 | SHA256    | ICEDID malware       |
| yolneanz[.]com                                                   | domain    | ICEDID C2 domain     |
| 51.89.190[.]220                                                  | ipv4-addr | ICEDID C2 IP address |
