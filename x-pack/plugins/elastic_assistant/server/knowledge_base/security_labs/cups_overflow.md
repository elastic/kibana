---
title: "Cups Overflow: When your printer spills more than Ink"
slug: "cups-overflow"
date: "2024-09-28"
description: "Elastic Security Labs discusses detection and mitigation strategies for vulnerabilities in the CUPS printing system, which allow unauthenticated attackers to exploit the system via IPP and mDNS, resulting in remote code execution (RCE) on UNIX-based systems such as Linux, macOS, BSDs, ChromeOS, and Solaris."
author:
  - slug: mika-ayenson
  - slug: terrance-dejesus
  - slug: eric-forte
  - slug: ruben-groenewoud
image: "cups-overflow.jpg"
category:
  - slug: security-research
  - slug: vulnerability-updates
tags:
  - linux
  - macos
  - cups
  - vulnerability
  - CVE-2024-47176
  - CVE-2024-47076
  - CVE-2024-47175
  - CVE-2024-47177
---

## Key takeaways

* On September 26, 2024, security researcher Simone Margaritelli (@evilsocket) disclosed multiple vulnerabilities affecting the `cups-browsed`, `libscupsfilters`, and `libppd` components of the CUPS printing system, impacting versions \<= 2.0.1.
* The vulnerabilities allow an unauthenticated remote attacker to exploit the printing system via IPP (Internet Printing Protocol) and mDNS to achieve remote code execution (RCE) on affected systems. 
* The attack can be initiated over the public internet or local network, targeting the UDP port 631 exposed by `cups-browsed` without any authentication requirements.
* The vulnerability chain includes the `foomatic-rip` filter, which permits the execution of arbitrary commands through the `FoomaticRIPCommandLine` directive, a known ([CVE-2011-2697](https://nvd.nist.gov/vuln/detail/CVE-2011-2697), [CVE-2011-2964](https://nvd.nist.gov/vuln/detail/CVE-2011-2964)) but unpatched issue since 2011. 
* Systems affected include most GNU/Linux distributions, BSDs, ChromeOS, and Solaris, many of which have the `cups-browsed` service enabled by default. 
* By the title of the publication, “Attacking UNIX Systems via CUPS, Part I” Margaritelli likely expects to publish further research on the topic.
* Elastic has provided protections and guidance to help organizations detect and mitigate potential exploitation of these vulnerabilities.

## The CUPS RCE at a glance

On September 26, 2024, security researcher Simone Margaritelli (@evilsocket) [uncovered](https://www.evilsocket.net/2024/09/26/Attacking-UNIX-systems-via-CUPS-Part-I/) a chain of critical vulnerabilities in the CUPS (Common Unix Printing System) utilities, specifically in components like `cups-browsed`, `libcupsfilters`, and `libppd`. These vulnerabilities — identified as [CVE-2024-47176](https://www.cve.org/CVERecord?id=CVE-2024-47176), [CVE-2024-47076](https://www.cve.org/CVERecord?id=CVE-2024-47076), [CVE-2024-47175](https://www.cve.org/CVERecord?id=CVE-2024-47175), and [CVE-2024-47177](https://www.cve.org/CVERecord?id=CVE-2024-47177) — affect widely adopted UNIX systems such as GNU/Linux, BSDs, ChromeOS, and Solaris, exposing them to remote code execution (RCE).

At the core of the issue is the lack of input validation in the CUPS components, which allows attackers to exploit the Internet Printing Protocol (IPP). Attackers can send malicious packets to the target's UDP port `631` over the Internet (WAN) or spoof DNS-SD/mDNS advertisements within a local network (LAN), forcing the vulnerable system to connect to a malicious IPP server.

For context, the IPP is an application layer protocol used to send and receive print jobs over the network. These communications include sending information regarding the state of the printer (paper jams, low ink, etc.) and the state of any jobs. IPP is supported across all major operating systems including Windows, macOS, and Linux. When a printer is available, the printer broadcasts (via DNS) a message stating that the printer is ready including its Uniform Resource Identifier (URI). When Linux workstations receive this message, many Linux default configurations will automatically add and register the printer for use within the OS. As such, the malicious printer in this case will be automatically registered and made available for print jobs.

Upon connecting, the malicious server returns crafted IPP attributes that are injected into PostScript Printer Description (PPD) files, which are used by CUPS to describe printer properties. These manipulated PPD files enable the attacker to execute arbitrary commands when a print job is triggered.

One of the major vulnerabilities in this chain is the `foomatic-rip` filter, which has been known to allow arbitrary command execution through the FoomaticRIPCommandLine directive. Despite being vulnerable for over a decade, it remains unpatched in many modern CUPS implementations, further exacerbating the risk.

> While these vulnerabilities are highly critical with a CVSS score as high as 9.9, they can be mitigated by disabling cups-browsed, blocking UDP port 631, and updating CUPS to a patched version. Many UNIX systems have this service enabled by default, making this an urgent issue for affected organizations to address.

## Elastic’s POC analysis

Elastic’s Threat Research Engineers initially located the original proof-of-concept written by @evilsocket, which had been leaked. However, we chose to utilize the [cupshax](https://github.com/RickdeJager/cupshax/blob/main/cupshax.py) proof of concept (PoC) based on its ability to execute locally. 

To start, the PoC made use of a custom Python class that was responsible for creating and registering the fake printer service on the network using mDNS/ZeroConf. This is mainly achieved by creating a ZeroConf service entry for the fake Internet Printing Protocol (IPP) printer. 

Upon execution, the PoC broadcasts a fake printer advertisement and listens for IPP requests. When a vulnerable system sees the broadcast, the victim automatically requests the printer's attributes from a URL provided in the broadcast message. The PoC responds with IPP attributes including the FoomaticRIPCommandLine parameter, which is known for its history of CVEs. The victim generates and saves a [PostScript Printer Description](https://en.wikipedia.org/wiki/PostScript_Printer_Description) (PPD) file from these IPP attributes.

At this point, continued execution requires user interaction to start a print job and choose to send it to the fake printer. Once a print job is sent, the PPD file tells CUPS how to handle the print job. The included FoomaticRIPCommandLine directive allows the arbitrary command execution on the victim machine.

During our review and testing of the exploits with the Cupshax PoC, we identified several notable hurdles and key details about these vulnerable endpoint and execution processes.

When running arbitrary commands to create files, we noticed that `lp` is the user and group reported for arbitrary command execution, the [default printing group](https://wiki.debian.org/SystemGroups#:~:text=lp%20(LP)%3A%20Members%20of,jobs%20sent%20by%20other%20users.) on Linux systems that use CUPS utilities. Thus, the Cupshax PoC/exploit requires both the CUPS vulnerabilities and the `lp` user to have sufficient permissions to retrieve and run a malicious payload. By default, the `lp` user on many systems will have these permissions to run effective payloads such as reverse shells; however, an alternative mitigation is to restrict `lp` such that these payloads are ineffective through native controls available within Linux such as AppArmor or SELinux policies, alongside firewall or IPtables enforcement policies. 

The `lp` user in many default configurations has access to commands that are not required for the print service, for instance `telnet`. To reduce the attack surface, we recommend removing unnecessary services and adding restrictions to them where needed to prevent the `lp` user from using them. 

We also took note that interactive reverse shells are not immediately supported through this technique, since the `lp` user does not have a login shell; however, with some creative tactics, we were able to still accomplish this with the PoC. Typical PoCs test the exploit by writing a file to `/tmp/`, which is trivial to detect in most cases. Note that the user writing this file will be `lp` so similar behavior will be present for attackers downloading and saving a payload on disk.

Alongside these observations, the parent process, `foomatic-rip` was observed in our telemetry executing a shell, which is highly uncommon

## Executing the ‘Cupshax’ POC

To demonstrate the impact of these vulnerabilities, we attempted to accomplish two different scenarios: using a payload for a reverse shell using living off the land techniques and retrieving and executing a remote payload. These actions are often common for adversarial groups to attempt to leverage once a vulnerable system is identified. While in its infancy, widespread exploitation has not been observed, but likely will replicate some of the scenarios depicted below.

Our first attempts running the Cupshax PoC were met with a number of minor roadblocks due to the default user groups assigned to the `lp` user — namely restrictions around interactive logon, an attribute common to users that require remote access to systems. This did not, however, impact our ability to download a remote payload, compile, and execute on the impacted host system:

![A remotely downloaded payload, compiled and executed on a vulnerable host](/assets/images/cups-overflow/video1.gif "A remotely downloaded payload, compiled and executed on a vulnerable host")

Continued testing was performed around reverse shell invocation, successfully demonstrated below: 

![A reverse shell executed on a vulnerable host](/assets/images/cups-overflow/video2.gif "A reverse shell executed on a vulnerable host")

## Assessing impact

* **Severity:** These vulnerabilities are given CVSS scores [controversially](https://x.com/evilsocket/status/1838220677389656127) up to 9.9, indicating a critical severity. The widespread use of CUPS and the ability to remotely exploit these vulnerabilities make this a high-risk issue.
* **Who is affected?:** The vulnerability affects most UNIX-based systems, including major GNU/Linux distributions and other operating systems like ChromeOS and BSDs running the impacted CUPS components. Public-facing or network-exposed systems are particularly at risk. Further guidance, and notifications will likely be provided by vendors as patches become available, alongside further remediation steps. Even though CUPS usually listens on localhost, the Shodan Report [highlights](https://x.com/shodanhq/status/1839418045757845925) that over 75,000 CUPS services are exposed on the internet.
* **Potential Damage:** Once exploited, attackers can gain control over the system to run arbitrary commands. Depending on the environment, this can lead to data exfiltration, ransomware installation, or other malicious actions. Systems connected to printers over WAN are especially at risk since attackers can exploit this without needing internal network access. 

## Remediations

As [highlighted](https://www.evilsocket.net/2024/09/26/Attacking-UNIX-systems-via-CUPS-Part-I/#Remediation) by @evilsocket, there are several remediation recommendations.

* Disable and uninstall the `cups-browsed` service. For example, see the recommendations from [Red Hat](https://www.redhat.com/en/blog/red-hat-response-openprinting-cups-vulnerabilities) and [Ubuntu](https://ubuntu.com/blog/cups-remote-code-execution-vulnerability-fix-available).
* Ensure your CUPS packages are updated to the latest versions available for your distribution.
* If updating isn’t possible, block UDP port `631` and DNS-SD traffic from potentially impacted hosts, and investigate the aforementioned recommendations to further harden the `lp` user and group configuration on the host.

## Elastic protections

In this section, we look into detection and hunting queries designed to uncover suspicious activity linked to the currently published vulnerabilities. By focusing on process behaviors and command execution patterns, these queries help identify potential exploitation attempts before they escalate into full-blown attacks.

### cupsd or foomatic-rip shell execution

The first detection rule targets processes on Linux systems that are spawned by `foomatic-rip` and immediately launch a shell. This is effective because legitimate print jobs rarely require shell execution, making this behavior a strong indicator of malicious activity. Note: A shell may not always be an adversary’s goal if arbitrary command execution is possible. 

```
process where host.os.type == "linux" and event.type == "start" and
 event.action == "exec" and process.parent.name == "foomatic-rip" and
 process.name in ("bash", "dash", "sh", "tcsh", "csh", "zsh", "ksh", "fish") 
 and not process.command_line like ("*/tmp/foomatic-*", "*-sDEVICE=ps2write*")
```

This query managed to detect all 33 PoC attempts that we performed:

![](/assets/images/cups-overflow/image6.png "")

https://github.com/elastic/detection-rules/blob/a3e89a7fabe90a6f9ce02b58d5a948db8d231ee5/rules/linux/execution_cupsd_foomatic_rip_shell_execution.toml

### Printer user (lp) shell execution

This detection rule assumes that the default printer user (`lp`) handles the printing processes. By specifying this user, we can narrow the scope while broadening the parent process list to include `cupsd`. Although there's currently no indication that RCE can be exploited through `cupsd`, we cannot rule out the possibility.

```
process where host.os.type == "linux" and event.type == "start" and
 event.action == "exec" and user.name == "lp" and
 process.parent.name in ("cupsd", "foomatic-rip", "bash", "dash", "sh", 
 "tcsh", "csh", "zsh", "ksh", "fish") and process.name in ("bash", "dash", 
 "sh", "tcsh", "csh", "zsh", "ksh", "fish") and not process.command_line 
 like ("*/tmp/foomatic-*", "*-sDEVICE=ps2write*")
```

By focusing on the username `lp`, we broadened the scope and detected, like previously, all of the 33 PoC executions:

![](/assets/images/cups-overflow/image5.png "")

https://github.com/elastic/detection-rules/blob/a3e89a7fabe90a6f9ce02b58d5a948db8d231ee5/rules/linux/execution_cupsd_foomatic_rip_lp_user_execution.toml

### Network connection by CUPS foomatic-rip child

This rule identifies network connections initiated by child processes of `foomatic-rip`, which is a behavior that raises suspicion. Since legitimate operations typically do not involve these processes establishing outbound connections, any detected activity should be closely examined. If such communications are expected in your environment, ensure that the destination IPs are properly excluded to avoid unnecessary alerts.

```
sequence by host.id with maxspan=10s
  [process where host.os.type == "linux" and event.type == "start" 
   and event.action == "exec" and
   process.parent.name == "foomatic-rip" and
   process.name in ("bash", "dash", "sh", "tcsh", "csh", "zsh", "ksh", "fish")] 
   by process.entity_id
  [network where host.os.type == "linux" and event.type == "start" and 
   event.action == "connection_attempted"] by process.parent.entity_id
```

By capturing the parent/child relationship, we ensure the network connections originate from the potentially compromised application. 

![](/assets/images/cups-overflow/image7.png "")

https://github.com/elastic/detection-rules/blob/a3e89a7fabe90a6f9ce02b58d5a948db8d231ee5/rules/linux/command_and_control_cupsd_foomatic_rip_netcon.toml

### File creation by CUPS foomatic-rip child

This rule detects suspicious file creation events initiated by child processes of foomatic-rip. As all current proof-of-concepts have a default testing payload of writing to a file in `/tmp/`, this rule would catch that. Additionally, it can detect scenarios where an attacker downloads a malicious payload and subsequently creates a file.

```
sequence by host.id with maxspan=10s
  [process where host.os.type == "linux" and event.type == "start" and 
   event.action == "exec" and process.parent.name == "foomatic-rip" and 
   process.name in ("bash", "dash", "sh", "tcsh", "csh", "zsh", "ksh", "fish")] by process.entity_id
  [file where host.os.type == "linux" and event.type != "deletion" and
   not (process.name == "gs" and file.path like "/tmp/gs_*")] by process.parent.entity_id
```

The rule excludes `/tmp/gs_*` to account for default `cupsd` behavior, but for enhanced security, you may choose to remove this exclusion, keeping in mind that it may generate more noise in alerts.

![](/assets/images/cups-overflow/image1.png "")

https://github.com/elastic/detection-rules/blob/a3e89a7fabe90a6f9ce02b58d5a948db8d231ee5/rules/linux/execution_cupsd_foomatic_rip_file_creation.toml

### Suspicious execution from foomatic-rip or cupsd parent

This rule detects suspicious command lines executed by child processes of `foomatic-rip` and `cupsd`. It focuses on identifying potentially malicious activities, including persistence mechanisms, file downloads, encoding/decoding operations, reverse shells, and shared-object loading via GTFOBins.

```
process where host.os.type == "linux" and event.type == "start" and 
 event.action == "exec" and process.parent.name in 
 ("foomatic-rip", "cupsd") and process.command_line like (
  // persistence
  "*cron*", "*/etc/rc.local*", "*/dev/tcp/*", "*/etc/init.d*", 
  "*/etc/update-motd.d*", "*/etc/sudoers*",
  "*/etc/profile*", "*autostart*", "*/etc/ssh*", "*/home/*/.ssh/*", 
  "*/root/.ssh*", "*~/.ssh/*", "*udev*", "*/etc/shadow*", "*/etc/passwd*",
    // Downloads
  "*curl*", "*wget*",

  // encoding and decoding
  "*base64 *", "*base32 *", "*xxd *", "*openssl*",

  // reverse connections
  "*GS_ARGS=*", "*/dev/tcp*", "*/dev/udp/*", "*import*pty*spawn*", "*import*subprocess*call*", "*TCPSocket.new*",
  "*TCPSocket.open*", "*io.popen*", "*os.execute*", "*fsockopen*", "*disown*", "*nohup*",

  // SO loads
  "*openssl*-engine*.so*", "*cdll.LoadLibrary*.so*", "*ruby*-e**Fiddle.dlopen*.so*", "*Fiddle.dlopen*.so*",
  "*cdll.LoadLibrary*.so*",

  // misc. suspicious command lines
   "*/etc/ld.so*", "*/dev/shm/*", "*/var/tmp*", "*echo*", "*>>*", "*|*"
)
```

By making an exception of the command lines as we did in the rule above, we can broaden the scope to also detect the `cupsd` parent, without the fear of false positives.

![](/assets/images/cups-overflow/image2.png "")

https://github.com/elastic/detection-rules/blob/a3e89a7fabe90a6f9ce02b58d5a948db8d231ee5/rules/linux/execution_cupsd_foomatic_rip_suspicious_child_execution.toml

### Elastic’s Attack Discovery

In addition to prebuilt content published, [Elastic’s Attack Discovery](https://www.elastic.co/guide/en/security/current/attack-discovery.html) can provide context and insights by analyzing alerts in your environment and identifying threats by leveraging Large Language Models (LLMs). In the following example, Attack Discovery provides a short summary and a timeline of the activity. The behaviors are then mapped to an attack chain to highlight impacted stages and help triage the alerts.

![Elastic’s Attack Discovery summarizing findings for the CUPS Vulnerability](/assets/images/cups-overflow/image4.png "Elastic’s Attack Discovery summarizing findings for the CUPS Vulnerability")

## Conclusion

The recent CUPS vulnerability disclosure highlights the evolving threat landscape, underscoring the importance of securing services like printing. With a high CVSS score, this issue calls for immediate action, particularly given how easily these flaws can be exploited remotely. Although the service is installed by default on some UNIX OS (based on supply chain), manual user interaction is needed to trigger the printer job. We recommend that users remain vigilant, continue hunting, and not underestimate the risk. While the threat requires user interaction, if paired with a spear phishing document, it may coerce victims to print using the rogue printer. Or even worse, silently replacing existing printers or installing new ones as [indicated](https://www.evilsocket.net/2024/09/26/Attacking-UNIX-systems-via-CUPS-Part-I/#Impact) by @evilsocket.

We expect more to be revealed as the initial disclosure was labeled part 1. Ultimately, visibility and detection capabilities remain at the forefront of defensive strategies for these systems, ensuring that attackers cannot exploit overlooked vulnerabilities. 

## Key References

* [https://www.evilsocket.net/2024/09/26/Attacking-UNIX-systems-via-CUPS-Part-I/](https://www.evilsocket.net/2024/09/26/Attacking-UNIX-systems-via-CUPS-Part-I/)
* [https://github.com/RickdeJager/cupshax/blob/main/cupshax.py](https://github.com/RickdeJager/cupshax/blob/main/cupshax.py)
* [https://www.cve.org/CVERecord?id=CVE-2024-47076](https://www.cve.org/CVERecord?id=CVE-2024-47076)
* [https://www.cve.org/CVERecord?id=CVE-2024-47175](https://www.cve.org/CVERecord?id=CVE-2024-47175)
* [https://www.cve.org/CVERecord?id=CVE-2024-47176](https://www.cve.org/CVERecord?id=CVE-2024-47176)
* [https://www.cve.org/CVERecord?id=CVE-2024-47177](https://www.cve.org/CVERecord?id=CVE-2024-47177)

*The release and timing of any features or functionality described in this post remain at Elastic's sole discretion. Any features or functionality not currently available may not be delivered on time or at all.*