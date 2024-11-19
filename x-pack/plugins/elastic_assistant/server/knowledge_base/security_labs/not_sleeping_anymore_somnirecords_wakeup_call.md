---
title: "Not sleeping anymore: SOMNIRECORD's wake-up call"
slug: "not-sleeping-anymore-somnirecords-wakeup-call"
date: "2023-03-22"
description: "Elastic Security Labs researchers identified a new malware family written in C++ that we refer to as SOMNIRECORD. This malware functions as a backdoor and communicates with command and control (C2) while masquerading as DNS."
author:
  - slug: salim-bitam
image: "blog-thumb-steel-engine.jpg"
category:
  - slug: malware-analysis
tags:
  - malware analysis
  - somnirecord
  - siestagraph
  - naplistener
---

### Introduction

While monitoring the [REF2924 activity group](https://www.elastic.co/security-labs/update-to-the-REF2924-intrusion-set-and-related-campaigns), Elastic Security Labs researchers identified a new malware family written in C++ that we refer to as SOMNIRECORD. This malware functions as a backdoor and communicates with command and control (C2) while masquerading as DNS, allowing attackers to bypass network security controls such as firewalls and intrusion detection systems. Like [NAPLISTENER](https://www.elastic.co/security-labs/naplistener-more-bad-dreams-from-the-developers-of-siestagraph) and [SIESTAGRAPH](https://www.elastic.co/security-labs/siestagraph-new-implant-uncovered-in-asean-member-foreign-ministry), these factors make it difficult to detect and block using strictly network-based technologies.

### Analysis

Upon execution, SOMNIRECORD first generates a random string of three characters used as a unique identifier for the running malware instance. It then probes a domain name that is hardcoded into the binary (" `dafadfweer.top`") by appending the random three-character string and the string " `-PROBE`" to the domain name. SOMNIRECORD simulates a DNS query to retrieve the number of commands that are queued for the backdoor to execute, each stored in a `TXT` record of the associated domain.

![Dns query with PROBE as subdomain](/assets/images/not-sleeping-anymore-somnirecords-wakeup-call/image2.jpg)

![Pseudocode dnsQuery call](/assets/images/not-sleeping-anymore-somnirecords-wakeup-call/image4.jpg)

After obtaining the number of commands waiting to be executed, the backdoor retrieves each command individually by sending a DNS query for a `TXT` record. The backdoor prepends the previously-generated random string to the " `-CMD`" string before sending the DNS query. This allows the backdoor to receive each command individually and execute them accordingly.

![Dns query with CMD as subdomain](/assets/images/not-sleeping-anymore-somnirecords-wakeup-call/image5.jpg)

### Command handling

The malware's command handling function is a critical component that enables it to execute commands received from the C2 server. This function processes the command and performs the appropriate action based on the command type. In this malware, there are five commands that the malware can execute: `SYS, PSL, sleep, ECM` , and `WS` :

![Pseudocode Command handling function](/assets/images/not-sleeping-anymore-somnirecords-wakeup-call/image1.jpg)

“ `SYS` ” is used to retrieve information about the infected machine. When this command is executed, the SOMNIRECORD payload collects information about the computer name, the number of processors, OEM ID, and processor type. This information can be used to fingerprint/identify specific infected machines.

“ `PSL` ” is used to list all processes currently running on the infected machine by executing the system command “tasklist”.

“ `ECM` ” allows the malware to execute any software already present on the system, such as cmd.exe.

“ `sleep` ” is used to change the beacon interval to the c2 server.

“ `WS` ” is used to deploy an ASPX-based webshell to a specified path. The ASPX is hardcoded into the malware itself.

To communicate command results to its C2 server, SOMNIRECORD employs a unique technique that involves encoding the output of executed commands as hex values, prepending the previously generated random string to the " `-DATA`" string and then appending the hex values. The malware then performs a DNS query to the subdomain, allowing the encoded command output to be transmitted to the C2 server for example: `XXX-DATA-68656c6c6f20776f726c64.dafadfweer.top`

![Dns query with DATA as subdomain](/assets/images/not-sleeping-anymore-somnirecords-wakeup-call/image3.png)

### Resources

Elastic Security Labs has provided a SOMNIRECORD signature in our open protections artifact repository [here](https://github.com/elastic/protections-artifacts/blob/main/yara/rules/Windows_Trojan_SomniRecord.yar).

### Sources

Code similarity analyses play an important role in discovering the sources of malicious code used by adversaries. In an effort to identify the source of SOMNIRECORD, we identified an open source project called [DNS-Persist](https://github.com/chouaibhm/DNS-Persist/) that contained similar logic. Like NAPLISTENER, we believe the attacker was inspired by this project and then added modifications to facilitate success in a specific target environment.

### Key takeaways

- The use of open source projects by the attacker indicates that they are taking steps to customize existing tools for their specific needs and may be attempting to counter attribution attempts
- SOMNIRECORD uses DNS to pattern communication with its command and control (C2), which enables attackers to bypass network egress controls and monitoring
