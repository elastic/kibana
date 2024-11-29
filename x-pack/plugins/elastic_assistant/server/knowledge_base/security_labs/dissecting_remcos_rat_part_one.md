---
title: "Dissecting REMCOS RAT: An in-depth analysis of a widespread 2024 malware, Part One"
slug: "dissecting-remcos-rat-part-one"
date: "2024-04-24"
subtitle: "Part one: Introduction to REMCOS and diving into its initialization procedure"
description: "This malware research article describes the REMCOS implant at a high level, and provides background for future articles in this multipart series."
author:
  - slug: cyril-francois
  - slug: samir-bousseaden
image: "Security Labs Images 36.jpg"
category:
  - slug: malware-analysis
tags:
  - malware-analysis
  - remcos
---

In the first article in this multipart series, malware researchers on the Elastic Security Labs team give a short introduction about the REMCOS threat and dive into the first half of its execution flow, from loading its configuration to cleaning the infected machine web browsers.

## Introduction

Elastic Security Labs continues its examination of high-impact threats, focusing on the internal complexities of REMCOS version 4.9.3 Pro (November 26, 2023).

Developed by [Breaking-Security](https://breakingsecurity.net/), REMCOS is a piece of software that began life as a red teaming tool but has since been adopted by threats of all kinds targeting practically every sector.

When we performed our analysis in mid-January, it was the most prevalent malware family [reported by ANY.RUN](https://any.run/malware-trends/). Furthermore, it remains under active development, as evidenced by the [recent announcement](https://breakingsecurity.net/remcos/changelog/) of version 4.9.4's release by the company on March 9, 2024.

All the samples we analyzed were derived from the same REMCOS 4.9.3 Pro x86 build. The software is coded in C++ with intensive use of the `std::string` class for its string and byte-related operations.

REMCOS is packed with a wide range of functionality, including evasion techniques, privilege escalation, process injection, recording capabilities, etc.

This article series provides an extensive analysis of the following:
 - Execution and capabilities
 - Detection and hunting strategies using Elastic’s ES|QL queries
 - Recovery of approximately 80% of its configuration fields
 - Recovery of about 90% of its C2 commands
 - Sample virtual addresses under each IDA Pro screenshot
 - And more!
 
![REMCOS execution diagram](/assets/images/dissecting-remcos-rat-part-one/image77.png)


For any questions or feedback, feel free to reach out to us on social media [@elasticseclabs](https://twitter.com/elasticseclabs) or in the Elastic [Community Slack](https://elasticstack.slack.com).

### Loading the configuration

The REMCOS configuration is stored in an encrypted blob within a resource named ```SETTINGS```. This name appears consistent across different versions of REMCOS.

![REMCOS config stored in encrypted SETTINGS resource](/assets/images/dissecting-remcos-rat-part-one/image29.png)


The malware begins by loading the encrypted configuration blob from its resource section.

![0x41B4A8 REMCOS loads its encrypted configuration from resources](/assets/images/dissecting-remcos-rat-part-one/image40.png)


To load the encrypted configuration, we use the following Python script and the [Lief](https://pypi.org/project/lief/) module.

```
import lief

def read_encrypted_configuration(path: pathlib.Path) -> bytes | None:
	if not (pe := lief.parse(path)):
    		return None

	for first_level_child in pe.resources.childs:
    		if first_level_child.id != 10:
        		continue

    	for second_level_child in first_level_child.childs:
        		if second_level_child.name == "SETTINGS":
            			return bytes(second_level_child.childs[0].content)
```

We can confirm that version 4.9.3 maintains the same structure and decryption scheme as previously described by [Fortinet researchers](https://www.fortinet.com/blog/threat-research/latest-remcos-rat-phishing):

![Fortinet reported structure and decryption scheme](/assets/images/dissecting-remcos-rat-part-one/image55.png)


We refer to the “encrypted configuration” as the structure that contains the decryption key and the encrypted data blob, which appears as follows:

```
struct ctf::EncryptedConfiguration
{
uint8_t key_size;
uint8_t key[key_size];
uint8_t data
};
```

The configuration is still decrypted using the RC4 algorithm, as seen in the following screenshot.

![0x40F3C3 REMCOS decrypts its configuration using RC4](/assets/images/dissecting-remcos-rat-part-one/image53.png)


To decrypt the configuration, we employ the following algorithm.

```
def decrypt_encrypted_configuration(
	encrypted_configuration: bytes,
) -> tuple[bytes, bytes]:
	key_size = int.from_bytes(encrypted_configuration[:1], "little")
	key = encrypted_configuration[1 : 1 + key_size]
	return key, ARC4.ARC4Cipher(key).decrypt(encrypted_configuration[key_size + 1 :])
```

The configuration is used to initialize a global vector that we call ```g_configuration_vector``` by splitting it with the string ```\x7c\x1f\x1e\x1e\x7c``` as a delimiter.

![0x40EA16 Configuration string is split to initialize g_configuration_vector](/assets/images/dissecting-remcos-rat-part-one/image48.png)


We provide a detailed explanation of the configuration later in this series.

### UAC Bypass

When the ```enable_uac_bypass_flag``` (index ```0x2e```) is enabled in the configuration, REMCOS attempts a UAC bypass using a known COM-based technique.

![0x40EC4C Calling the UAC Bypass feature when enabled in the configuration](/assets/images/dissecting-remcos-rat-part-one/image27.png)


Beforehand, the REMCOS masquerades its process in an effort to avoid detection.

![0x40766D UAC Bypass is wrapped between process masquerading and un-masquerading](/assets/images/dissecting-remcos-rat-part-one/image78.png)


REMCOS modifies the PEB structure of the current process by replacing the image path and command line with the ```explorer.exe``` string while saving the original information in global variables for later use.

![0x40742E Process PEB image path and command line set to explorer.exe](/assets/images/dissecting-remcos-rat-part-one/image14.png)


The well-known [technique](https://attack.mitre.org/techniques/T1218/003/) exploits the ```CoGetObject``` API to pass the ```Elevation:Administrator!new:``` moniker, along with the ```CMSTPLUA``` CLSID and ```ICMLuaUtil``` IID, to instantiate an elevated COM interface. REMCOS then uses the ```ShellExec()``` method of the interface to launch a new process with administrator privileges, and exit.

![0x407607 calling ShellExec from an elevated COM interface](/assets/images/dissecting-remcos-rat-part-one/image85.png)


![0x4074FD instantiating an elevated COM interface](/assets/images/dissecting-remcos-rat-part-one/image9.png)


This technique was previously documented in an Elastic Security Labs article from 2023: [Exploring Windows UAC Bypasses: Techniques and Detection Strategies](https://www.elastic.co/security-labs/exploring-windows-uac-bypasses-techniques-and-detection-strategies).

Below is a recent screenshot of the detection of this exploit using the Elastic Defend agent.

![UAC bypass exploit detection by the Elastic Defend agent disabling UAC](/assets/images/dissecting-remcos-rat-part-one/image25.png)


### Disabling UAC

When the ```disable_uac_flag``` is enabled in the configuration (index ```0x27```), REMCOS [disables UAC](https://attack.mitre.org/techniques/T1548/002/) in the registry by setting the ```HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\SystemEnableLUA``` value to ```0``` using the ```reg.exe``` Windows binary."

![](/assets/images/dissecting-remcos-rat-part-one/image4.png)


![](/assets/images/dissecting-remcos-rat-part-one/image12.png)


## Install and persistence

When ```enable_install_flag``` (index ```0x3```) is activated in the configuration, REMCOS will install itself on the host machine.

![0x40ED8A Calling install feature when the flag is enabled in configuration](/assets/images/dissecting-remcos-rat-part-one/image50.png)


The installation path is constructed using the following configuration values:
 - ```install_parent_directory``` (index ```0x9```)
 - ```install_directory``` (```0x30```)
 - ```install_filename``` (```0xA```)

The malware binary is copied to ```{install_parent_directory}/{install_directory}/{install_filename}```. In this example, it is ```%ProgramData%\Remcos\remcos.exe```.

![Sample detected in its installation directory](/assets/images/dissecting-remcos-rat-part-one/image42.png)


If the ```enable_persistence_directory_and_binary_hiding_flag``` (index ```0xC```) is enabled in the configuration, the install folder and the malware binary are set to super hidden (even if the user enables showing hidden files or folders the file is kept hidden by Windows to protect files with system attributes) and read-only by applying read-only, hidden, and system attributes to them.

![0x40CFC3 REMCOS applies read-only and super hidden attributes to its install folder and files](/assets/images/dissecting-remcos-rat-part-one/image83.png)


![Install files set as read-only and super hidden](/assets/images/dissecting-remcos-rat-part-one/image60.png)


After installation, REMCOS establishes persistence in the registry depending on which of the following flags are enabled in the configuration:
 - ```enable_hkcu_run_persistence_flag``` (index ```0x4```)
```HKCU\Software\Microsoft\Windows\CurrentVersion\Run\```
 - ```enable_hklm_run_persistence_flag``` (index ```0x5```)
```HKLM\Software\Microsoft\Windows\CurrentVersion\Run\```
 - ```enable_hklm_policies_explorer_run_flag``` (index ```0x8```)
```HKLM\Software\Microsoft\Windows\CurrentVersion\Policies\Explorer\Run\```

![0x40CD0D REMCOS establishing persistence registry keys](/assets/images/dissecting-remcos-rat-part-one/image47.png)


The malware is then relaunched from the installation folder using ```ShellExecuteW```, followed by termination of the initial process.

![0x40D04B Relaunch of the REMCOS process after installation](/assets/images/dissecting-remcos-rat-part-one/image75.png)


## Process injection

When the ```enable_process_injection_flag``` (index ```0xD```) is enabled in the configuration,  REMCOS injects itself into either a specified or a Windows process chosen from an hardcoded list to evade detection.

![0x40EEB3 Calling process injection feature if enabled in the configuration](/assets/images/dissecting-remcos-rat-part-one/image15.png)


![REMCOS running injected into iexplore.exe](/assets/images/dissecting-remcos-rat-part-one/image21.png)


The ```enable_process_injection_flag``` can be either a boolean or the name of a target process. When set to true (1), the injected process is chosen in a “best effort” manner from the following options:
 - ```iexplorer.exe```
 - ```ieinstal.exe```
 - ```ielowutil.exe```

![](/assets/images/dissecting-remcos-rat-part-one/image73.png)


*Note: there is only one injection method available in REMCOS, when we talk about process injection we are specifically referring to the method outlined here*

REMCOS uses a classic ```ZwMapViewOfSection``` + ```SetThreadContext``` + ```ResumeThread``` technique for process injection. This involves copying itself into the injected binary via shared memory, mapped using ```ZwMapViewOfSection``` and then hijacking its execution flow to the REMCOS entry point using ```SetThreadContext``` and ```ResumeThread``` methods.

It starts by creating the target process in suspended mode using the ```CreateProcessW``` API and retrieving its thread context using the ```GetThreadContext``` API.

![0x418217 Creation of target process suspended mode](/assets/images/dissecting-remcos-rat-part-one/image97.png)


Then, it creates a shared memory using the ```ZwCreateSection``` API and maps it into the target process using the ```ZwMapViewOfSection``` API, along with the handle to the remote process.

![0x418293 Creating of the shared memory](/assets/images/dissecting-remcos-rat-part-one/image66.png)


![0x41834C Mapping of the shared memory in the target process](/assets/images/dissecting-remcos-rat-part-one/image43.png)


The binary is next loaded into the remote process by copying its header and sections into shared memory.

![0x41836F Mapping the PE in the shared memory using ```memmove```](/assets/images/dissecting-remcos-rat-part-one/image90.png)


Relocations are applied if necessary. Then, the PEB ```ImageBaseAddress``` is fixed using the ```WriteProcessMemory``` API. Subsequently, the thread context is set with a new entry point pointing to the REMCOS entry point, and process execution resumes.

![0x41840B Hijacking process entry point to REMCOS entry point and resuming the process](/assets/images/dissecting-remcos-rat-part-one/image34.png)


Below is the detection of this process injection technique by our agent:

![Process injection alert](/assets/images/dissecting-remcos-rat-part-one/image54.png)


![Process injection process tree](/assets/images/dissecting-remcos-rat-part-one/image59.png)


## Setting up logging mode

REMCOS has three logging mode values that can be selected with the ```logging_mode``` (index ```0x28```) field of the configuration:
 - 0: No logging 
 - 1: Start minimized in tray icon 
 - 2: Console logging

![0x40EFA3 Logging mode configured from settings](/assets/images/dissecting-remcos-rat-part-one/image39.png)


Setting this field to 2 enables the console, even when process injection is enabled, and exposes additional information.

![REMCOS console displayed while injected into iexplore.exe](/assets/images/dissecting-remcos-rat-part-one/image71.png)


## Cleaning browsers

When the ```enable_browser_cleaning_on_startup_flag``` (index ```0x2B```) is enabled,  REMCOS will delete cookies and login information from the installed web browsers on the host. 

![0x40F1CC Calling browser cleaning feature when enabled in the configuration](/assets/images/dissecting-remcos-rat-part-one/image5.png)


According to the [official documentation](https://breakingsecurity.net/wp-content/uploads/dlm_uploads/2018/07/Remcos_Instructions_Manual_rev22.pdf) the goal of this capability is to increase the system security against password theft:

![](/assets/images/dissecting-remcos-rat-part-one/image76.png)


Currently, the supported browsers are Internet Explorer, Firefox, and Chrome.

![0x40C00C Supported browsers for cleaning features](/assets/images/dissecting-remcos-rat-part-one/image7.png)


The cleaning process involves deleting cookies and login files from browsers' known directory paths using the ```FindFirstFileA```, ```FindNextFileA```, and ```DeleteFileA``` APIs:

![0x40BD37 Cleaning Firefox cookies 1/2](/assets/images/dissecting-remcos-rat-part-one/image56.png)


![0x40BD37 Cleaning Firefox cookies 2/2](/assets/images/dissecting-remcos-rat-part-one/image74.png)


When the job is completed, REMCOS prints a message to the console.

![REMCOS printing success message after cleaning browsers](/assets/images/dissecting-remcos-rat-part-one/image96.png)


It's worth mentioning two related fields in the configuration:
 - ```enable_browser_cleaning_only_for_the_first_run_flag``` (index ```0x2C```)
 - ```browser_cleaning_sleep_time_in_minutes``` (index ```0x2D```)

The ```browser_cleaning_sleep_time_in_minutes``` configuration value determines how much time REMCOS will sleep before performing the job.

![0x40C162 Sleeping before performing browser cleaning job](/assets/images/dissecting-remcos-rat-part-one/image13.png)


When ```enable_browser_cleaning_only_for_the_first_run_flag``` is enabled, the cleaning will occur only at the first run of REMCOS. Afterward, the ```HKCU/SOFTWARE/{mutex}/FR``` registry value is set.

On subsequent runs, the function directly returns if the value exists and is set in the registry.

![](/assets/images/dissecting-remcos-rat-part-one/image67.png)


That’s the end of the first article. The second part will cover the second half of REMCOS' execution flow, starting from its watchdog to the first communication with its C2.