---
title: "NETWIRE Dynamic Configuration Extraction"
slug: "netwire-dynamic-configuration-extraction"
date: "2023-01-30"
subtitle: "A tool for the dynamic extraction of NETWIRE configurations based on emulation."
description: "Elastic Security Labs discusses the NETWIRE trojan and is releasing a tool to dynamically extract configuration files."
author:
  - slug: seth-goodwin
  - slug: salim-bitam
image: "lock-code-combination-configuration.jpg"
category:
  - slug: security-research
tags:
  - netwire
  - ref9965
---

## Key takeaways

- NETWIRE has shown an increase in prevalence over the last year
- Elastic Security Labs created an extractor to pull out configuration data from NETWIRE files and memory dumps targeting the functions the malware uses to extract its encrypted data
- The NETWIRE extractor is freely available for download

> To download the NETWIRE configuration extractor, check out our post on the tool:
>
> - [NETWIRE configuration extractor](https://www.elastic.co/security-labs/netwire-configuration-extractor)

## Preamble

[NETWIRE](https://malpedia.caad.fkie.fraunhofer.de/details/win.netwire) is a Remote Access Tool (RAT) that has been used since at least 2014. It is a publicly available commodity malware and has been observed being used by financially motivated and nation-state actors.

![NETWIRE observations over the past 12-months](/assets/images/netwire-dynamic-configuration-extraction/image1.jpg)

In the second half of 2022, we noticed an uptick in the prevalence of NETWIRE usage in our telemetry data. This prompted the Elastic Security Labs team to develop a configuration extractor to assist the security community in collecting atomic indicators within the configurations. Using this extractor will support threat tracking and improve detection, prevention, and response times.

## Extractor

The NETWIRE RAT uses the [RC4 symmetric encryption](https://en.wikipedia.org/wiki/RC4) algorithm to protect its configuration which is encrypted in the **.data** section along with the 16 bytes long RC4 decryption key.

While reversing our samples the analysts noticed that for both the **crypto::rc4_init_sbox** and **crypto::rc4_decrypt** functions the second argument (#2 in the image below) is always a memory address for the desired encrypted configuration value, and the third argument (#3) is an immediate value written to the memory stack before the call which represents the size of the encrypted string.

It was also noted that the function calls are one after the other. This is important to allow us to structure the extractor to look for these functions sequentially.

![NETWIRE's assembly code for the decryption function](/assets/images/netwire-dynamic-configuration-extraction/image4.png)

With **$key** (from the above image) in mind, we created YARA rules to identify the location of the key and encrypted configuration values.

![YARA rule section that identifies the key and encrypted configuration](/assets/images/netwire-dynamic-configuration-extraction/image5.jpg

With this information we can then use [Capstone](http://www.capstone-engine.org/) to:

1. Locate the function responsible for decrypting the configuration using YARA.
2. Disassemble the function using Capstone.

3. Extract the RC4 key address and the encrypted configuration field addresses.
4. Extract the size of the configuration field.
5. RC4 decrypt the encrypted fields and rebuild the configuration.

![Locating the RC4 key address and the encrypted configuration](/assets/images/netwire-dynamic-configuration-extraction/image2.jpg)

![RC4 decrypting the configuration](/assets/images/netwire-dynamic-configuration-extraction/image5.jpg

Once we have recreated the configuration, we can use the extractor to pull out several parameters used by NETWIRE, as well as a few basic file characteristics:

- **Active Setup Key** : [Active Setup](https://attack.mitre.org/techniques/T1547/014/) registry key to achieve persistence.
- **C2 IP list** : List of command and control (C2) server domains or IP addresses.
- **Host ID** : A unique identifier that is assigned to the infected machine.
- **Installation path** : The location where the malware will be installed.
- **Keylogger logs directory** : The location where the keylogging log file will be stored.
- **Mutex** : Mutex name, to create a synchronization object to ensure only one instance of the sample is running on the machine.
- **Password** : Static password to generate AES key used for encrypting the communication between the malware and the C2 server.
- **Run registry key entry** : Name of the entry in the [run registry](https://attack.mitre.org/techniques/T1547/001/), used for persistence.
- **Sleep in seconds** : The amount of time the malware sleeps.

![Sample output from configuration extractor](/assets/images/netwire-dynamic-configuration-extraction/image6.jpg)

The configuration extractor accepts four parameters:

- **-f** : to specify a single NETWIRE sample
- **-d** : To specify a directory of NETWIRE samples
- **-o** : To write the configuration in JSON format to the specified file
- **--all-config** : To print the unparsed raw decrypted configuration

## Analysis

We’ve used this extractor to examine a set of samples from the previous 180 days to extract indicators for further enrichment and analysis.

Our initially collected batch of samples came as a mixture of executable files and memory dumps. The extractor will only work on unmapped files, so the dumps which were already mapped were run through [**pe_unmapper**](https://github.com/hasherezade/pe_unmapper).

When extracting a payload from memory, we are obtaining a memory-mapped version of it. This means that the **"Raw Address"** and **"Raw Size"** may not be correctly aligned with the correct section’s data. To correctly align the PE file, it is necessary to adjust the pointer to the raw address so that it matches the virtual address for every section.

Now we can run the configuration extractor with [Poetry](https://python-poetry.org/) against our directory of unmapped binaries:

```
**poetry lock**
**poetry install**
**poetry shell**
**netwire-config-extractor -d sample-dir/ -o output.ndjson**
```

This file, **output.ndjson** , can then be uploaded to Kibana for further analysis.

> Check out the [Elastic Container project](https://www.elastic.co/security-labs/the-elastic-container-project) to quick spin up an Elastic Stack and start analyzing structured security-relevant data.

![Extracted NETWIRE configuration data](/assets/images/netwire-dynamic-configuration-extraction/image3.png)

Next time you run into a NETWIRE sample, run it through our configuration extractor to pull out other indicators to help you on your analytic journey or begin remediating quicker.

## Detection

### YARA

These YARA rules can used to detect and identify NETWIRE RAT.

```
rule Windows_Trojan_Netwire_1 {
   meta:
       author = "Elastic Security"
       os = "Windows"
       arch = "x86"
       category_type = "Trojan"
       family = "Netwire"
       threat_name = "Windows.Trojan.Netwire"
   strings:
       $a = { 0F B6 74 0C 10 89 CF 29 C7 F7 C6 DF 00 00 00 74 09 41 89 F3 88 5C }
   condition:
       all of them
}
rule Windows_Trojan_Netwire_2 {
   meta:
       author = "Elastic Security"
       os = "Windows"
       arch = "x86"
       category_type = "Trojan"
       family = "Netwire"
       threat_name = "Windows.Trojan.Netwire"
   strings:
       $a1 = "[%.2d/%.2d/%d %.2d:%.2d:%.2d]" fullword
       $a2 = "\\Login Data"
       $a3 = "SOFTWARE\\NetWire" fullword
   condition:
       2 of them
}
rule Windows_Trojan_Netwire_3 {
   meta:
       author = "Elastic Security"
       os = "Windows"
       arch = "x86"
       category_type = "Trojan"
       family = "Netwire"
       threat_name = "Windows.Trojan.Netwire"
   strings:
       $a = { C9 0F 44 C8 D0 EB 8A 44 24 12 0F B7 C9 75 D1 32 C0 B3 01 8B CE 88 44 }
   condition:
       all of them
}
rule Windows_Trojan_Netwire_4 {
   meta:
       author = "Elastic Security"
       os = "Windows"
       arch = "x86"
       category_type = "Trojan"
       family = "Netwire"
       threat_name = "Windows.Trojan.Netwire"
   strings:
       $a1 = "http://%s%ComSpec" ascii fullword
       $a2 = "%c%.8x%s" ascii fullword
       $a3 = "%6\\6Z65dlNh\\YlS.dfd" ascii fullword
       $a4 = "GET %s HTTP/1.1" ascii fullword
       $a5 = "R-W65: %6:%S" ascii fullword
       $a6 = "PTLLjPq %6:%S -qq9/G.y" ascii fullword
   condition:
       4 of them
}
```

## Indicators

All indicators are also available [for download](https://assets.contentstack.io/v3/assets/bltefdd0b53724fa2ce/blte3d9f2700cdf6637/63d3f854e4e29e75dc5de351/9965-indicators.zip) in both ECS and STIX format in a combined zip bundle.

The following indicators were discussed in this research.

| Indicator                              | Type        | Note           |
| -------------------------------------- | ----------- | -------------- |
| 139.28.38[.]235                        | ipv4-addr   | NETWIRE RAT C2 |
| 149.102.132[.]253                      | ipv4-addr   | NETWIRE RAT C2 |
| 184.75.221[.]115                       | ipv4-addr   | NETWIRE RAT C2 |
| 185.136.165[.]182                      | ipv4-addr   | NETWIRE RAT C2 |
| 185.140.53[.]139                       | ipv4-addr   | NETWIRE RAT C2 |
| 185.140.53[.]144                       | ipv4-addr   | NETWIRE RAT C2 |
| 185.140.53[.]154                       | ipv4-addr   | NETWIRE RAT C2 |
| 185.140.53[.]61                        | ipv4-addr   | NETWIRE RAT C2 |
| 185.216.71[.]251                       | ipv4-addr   | NETWIRE RAT C2 |
| 194.36.111[.]59                        | ipv4-addr   | NETWIRE RAT C2 |
| 194.5.98[.]126                         | ipv4-addr   | NETWIRE RAT C2 |
| 194.5.98[.]178                         | ipv4-addr   | NETWIRE RAT C2 |
| 194.5.98[.]188                         | ipv4-addr   | NETWIRE RAT C2 |
| 194.5.98[.]65                          | ipv4-addr   | NETWIRE RAT C2 |
| 212.193.29[.]37                        | ipv4-addr   | NETWIRE RAT C2 |
| 212.193.30[.]230                       | ipv4-addr   | NETWIRE RAT C2 |
| 213.152.161[.]249                      | ipv4-addr   | NETWIRE RAT C2 |
| 217.151.98[.]163                       | ipv4-addr   | NETWIRE RAT C2 |
| 23.105.131[.]166                       | ipv4-addr   | NETWIRE RAT C2 |
| 37.0.14[.]199                          | ipv4-addr   | NETWIRE RAT C2 |
| 37.0.14[.]203                          | ipv4-addr   | NETWIRE RAT C2 |
| 37.0.14[.]206                          | ipv4-addr   | NETWIRE RAT C2 |
| 37.0.14[.]208                          | ipv4-addr   | NETWIRE RAT C2 |
| 37.0.14[.]214                          | ipv4-addr   | NETWIRE RAT C2 |
| 37.120.217[.]243                       | ipv4-addr   | NETWIRE RAT C2 |
| 51.161.104[.]138                       | ipv4-addr   | NETWIRE RAT C2 |
| 54.145.6[.]146                         | ipv4-addr   | NETWIRE RAT C2 |
| 80.66.64[.]136                         | ipv4-addr   | NETWIRE RAT C2 |
| 85.209.134[.]105                       | ipv4-addr   | NETWIRE RAT C2 |
| 85.31.46[.]78                          | ipv4-addr   | NETWIRE RAT C2 |
| 94.156.35[.]40                         | ipv4-addr   | NETWIRE RAT C2 |
| 20220627.duckdns[.]org                 | domain-name | NETWIRE RAT C2 |
| admin96.hopto[.]org                    | domain-name | NETWIRE RAT C2 |
| alice2019.myftp[.]biz                  | domain-name | NETWIRE RAT C2 |
| asorock1111.ddns[.]net                 | domain-name | NETWIRE RAT C2 |
| banqueislamik.ddrive[.]online          | domain-name | NETWIRE RAT C2 |
| betterday.duckdns[.]org                | domain-name | NETWIRE RAT C2 |
| bigman2021.duckdns[.]org               | domain-name | NETWIRE RAT C2 |
| blazeblaze.ddns[.]net                  | domain-name | NETWIRE RAT C2 |
| chongmei33.myddns[.]rocks              | domain-name | NETWIRE RAT C2 |
| clients.enigmasolutions[.]xyz          | domain-name | NETWIRE RAT C2 |
| gracedynu.gleeze[.]com                 | domain-name | NETWIRE RAT C2 |
| ingobea.hopto[.]org                    | domain-name | NETWIRE RAT C2 |
| iphanyi.edns[.]biz                     | domain-name | NETWIRE RAT C2 |
| iphy.strangled[.]net                   | domain-name | NETWIRE RAT C2 |
| kimlee11.duckdns[.]org                 | domain-name | NETWIRE RAT C2 |
| loffgghh.duckdns[.]org                 | domain-name | NETWIRE RAT C2 |
| megaton.gleeze[.]com                   | domain-name | NETWIRE RAT C2 |
| moran101.duckdns[.]org                 | domain-name | NETWIRE RAT C2 |
| netuwaya.servecounterstrike[.]com      | domain-name | NETWIRE RAT C2 |
| nowancenorly.ddns[.]net                | domain-name | NETWIRE RAT C2 |
| podzeye.duckdns[.]org                  | domain-name | NETWIRE RAT C2 |
| podzeye2.duckdns[.]org                 | domain-name | NETWIRE RAT C2 |
| recoveryonpoint.duckdns[.]org          | domain-name | NETWIRE RAT C2 |
| redlinea[.]top                         | domain-name | NETWIRE RAT C2 |
| roller.duckdns[.]org                   | domain-name | NETWIRE RAT C2 |
| rozayleekimishere.duckdns[.]org        | domain-name | NETWIRE RAT C2 |
| sani990.duckdns[.]org                  | domain-name | NETWIRE RAT C2 |
| saturdaylivecheckthisout.duckdns[.]org | domain-name | NETWIRE RAT C2 |
| uhie.hopto[.]org                       | domain-name | NETWIRE RAT C2 |
| uhie2020.duckdns[.]org                 | domain-name | NETWIRE RAT C2 |
| wcbradley.duckdns[.]org                | domain-name | NETWIRE RAT C2 |
| xman2.duckdns[.]org                    | domain-name | NETWIRE RAT C2 |
| zonedx.ddns[.]net                      | domain-name | NETWIRE RAT C2 |
