---
title: "Globally distributed stealers"
slug: "globally-distributed-stealers"
date: "2024-05-24"
description: "This article describes our analysis of the top malware stealer families, unveiling their operation methodologies, recent updates, and configurations. By understanding the modus operandi of each family, we better comprehend the magnitude of their impact and can fortify our defences accordingly."
author:
  - slug: salim-bitam
  - slug: daniel-stepanic
  - slug: terrance-dejesus
  - slug: samir-bousseaden
image: "Security Labs Images 25.jpg"
category:
  - slug: malware-analysis
---

## Introduction

This article describes our analysis of the top Windows malware stealer families that we’ve identified, unveiling their operation methodologies, recent updates, and configurations. By understanding the modus operandi of each family, we better comprehend the magnitude of their impact and can fortify our defences accordingly. Additionally, we’ll examine our unique telemetry to offer insights about the current volume associated with these prevalent malware stealer families.

Mitigating this kind of covert threat requires a multi-faceted approach consistent with defense-in-depth principles. We will likewise describe various techniques for detection, including the use of ES|QL hunting queries and Yara rules which empower organizations to proactively defend against them.

## Telemetry overview

The telemetry data showcased in this article encompasses insights gathered from both internal and external sources, providing a comprehensive understanding of threat activity.

Notably, between 2022 and 2023, REDLINE emerged as the most prevalent malware in the wild, closely trailed by AGENT TESLA, VIDAR, and then STEALC. It's worth highlighting that this period marked the debut of STEALC in the wild, indicative of evolving threat landscapes.

In the subsequent time frame, spanning from 2023 to 2024, there was a notable spike in AGENT TESLA activity, followed by REDLINE, STEALC, and VIDAR, reflecting shifting trends in malware prevalence and distribution.

![Telemetry data May 2023 - May 2024](/assets/images/globally-distributed-stealers/image6.png)
Elastic telemetry data May 2023 - May 2024

Despite fluctuations in general malware prevalence, AGENT TESLA has consistently maintained its position as a prominent threat. This enduring dominance can be attributed to several factors, including its relatively low price point and enticing capabilities, which appeal to a wide range of threat actors, particularly those operating with limited resources or expertise.

A noteworthy observation is that due to METASTEALER’s foundation on REDLINE, certain METASTEALER samples may inadvertently fall under the categorization of REDLINE.

![METASTEALER triggering REDLINE signatures](/assets/images/globally-distributed-stealers/image5.png)

## Top stealers overview

### REDLINE (REDLINE STEALER)

