---
title: "The DPRK strikes using a new variant of RUSTBUCKET"
slug: "DPRK-strikes-using-a-new-variant-of-rustbucket"
date: "2023-07-14"
subtitle: "A DPRK campaign using a new variant of the RUSTBUCKET malware is underway with updated capabilities and reduced signature detection."
description: "Watch out! We’ve recently discovered a variant of RUSTBUCKET. Read this article to understand the new capabilities we’ve observed, as well as how to identify it in your own network."
author:
- slug: salim-bitam
- slug: ricardo-ungureanu
- slug: colson-wilhoit
- slug: seth-goodwin
- slug: andrew-pease
image: "photo-edited-12@2x.jpg"
category:
- slug: attack-pattern
- slug: activity-group
tags:
- ref9135
- rustbucket
- dprk
- bluenoroff
- cryptocurrency
- apt38
---
## Key takeaways
- The RUSTBUCKET malware family is in an active development phase, adding built-in persistence and focusing on signature reduction.
- REF9135 actors are continually shifting their infrastructure to evade detection and response.
- The DPRK continues financially motivated attacks against cryptocurrency service providers.
- If you are running Elastic Defend, you are protected from REF9135


## Preamble
The Elastic Security Labs team has detected a new variant of the RUSTBUCKET malware, a family that has been previously attributed to the BlueNorOff group by [Jamf Threat Labs](https://www.jamf.com/blog/bluenoroff-apt-targets-macos-rustbucket-malware/) in April 2023.

This variant of RUSTBUCKET, a malware family that targets macOS systems, adds persistence capabilities not previously observed and, at the time of reporting, is undetected by VirusTotal signature engines. Elastic Defend behavioral and prebuilt detection rules provide protection and visibility for users. We have also released a signature to prevent this malware execution.

The research into REF9135 used host, binary, and network analysis to identify and attribute intrusions observed by this research team, and other intelligence groups, with high confidence to the Lazarus Group; a cybercrime and espionage organization operated by the Democratic People’s Republic of North Korea (DPRK).

This research will describe:

- REF9135’s use of RUSTBUCKET for sustained operations at a cryptocurrency payment services provider
- Reversing of an undetected variant of RUSTBUCKET that adds a built-in persistence mechanism
- How victimology, initial infection, malware, and network C2 intersections from first and third-party collection align with previous Lazarus Group reporting


## RUSTBUCKET code analysis


### Overview
Our research has identified a persistence capability not previously seen in the RUSTBUCKET family of malware, leading us to believe that this family is under active development. Additionally, at the time of publication, this new variant has zero detections on VirusTotal and is leveraging a dynamic network infrastructure methodology for command and control.



![Execution flow of REF9135](/assets/images/DPRK-strikes-using-a-new-variant-of-rustbucket/image1.jpg)

### Stage 1
During Stage 1, the process begins with the execution of an AppleScript utilizing the **%2Fusr%2Fbin%2Fosascript** command. This AppleScript is responsible for initiating the download of the Stage 2 binary from the C2 using cURL. This session includes the string **pd** in the body of the HTTP request and **cur1-agent** as the User-Agent string which saves the Stage 2 binary to **%2Fusers%2Fshared%2F.pd,** ([7887638bcafd57e2896c7c16698e927ce92fd7d409aae698d33cdca3ce8d25b8](https://www.virustotal.com/gui/file/7887638bcafd57e2896c7c16698e927ce92fd7d409aae698d33cdca3ce8d25b8)).



![Stage 1 command line](/assets/images/DPRK-strikes-using-a-new-variant-of-rustbucket/image2.jpg)

### Stage 2
The Stage 2 binary ( **.pd** ) is compiled in Swift and operates based on command-line arguments. The binary expects a C2 URL to be provided as the first parameter when executed. Upon execution, it invokes the **downAndExec** function, which is responsible for preparing a POST HTTP request. To initiate this request, the binary sets the User-Agent string as **mozilla%2F4.0 (compatible; msie 8.0; windows nt 5.1; trident%2F4.0)** and includes the string **pw** in the body of the HTTP request.



![Setting the HTTP parameters before sending the request](/assets/images/DPRK-strikes-using-a-new-variant-of-rustbucket/image12.jpg)

During execution, the malware utilizes specific macOS APIs for various operations. It begins with [NSFileManager's](https://developer.apple.com/documentation/foundation/nsfilemanager) **temporaryDirectory** function to obtain the current temporary folder, then generates a random UUID using [NSUUID's](https://developer.apple.com/documentation/foundation/nsuuid) **UUID.init** method. Finally, the malware combines the temporary directory path with the generated UUID to create a unique file location and writes the payload to it.

Once the payload, representing Stage 3 of the attack is written to disk, the malware utilizes [NSTask](https://developer.apple.com/documentation/foundation/nstask) to initiate its execution.



![Generating the Stage 3 file path](/assets/images/DPRK-strikes-using-a-new-variant-of-rustbucket/image11.jpg)

### Stage 3
In Stage 3, the malware ([9ca914b1cfa8c0ba021b9e00bda71f36cad132f27cf16bda6d937badee66c747](https://www.virustotal.com/gui/file/9ca914b1cfa8c0ba021b9e00bda71f36cad132f27cf16bda6d937badee66c747)) is a FAT macOS binary that supports both ARM and Intel architectures written in Rust. It requires a C2 URL to be supplied as a parameter.

The malware initiates its operations by dynamically generating a 16-byte random value at runtime. This value serves as a distinctive identifier for the specific instance of the active malware. Subsequently, the malware proceeds to gather comprehensive system information, including:

- Computer name
- List of active processes
- Current timestamp
- Installation timestamp
- System boot time
- Status of all running processes within the system

The malware establishes its initial connection to the C2 server by transmitting the gathered data via a POST request. The request is accompanied by a User-Agent string formatted as **Mozilla%2F4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident%2F4.0)**.

Upon receiving the request, the C2 server responds with a command ID, which serves as an instruction for the malware. The malware is designed to handle only two commands.



#### Command ID 0x31
This command directs the malware to self-terminate.



#### Command ID 0x30
This command enables the operator to upload malicious Mach-O binaries or shell scripts to the system and execute them. The payload is stored in a randomly generated temporary path and created within the current user TMP directory following the naming convention of **`$TMPDIR%2F.\<8 random digits\>`**

Below is a summary of the command structure, indicating the constants, arguments, and payload components for easy comprehension.



![Command structure example](/assets/images/DPRK-strikes-using-a-new-variant-of-rustbucket/image5.jpg)

The malware proceeds by granting execution permissions to the uploaded file using the **chmod** API.

After executing the payload, the malware sends a status update to the server, notifying it of the completed execution, and then sleeps for 60 seconds. Following this delay, the malware loops to collect system information once again and remains in a waiting state, anticipating the arrival of the next command from the server



### The undetected version of RUSTBUCKET
Using code similarities from the sample in our telemetry, we searched VirusTotal and identified an undetected variant of RUSTBUCKET.

As of the publication of this research, the [newly discovered version](https://www.virustotal.com/gui/file/de81e5246978775a45f3dbda43e2716aaa1b1c4399fe7d44f918fccecc4dd500) of the malware has not been flagged by any antivirus engines on VirusTotal. A thorough analysis of the sample brought to light the addition of a new persistence capability and C2 infrastructure. The behavioral rules for Elastic Defend prevent, and Elastic’s prebuilt detection rules identify, this activity. We have also released a signature that will prevent this new variant of RUSTBUCKET.



![VirusTotal results at the time of publication](/assets/images/DPRK-strikes-using-a-new-variant-of-rustbucket/image7.png)

### Persistence
A predominant method utilized by malware to achieve persistence on macOS is through the utilization of LaunchAgents. In macOS, users have individual LaunchAgents folders within their Library directory, enabling them to define code that executes upon each user login. Additionally, a system-level LaunchAgents folder exists, capable of executing code for all users during the login process. Elastic Defend monitors for the creation of LaunchAgents and LaunchDaemons containing malicious or suspicious values as a way to detect these persistence techniques.

In the case of this updated RUSTBUCKET sample, it establishes its own persistence by adding a plist file at the path **`%2FUsers%2F\<user\>%2FLibrary%2FLaunchAgents%2Fcom.apple.systemupdate.plist`** , and it copies the malware’s binary to the following path **`%2FUsers%2F\<user\>%2FLibrary%2FMetadata%2FSystem Update`**.



![File content of plist used for persistence](/assets/images/DPRK-strikes-using-a-new-variant-of-rustbucket/image9.jpg)

There are several elements of the plist file, using standard true%2Ffalse or string values:

- **Label:** The key "Label" specifies the name of the LaunchAgent, which in this case is **com.apple.systemupdate**. This expects a string value.
- **RunAtLoad:** This indicates that the LaunchAgent should execute its associated code immediately upon loading, specifically during system startup or user login. This expects a true%2Ffalse value.
- **LaunchOnlyOnce:** This prevents the malware from being executed multiple times concurrently and expects a true%2Ffalse value.
- **KeepAlive:** This key instructs the system to keep the LaunchAgent running and relaunch it if it terminates unexpectedly. This expects a true%2Ffalse value.
- **ProgramArguments:** The "ProgramArguments" key specifies an array of strings that define the program or script to be executed by the LaunchAgent. This expects a string value and in this case, the LaunchAgent executes the file located at **"`%2FUsers%2F\<user\>%2FLibrary%2FMetadata%2FSystem Update`"** and provides the C2 URL **"https:%2F%2Fwebhostwatto.work[.]gd"** as an argument to the malware.


## RUSTBUCKET and REF9135 analysis


### Overview
The RUSTBUCKET campaign has previously been associated with BlueNorOff by Jamf and Sekoia.io. BlueNorOff is believed to be operating at the behest of the DPRK for the purposes of financial gain in order to ease the strain of global sanctions. BlueNorOff is a sub-unit of the overarching DPRK offensive cyber attack organization, the [Lazarus Group](https://attack.mitre.org/groups/G0032/). The [2016 Bangladesh Bank robbery](https://www.nytimes.com/interactive/2018/05/03/magazine/money-issue-bangladesh-billion-dollar-bank-heist.html) stands out as BlueNorOff's most notorious attack, wherein their objective was to illicitly transfer over $850M from the Federal Reserve Bank of New York account owned by Bangladesh Bank, the central bank of Bangladesh, by exploiting the SWIFT network.



> As an analyst note, if you’re interested in a tremendously verbose and detailed walkthrough of this intrusion, Geoff White and Jean Lee released a 19-part podcast through the [BBC World Service](https://www.bbc.co.uk/programmes/w13xtvg9/episodes/downloads) that is an unbelievable account of this event.

### Networking infrastructure
The persistence mechanism identified previously calls out to **https:%2F%2Fwebhostwatto.work[.]gd**. Third-party research into this URL indicates that 12%2F89 [VirusTotal](https://www.virustotal.com/gui/url/e299c9f2233f025256ab29d53d070a8f94d1c2c1a2b6f3a7c13e16df185e9e32/detection) vendors have identified it as malicious, and it exists within a community collection documenting the [DangerousPassword phishing campaign](https://www.cyfirma.com/outofband/tracking_dangerouspassword_campaign_by_lazarusgroup/).



![VT detections and community collections for https://webhostwatto.work[.]gd](/assets/images/DPRK-strikes-using-a-new-variant-of-rustbucket/image6.png)

VirusTotal [last saw](https://www.virustotal.com/gui/domain/webhostwatto.work.gd/detection) the domain pointing to **104.168.167[.]88**. Which has been specifically identified in a Sekoia.io [blog](https://blog.sekoia.io/bluenoroffs-rustbucket-campaign/) in May as part of BlueNorOff’s RUSTBUCKET campaign.



![Updated RUSTBUCKET IP (104.168.167[.]88) previously identified by Sekoia.io](/assets/images/DPRK-strikes-using-a-new-variant-of-rustbucket/image4.jpg)

Further connecting **webhostwatto.work[.]gd** to DangerousPassword, BlueNorOff, and the DPRK campaigns, this domain shares a TLS leaf certificate fingerprint hash ( **1031871a8bb920033af87078e4a418ebd30a5d06152cd3c2c257aecdf8203ce6** ) with another domain, **companydeck[.]online**.

**companydesk[.]online** is included in the [VirusTotal Graph](https://www.virustotal.com/graph/g6e8b200cfd774d129558fa5715c83d1bc81099f5cd7643719580be988ec01b8f) (VirusTotal account required) for [APT38](https://attack.mitre.org/groups/G0082/), which is also known as DangerousPassword, BlueNorOff, etc.



![Selection from the VirusTotal Graph for DangerousPassword](/assets/images/DPRK-strikes-using-a-new-variant-of-rustbucket/image3.jpg)

DangerousPassword and BlueNorOff are campaigns that have both been previously associated with the DPRK.

Using the IP address (**64.44.141[.]15**) for our initial C2 domain, **crypto.hondchain[.]com**, we uncovered 3 additional C2 domains:

- **starbucls[.]xyz**
- **jaicvc[.]com**
- **docsend.linkpc[.]net** (dynamic DNS domain)

While there are only 5 hosts (4 total domains) registered to the C2 IP address (indicating that this was not a high-capacity hosting server), we looked for additional relationships to increase the association confidence between the domains. To do this, we replicated the same fingerprinting process previously used with **webhostwatto.work[.]gd**. The TLS fingerprint hash for **starbucls[.]xyz** ( **788261d948177acfcfeb1f839053c8ee9f325bd6fb3f07637a7465acdbbef76a** ) is the same fingerprint as **jaicvc[.]com**.

With these two domains having the same TLS fingerprint hash and the fact that they were both registered to the IP address, we were able to cluster these atomic entities, and their siblings, together with high confidence:

- All hosts were registered to **64.44.141[.]15**
- **starbucls[.]xyz** and **crypto.hondchain[.]com** were observed being used by our malware samples
- **starbucls[.]xyz** and **jaicvc[.]com** shared a TLS fingerprint


![Domains registered to REF9135 C2 IP address](/assets/images/DPRK-strikes-using-a-new-variant-of-rustbucket/image8.jpg)

Looking at the “First” column (when they were first observed through 3rd party passive DNS), these hosts are being created rapidly, likely as an attempt to stay ahead of detection efforts by research teams. We are associating the following domains and IP address to the REF9135 campaign with high confidence:

- **starbucls[.]xyz**
- **jaicvc[.]com**
- **crypto.hondchain[.]com**
- **64.44.141[.]15**

We have not observed **docsend.linkpc[.]net** being used with the RUSTBUCKET samples we analyzed. However, its shared IP registration and host siblings lead us to state with a moderate degree of confidence that it is directly related to RUSTBUCKET and REF9135 as C2 infrastructure; and a high degree of confidence that it is malicious (shared infrastructure as part of other campaigns).



### Defense evasion
The campaign owners used techniques to hinder the collection of Stage 2 and Stage 3 binaries by analysts who may have overlooked User-Agent strings in their investigations, as well as internet scanners and sandboxes focused on collecting malicious binaries.

As outlined in the Stage 1 section, there is a specific User-Agent string ( **cur1-agent** ) that is expected when downloading the Stage 2 binary, if you do not use the expected User-Agent, you will be provided with a 405 HTTP response status code (Method Not Allowed).

It also appears that the campaign owners are monitoring their payload staging infrastructure. Using the expected User-Agent for the Stage 3 binary download (**mozilla%2F4.0 (compatible; msie 8.0; windows nt 5.1; trident%2F4.0)**), we were able to collect the Stage 3 binary.

Finally, we observed REF9135 changing its C2 domain once we began to collect the Stage 2 and 3 binaries for analysis. When making subsequent requests to the original server (**crypto.hondchain[.]com**), we received a 404 HTTP response status code (Not Found) and shortly after, a new C2 server was identified (**starbucls[.]xyz**). This could be because we caught the binary before it was rolled off as part of a normal operational security practice (don’t leave your valuable payload attached to the Internet to be discovered) or because they observed a connection to their infrastructure that was not from their targeted network.

Of note, while the User-Agent strings above could initially appear to be the default cURL or Firefox User-Agents strings to an analyst, they are not. The default cURL User-Agent string is **curl%2Fversion.number** whereas the malware uses **cur1-agent** (using a **1** in place of the **l** in “curl”). Additionally, the “Firefox” string is all lowercase (**mozilla%2F4.0 (compatible; msie 8.0; windows nt 5.1; trident%2F4.0)**), unlike actual [Firefox User-Agent strings](https://www.useragentstring.com/pages/Firefox/) which are camel-cased.

This requirement to download payloads allows the attackers to restrict distribution to only requestors who know the correct UA string. This provides strong protection against both scanning services and researchers, who would otherwise have early access to hosted malicious files for analysis and detection engineering.



### Victimology
The REF9135 victim is a venture-backed cryptocurrency company providing services to businesses such as payroll and business-to-business transactions with a headquarters in the United States. This victim fits the mold from prior reporting on BlueNorOff targeting organizations with access to large amounts of cryptocurrency for theft.



## Observed adversary tactics and techniques
Elastic uses the MITRE ATT&CK framework to document common tactics, techniques, and procedures that advanced persistent threats use against enterprise networks.



### Tactics
Tactics represent the why of a technique or sub-technique. It is the adversary’s tactical goal: the reason for performing an action.

- [Initial access](https://attack.mitre.org/tactics/TA0001)
- [Execution](https://attack.mitre.org/tactics/TA0002)
- [Defense evasion](https://attack.mitre.org/tactics/TA0005)
- [Discovery](https://attack.mitre.org/tactics/TA0007)
- [Lateral movement](https://attack.mitre.org/tactics/TA0008/)
- [Command and control](https://attack.mitre.org/tactics/TA0011)


## Diamond model
Elastic Security utilizes the [Diamond Model](https://www.activeresponse.org/wp-content/uploads/2013/07/diamond.pdf) to describe high-level relationships between adversaries, capabilities, infrastructure, and victims of intrusions. While the Diamond Model is most commonly used with single intrusions, and leveraging Activity Threading (section 8) as a way to create relationships between incidents, an adversary-centered (section 7.1.4) approach allows for a, although cluttered, single diamond.



![REF9135 Diamond Model](/assets/images/DPRK-strikes-using-a-new-variant-of-rustbucket/image13.jpg)

## Detection logic


### Prevention
- [MacOS.Trojan.RustBucket](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/MacOS_Trojan_RustBucket.yar)
- [Persistence via Suspicious Launch Agent or Launch Daemon](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/persistence_persistence_via_suspicious_launch_agent_or_launch_daemon.toml)


### Hunting queries
The events for EQL are provided with the Elastic Agent using the Elastic Defend integration. Hunting queries could return high signals or false positives. These queries are used to identify potentially suspicious behavior, but an investigation is required to validate the findings.



#### EQL queries
Using the Timeline section of the Security Solution in Kibana under the “Correlation” tab, you can use the below EQL queries to hunt for behaviors observed in REF9135.

**Suspicious Curl File Download via Osascript**



```
process where process.parent.name : "osascript" and process.name : "curl" and process.args : "-o"
```

 **Suspicious URL as argument to Self-Signed Binary**



```
process where event.type == "start" and event.action == "exec" and 
 process.code_signature.trusted == false and 
 process.code_signature.signing_id regex~ """[A-Za-z0-9\_\s]{2,}\-[a-z0-9]{40}""" and 
 process.args : "http*" and process.args_count <= 3
```

#### YARA
Elastic Security has created YARA rules to identify this activity. Below are YARA rules to identify the RUSTBUCKET malware:



```
 rule MacOS_Trojan_RustBucket {
    meta:
        author = "Elastic Security"
        creation_date = "2023-06-26"
        last_modified = "2023-06-26"
        license = "Elastic License v2"
        os = "MacOS"
        arch = "x86"
        category_type = "Trojan"
        family = "RustBucket"
        threat_name = "MacOS.Trojan.RustBucket"
        reference_sample = "9ca914b1cfa8c0ba021b9e00bda71f36cad132f27cf16bda6d937badee66c747"
        severity = 100

    strings:
        $user_agent = "User-AgentMozilla/4.0 (compatible; MSIE 8.0; Windows NT 5.1; Trident/4.0)"
        $install_log = "/var/log/install.log"
        $timestamp = "%Y-%m-%d %H:%M:%S"
    condition:
        all of them
}
```

## References
The following were referenced throughout the above research:

- [https:%2F%2Fwww.jamf.com%2Fblog%2FBlueNorOff-apt-targets-macos-rustbucket-malware%2F](https://www.jamf.com/blog/bluenoroff-apt-targets-macos-rustbucket-malware/)
- [https:%2F%2Fblog.sekoia.io%2FBlueNorOffs-rustbucket-campaign%2F](https://blog.sekoia.io/bluenoroffs-rustbucket-campaign/)


## Observations
All observables are also available for [download](https://github.com/elastic/labs-releases/tree/main/indicators/rustbucket) in both ECS and STIX format in a combined zip bundle.

The following observables were discussed in this research.

| Observable | Type | Name | Reference |
| --- | --- | --- | --- |
| webhostwatto.work[.]gd | Domain | N%2FA | REF9135 C2 domain |
| crypto.hondchain[.]com | Domain | N%2FA | REF9135 C2 domain |
| starbucls[.]xyz | Domain | N%2FA | REF9135 C2 domain |
| jaicvc[.]com | Domain | N%2FA | REF9135 C2 domain |
| docsend.linkpc[.]net | Domain | N%2FA | REF9135 C2 domain |
| companydeck[.]online | Domain | N%2FA | Associated by REF9135 TLS fingerprint hash |
| 104.168.167[.]88 | ipv4 | N%2FA | REF9135 C2 IP address |
| 64.44.141[.]15 | ipv4 | N%2FA | REF9135 C2 IP address |
| 788261d948177acfcfeb1f839053c8ee9f325bd6fb3f07637a7465acdbbef76a | x509-certificate | jaicvc[.]com | REF9135 C2 TLS fingerprint hash |
| 1031871a8bb920033af87078e4a418ebd30a5d06152cd3c2c257aecdf8203ce6 | x509-certificate | webhostwatto.work[.]gd | REF9135 C2 TLS fingerprint hash |
| 9ca914b1cfa8c0ba021b9e00bda71f36cad132f27cf16bda6d937badee66c747 | SHA-256 | N%2FA | MacOS.Trojan.RustBucket |
| 7fccc871c889a4f4c13a977fdd5f062d6de23c3ffd27e72661c986fae6370387 | SHA-256 | N%2FA | MacOS.Trojan.RustBucket |
| ec8f97d5595d92ec678ffbf5ae1f60ce90e620088927f751c76935c46aa7dc41 | SHA-256 | N%2FA | MacOS.Trojan.RustBucket |
| de81e5246978775a45f3dbda43e2716aaa1b1c4399fe7d44f918fccecc4dd500 | SHA-256 | ErrorCheck | MacOS.Trojan.RustBucket |
| 4f49514ab1794177a61c50c63b93b903c46f9b914c32ebe9c96aa3cbc1f99b16 | SHA-256 | N%2FA | MacOS.Trojan.RustBucket |
| fe8c0e881593cc3dfa7a66e314b12b322053c67cbc9b606d5a2c0a12f097ef69 | SHA-256 | N%2FA | MacOS.Trojan.RustBucket |
| 7887638bcafd57e2896c7c16698e927ce92fd7d409aae698d33cdca3ce8d25b8 | SHA-256 | %2FUsers%2FShared%2F.pd | Stage 2 |