[REDLINE](https://malpedia.caad.fkie.fraunhofer.de/details/win.redline_stealer) made its debut in the threat landscape in 2020, leveraging email as its initial distribution method; it operates on a Malware-as-a-Service (MaaS) model, making it accessible to a wide range of threat actors. Its affordability and availability in underground forums have contributed to its popularity among cybercriminals.

The latest operations of REDLINE involve multiple infection vectors, including email phishing, malicious websites hosting seemingly legitimate applications, and social engineering tactics. Our researchers analyzed a recent sample [reported by vx-underground](https://x.com/vxunderground/status/1634713832974172167) indicating a campaign targeting engineers on the freelancing platform Fiverr. This tactic poses significant risks, potentially leading to the compromise of companies through unsuspecting freelancers.

REDLINE is built on the .NET framework, which provides it with portability and ease of implementation. It has a variety of functionalities aimed at gathering vital system information and extracting sensitive data:

 - System information acquisition:
  - Collects essential system details such as UserName, Language, and Time Zone
  - Retrieves hardware specifics including processor and graphic card information
  - Monitors running processes and identifies installed browsers
 - Data extraction:
  - Targets browser data repositories, extracting saved passwords, credit card details, cookies, and auto-fill entries
  - Procures VPN login credentials for unauthorized access
  - Logs user credentials and chat histories from platforms like Discord and Telegram
  - Identifies and steals cryptocurrency wallets, potentially compromising valuable digital assets:

![REDLINE collecting system information](/assets/images/globally-distributed-stealers/image13.png)

REDLINE uses a string obfuscation technique to hinder analysis and evade detection based on strings like yara by dynamically constructing the strings at runtime from an array of characters:

![REDLINE string obfuscation](/assets/images/globally-distributed-stealers/image4.png)

Its configuration is structured within a static class, containing four public fields:  ```IP```,  ```ID```, ```Message```, and an XOR Key. The ```IP``` and ```ID``` fields contents are encrypted using XOR encryption and then encoded in base64 as depicted below:
 
![REDLINE's configuration](/assets/images/globally-distributed-stealers/image3.png)

### METASTEALER

[METASTEALER](https://malpedia.caad.fkie.fraunhofer.de/details/win.metastealer) emerged in 2022, initially advertised as a derivative of REDLINE, with additional features; our malware analysts recently encountered a sample of METASTEALER within a campaign masquerading as Roblox, previously [reported by CERT as Orange Polska](https://x.com/CERT_OPL/status/1767191320790024484). 

METASTEALER is primarily developed using the .NET framework, facilitating its compatibility with Windows environments and enabling ease of implementation. Certain versions employ obfuscation methods, including obscuring the control flow of the malware and making it more challenging to detect or analyze.

This METASTEALER sample utilizes the [AGILE.NET](https://www.secureteam.net/) obfuscator, specifically its proxy call obfuscation method. This technique is used to conceal the direct invocation of an original function by introducing an additional layer of abstraction. Instead of directly invoking the function, AGILE.NET generates a proxy method that then invokes the original function. This added complexity makes it more challenging for code analysts to discern the sequence of actions.

![METASTEALER's obfuscation](/assets/images/globally-distributed-stealers/image9.png)

Looking at the code above, we can see the method `Delegate11.smethod_0` calls a `Delegate11.delegate11_0` which is not initialized, introducing ambiguity during static analysis as analysts cannot determine which method will actually be executed.

![METASTEALER initializing the delegate](/assets/images/globally-distributed-stealers/image14.png)

At runtime, the malware will initialize the delegate. by calling the method `Class4.smethod_13` in the constructor of `Delegate11` class, this method constructs a dictionary of token values, where each key represents the token value of a delegate (e.g., ```0x040002DE```), and its corresponding value represents the token of the original method to be executed. This dictionary is constructed from a sequence of bytes stored in the binary, enabling dynamic resolution of method invocations during runtime.

Following this, it will generate a dynamic method for the delegate and execute it using the `smethod_0` function.

![METASTEALER generating delegates dynamic method](/assets/images/globally-distributed-stealers/image8.png)

![METASTEALER checking for debuggers](/assets/images/globally-distributed-stealers/image7.png)

All the important strings in the configuration, like the C2 IP address and port, are encrypted. The malware has a class called `Strings` that is called at the start of execution to decrypt all the strings at once, a process involving a combination of Base64 encoding, XOR decryption, and AES CBC decryption.

Initially, the AES parameters, such as the ```AES KEY``` and ```AES IV```, undergo decryption. In the provided example, the ```AES KEY``` and ```AES IV``` are first base64 decoded. Subsequently, they are subjected to XOR decryption using a predetermined XOR key, followed by two consecutive base64 decoding steps.

![Encrypted AES parameters](/assets/images/globally-distributed-stealers/image1.png)

The Strings class holds byte arrays that are decrypted using AES CBC after being reversed, and then appended to the **Strings.Array** list. Later, when the malware requires specific strings, it accesses them by indexing this list. For example **String.get(6)**.

### STEALC

A recent major player in the stealer space [discovered](https://blog.sekoia.io/stealc-a-copycat-of-vidar-and-raccoon-infostealers-gaining-in-popularity-part-1/) by Sekoia in February 2023 is the [STEALC](https://malpedia.caad.fkie.fraunhofer.de/details/win.stealc) family. This malware was first advertised in an underground forum in January 2023 where the developer mentioned a major dependency on existing families such as VIDAR, RACOON, and REDLINE. Since this timeframe, our team has observed new STEALC samples daily showing signs of popularity and adoption by cybercriminals.

STEALC is implemented in C and includes features like dynamic imports, string obfuscation, and various anti-analysis checks prior to activating its data-stealing capabilities. In order to protect the binary and its core features, STEALC encrypts its strings using a combination of Base64 + RC4 using a hardcoded key embedded in each sample.

![Embedded RC4 key and encrypted strings within STEALC](/assets/images/globally-distributed-stealers/image10.png)

There are 6 separate functions used for anti-analysis/anti-sandbox checks within STEALC. Based on the number of processors, STEALC will terminate itself if the active processor count is less than 2.

![Retrieve number of processors](/assets/images/globally-distributed-stealers/image2.png)

STEALC performs a sandbox/emulation test using a more obscure Windows API (`VirtualAllocExNuma`) to allocate a large amount of memory. If the API is not implemented, the process will terminate.

![API check using VirtualAllocExNuma](/assets/images/globally-distributed-stealers/image15.png)

The malware performs another sandbox check by reading values from `GlobalMemoryStatusEx`. After a byte shift against the collected attributes of the physical memory, if the value is less than ```0x457``` the sample will terminate. 

The malware will stop execution if the language identifier matches one of the following LangIDs:
 - Russian_Russia  (```0x419```)
 - Ukrainian_Ukraine  (```0x422```)
 - Belarusian_Belarus (```0x423```)
 - Kazakh_Kazakhstan (```0x43f```)
 - Uzbek_Latin__Uzbekistan (```0x443```)

STEALC also incorporates the Microsoft Defender emulation check, we have observed this in many stealers such as seen in [LOBSHOT](https://www.elastic.co/security-labs/elastic-security-labs-discovers-lobshot-malware). STEALC will terminate if the following hard-coded values match inside Microsoft Defender’s emulation layer with the username ```JohnDoe``` and computer name of ```HAL9TH```.

![Microsoft Defender emulation check using computer name and username](/assets/images/globally-distributed-stealers/image12.png)

One of the more impactful anti-analysis checks that comes with STEALC is an expiration date. This unique value gets placed into the malware’s config to ensure that the stealer won’t execute after a specific date set by the builder. This allows the malware to keep a lower profile by using shorter turnarounds in campaigns and limiting the execution in sandbox environments.

#### STEALC - Execution flow

After its initial execution, STEALC will send the initial hardware ID of the machine and receive a configuration from the C2 server:

```
f960cc969e79d7b100652712b439978f789705156b5a554db3acca13cb298050efa268fb|done|tested.file|1|1|1|1|1|1|1|1|
```

After this request, it will send multiple requests to receive an updated list of targeted browsers and targeted browser extensions. Below is an example of the browser configuration, this contains the targeted directory path where the sensitive data is stored.

```
Google Chrome|\Google\Chrome\User Data|chrome|chrome.exe|Google Chrome Canary|\Google\Chrome SxS\User Data|chrome|chrome.exe|Chromium|\Chromium\User Data|chrome|chrome.exe|Amigo|\Amigo\User Data|chrome|0|Torch|\Torch\User Data|chrome|0|Vivaldi|\Vivaldi\User Data|chrome|vivaldi.exe|Comodo Dragon|\Comodo\Dragon\User Data|chrome|0|EpicPrivacyBrowser|\Epic Privacy Browser\User Data|chrome|0|CocCoc|\CocCoc\Browser\User Data|chrome|0|Brave|\BraveSoftware\Brave-Browser\User Data|chrome|brave.exe|Cent Browser|\CentBrowser\User Data|chrome|0|7Star|\7Star\7Star\User Data|chrome|0|Chedot Browser|\Chedot\User Data|chrome|0|Microsoft Edge|\Microsoft\Edge\User Data|chrome|msedge.exe|360 Browser|\360Browser\Browser\User Data|chrome|0|QQBrowser|\Tencent\QQBrowser\User Data|chrome|0|CryptoTab|\CryptoTab Browser\User Data|chrome|browser.exe|Opera Stable|\Opera Software|opera|opera.exe|Opera GX Stable|\Opera Software|opera|opera.exe|Mozilla Firefox|\Mozilla\Firefox\Profiles|firefox|0|Pale Moon|\Moonchild Productions\Pale Moon\Profiles|firefox|0|Opera Crypto Stable|\Opera Software|opera|opera.exe|Thunderbird|\Thunderbird\Profiles|firefox|0|
```

At this point, STEALC will then collect a broad range of victim information. This information is then formatted, Base64 encoded, and then sent to the C2 server over POST requests using form data fields. 
 - Hardware ID
 - Windows OS product info
 - Processor / RAM information
 - Username / computername
 - Local system time / time zone / locale of victim
 - Keyboard layout
 - Battery check (used to determine if laptop or not)
 - Desktop resolution, display info
 - Installed programs, running processes

For the stealing component, STEALC leverages the received configurations in order to collect various valuable information including:
 - Browser cookies
 - Login data
 - Web data
 - History
 - Cryptocurrency wallets

STEALC also offers other various configuration options including:
 - Telegram data
 - Discord
 - Tox
 - Pidgin
 - Steam
 - Outlook emails

|  | RedLine Stealer | Meta Stealer | Stealc |
| --- | --- | --- | --- |
| First time seen in the wild | 2020 | 2022 | 2023 |
| Source Language | C# | C# | C |
| Average size (unpacked) | 253 KB | 278 KB | 107 KB |
| String obfuscation? Algo? | Yes | Yes | Yes (custom RC4 + base64) |


## Detection

To fully leverage detection capabilities listed below for these threats with Elastic Security, it is essential to integrate [Elastic Defend](https://docs.elastic.co/en/integrations/endpoint) and [Windows](https://docs.elastic.co/en/integrations/windows).

 - [Connection to WebService by an Unsigned Binary](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/command_and_control_connection_to_webservice_by_an_unsigned_binary.toml)
 - [Connection to WebService by a Signed Binary Proxy](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/command_and_control_connection_to_webservice_by_a_signed_binary_proxy.toml)
 - [Suspicious DNS Query from Mounted Virtual Disk](https://github.com/elastic/endpoint-rules/blob/main/rules/command_and_control_execution_wevsvc_from_virtual_disk.toml)
 - [Suspicious Access to Web Browser Credential Stores](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/credential_access_suspicious_access_to_web_browser_credential_stores.toml)
 - [Web Browser Credential Access via Unsigned Process](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/credential_access_web_browser_credential_access_via_unsigned_process.toml)
 - [Access to Browser Credentials from Suspicious Memory](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/credential_access_access_to_browser_credentials_from_suspicious_memory.toml)
 - [Failed Access Attempt to Web Browser Files](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/credential_access_failed_access_attempt_to_web_browser_files.toml)
 - [Web Browser Credential Access via Unusual Process](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/credential_access_web_browser_credential_access_via_unusual_process.toml)

### ES|QL queries
The following list of hunts and detection queries can be used to detect stealers activities:

- Identifies untrusted or unsigned executables making DNS requests to Telegram or Discord domains, which may indicate command-and-control communication attempts.
  ``` sql
  from logs-endpoint*
  | where (process.code_signature.trusted == false or process.code_signature.exists == false)
  | where dns.question.name in ("api.telegram.com", "cdn.discordapp.com",
                                  "discordapp.com", "discord.com","discord.gg","cdn.discordapp.com")
  | stats executable_count = count(*) by process.executable, process.name, dns.question.name
  | sort executable_count desc
  ```

- Detects suspicious activies targeting crypto wallets files and configurations stored on Windows systems.

  ``` sql
  from logs-endpoint.events.file-*
  | where @timestamp > now() - 14 days
  | where host.os.type == "windows"
  and event.category == "file"
  and event.action == "open" 
  and (
    file.path rlike """C:\\Users\\.+\\AppData\\Roaming\\.+\\(Bitcoin|Ethereum|Electrum|Zcash|Monero|Wallet|Litecoin|Dogecoin|Coinbase|Exodus|Jaxx|MyEtherWallet|MetaMask)\\.*"""
    or file.path rlike """C:\\ProgramData\\.+\\(Bitcoin|Ethereum|Electrum|Zcash|Monero|Wallet|Litecoin|Dogecoin|Coinbase|Exodus|Jaxx|MyEtherWallet|MetaMask)\\.*"""
  )
  | keep process.executable, process.name, host.id, file.path, file.name
  | stats number_hosts = count_distinct(host.id), unique_files = count_distinct(file.name) by process.executable
  | where number_hosts == 1 and unique_files >= 3
  | sort number_hosts desc
  ```

- Monitors access to sensitive browser data, such as cookies, login data, and browsing history, which may indicate information-stealing malware activities.

  ``` sql
  from logs-endpoint.events.file-*, logs-windows.sysmon_operational-default-*
  | where @timestamp > now() - 14 days
  | where host.os.type == "windows"
  and event.category == "file"
  and event.action in ("open", "modification")
  and (
    file.path rlike "C:\\\\Users\\\\.+\\\\AppData\\\\Local\\\\(Google\\\\Chrome\\\\User Data\\\\.*|Google\\\\Chrome SxS\\\\User Data\\\\.*|Chromium\\\\User Data\\\\.*|Amigo\\\\User Data\\\\.*|Torch\\\\User Data\\\\.*|Vivaldi\\\\User Data\\\\.*|Comodo\\\\Dragon\\\\User Data\\\\.*|Epic Privacy Browser\\\\User Data\\\\.*|CocCoc\\\\Browser\\\\User Data\\\\.*|BraveSoftware\\\\Brave-Browser\\\\User Data\\\\.*|CentBrowser\\\\User Data\\\\.*|7Star\\\\7Star\\\\User Data\\\\.*|Chedot\\\\User Data\\\\.*|Microsoft\\\\Edge\\\\User Data\\\\.*|360Browser\\\\Browser\\\\User Data\\\\.*|Tencent\\\\QQBrowser\\\\User Data\\\\.*|CryptoTab Browser\\\\User Data\\\\.*|Opera Software\\\\Opera Stable\\\\.*|Opera Software\\\\Opera GX Stable\\\\.*)\\\\(Default|Profile \\\\d+)\\\\(Cookies|Login Data|Web Data|History|Bookmarks|Preferences|Visited Links|Network Action Predictor|Top Sites|Favicons|Shortcuts)"
    or file.path rlike "C:\\\\Users\\\\.+\\\\AppData\\\\Roaming\\\\Mozilla\\\\Firefox\\\\Profiles\\\\.*\\\\(cookies.sqlite|logins.json|places.sqlite|key4.db|cert9.db)"
    or file.path rlike "C:\\\\Users\\\\.+\\\\AppData\\\\Roaming\\\\Moonchild Productions\\\\Pale Moon\\\\Profiles\\\\.*\\\\(cookies.sqlite|logins.json|places.sqlite|key3.db|cert8.db)"
    or file.path rlike "C:\\\\Users\\\\.+\\\\AppData\\\\Roaming\\\\Thunderbird\\\\Profiles\\\\.*\\\\(cookies.sqlite|logins.json|key4.db|cert9.db)"
  )
  | keep process.executable, process.name, event.action, host.id, host.name, file.path, file.name
  | eval process_path = replace(process.executable, "([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|ns[a-z][A-Z0-9]{3,4}\\.tmp|DX[A-Z0-9]{3,4}\\.tmp|7z[A-Z0-9]{3,5}\\.tmp|[0-9\\.\\-_]{3,})", "")
  | eval process_path = replace(process_path, "[cC]:\\\\[uU][sS][eE][rR][sS]\\\\[a-zA-Z0-9\\.\\-_\\$~ ]+\\\\", "C:\\\\users\\\\user\\\\")
  | eval normalized_file_path = replace(file.path, "[cC]:\\\\[uU][sS][eE][rR][sS]\\\\[a-zA-Z0-9\\.\\-_\\$~ ]+\\\\", "C:\\\\users\\\\user\\\\")
  | stats number_hosts = count_distinct(host.id) by process.executable, process.name, event.action, normalized_file_path, file.name, host.name
  | where number_hosts == 1
  | sort number_hosts desc
  ```

### Yara rules
 - [Windows Trojan MetaStealer](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_MetaStealer.yar)
 - [Windows Trojan Stealc](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_Stealc.yar)
 - [Windows Trojan RedLineStealer](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_RedLineStealer.yar)
 - [Windows Trojan AgentTesla](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_AgentTesla.yar)


## Conclusion
In conclusion, it's crucial to recognize that these malware threats pose significant risks to both companies and individuals alike. Their affordability makes them accessible not only to sophisticated cybercriminals but also to small-time offenders and script kiddies. This accessibility underscores the democratisation of cybercrime, where even individuals with limited technical expertise can deploy malicious software.

Elastic's comprehensive suite of security features offers organisations and individuals the tools they need to defend against malware attacks effectively. From advanced threat detection to real-time monitoring and response capabilities.
