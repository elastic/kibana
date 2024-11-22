---
title: "Sinking macOS Pirate Ships with Elastic Behavior Detections"
slug: "sinking-macos-pirate-ships"
date: "2024-03-15"
description: "This research looks at a recently found macOS malware campaign using the macOS Endpoint Security Framework paired with the Elastic Agent to hunt and detect the behaviors this malware exhibits."
author:
  - slug: colson-wilhoit
image: "photo-edited-01@2x.jpg"
category:
  - slug: attack-pattern
tags:
  - macOS
---

## Preamble

On January 12, 2024, Malwrhunterteam, an X account that surfaces interesting malware samples, usually found via VirusTotal, released a [Tweet](https://twitter.com/malwrhunterteam/status/1745959438140297697) about a pirated macOS application that appeared to contain malicious capabilities. macOS security researcher Patrick Wardle quickly released a [write-up](https://objective-see.org/blog/blog_0x79.html) detailing the application’s malicious functionality, which included dropping second and third-stage payloads. Shortly after, the team at JAMF Threat Labs released a [blog](https://jamf.com/blog/jtl-malware-pirated-applications/) that captured several additional sibling samples that JAMF had been tracking before the Malwrhunterteam tweet, delving deep into the internals and core functionality this malware provides. If you have not read both of these great write-ups, there are a lot of helpful details and background information in these sources that will add context to the rest of this analysis.

This publication will not cover the malware internals or related samples. Instead, we will look to provide practical, resilient detection and threat hunting guidance that can enable you to alert on the actions taken by this, or similarly related, malware. Signature-based detections commonly fall short of such capabilities; however, we will highlight how our behavior rules deal with this.

We will be breaking down the malware's actions in each stage and analyzing how we can use the data from the macOS [Endpoint Security Framework (ESF)](https://developer.apple.com/documentation/endpointsecurity) and the Elastic Agent to build these detections. Let's dig in.

![UltraEdit execution flow](/assets/images/sinking-macos-pirate-ships/image4.png "image_tooltip")


## UltraEdit

The [UltraEdit](https://www.ultraedit.com/) application (a legitimate text and hex editor) was pirated (altered and then abused to facilitate malware distribution) along with several other applications and distributed via a disk image file (`.dmg`). 

Upon executing the pirated version of the application, it immediately loads a 3rd party, _unsigned_ dylib (macOS shared library) called `libConfigurer64.dylib`. This dylib acts as a dropper whose goal is to download and execute follow-on payloads. The dylib downloads and executes two hidden files:  `/private/tmp/.test` and `/Users/Shared/.fseventsd`. 

Looking at the initial actions taken by the application, we can see the unsigned 3rd party dylib load takes place immediately post-execution in the Analyzer View of the Elastic Security Solution. This is an important event to focus on because it is the only non-system library loaded. 

![UltraEdit Dylib Load Event](/assets/images/sinking-macos-pirate-ships/image8.png "image_tooltip")


In version 8.11, Elastic Defend introduced a first-of-its-kind dylib load event for the macOS Elastic Agent, allowing us to capture library loads and details regarding those libraries, such as dylib signature data. With this powerful new visibility, we can quickly build an [Event Query Language (EQL)](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql.html) query that looks for unsigned dylib loads from a volume mount or the applications directory structure. 

**Rule Name: Application Unsigned Dylib Load**
```
library where event.action == "load" and dll.path :  
("/Volumes/*.app/Contents/*", "/Applications/*.app/Contents/*") 
and dll.code_signature.exists == false
```

![Application Unsigned Dylib Load Detection Event](/assets/images/sinking-macos-pirate-ships/image5.png "image_tooltip")


We can and should take this a step further to identify only untrusted or unsigned processes that are loading an unsigned library. This will reduce the amount of false positives and still accurately capture the event taking place.

**Rule Name: Unsigned or Untrusted Application Unsigned Dylib Load**
```
library where event.action == "load" and  
(process.code_signature.exists == false or process.code_signature.trusted == false)  
and dll.path : ("/Volumes/*.app/Contents/*", "/Applications/*.app/Contents/*") and  
dll.code_signature.exists == false
```

We now have a behavior-based detection that triggers on the unsigned process that loads the unsigned dylib and alerts us to its presence. 

Let’s look at the additional payloads and their actions to see if we can build any additional detections.

### .test

The `.test` binary gets placed in the temporary directory, post download (`/private/tmp/.test`), and executed with process arguments containing a path to an SSH binary. Noted by JAMF Threat Labs, this SSH binary is not in the default location of the SSH binary on macOS, which really resides at /`usr/bin/ssh`. This command line does not correlate with any intended functionality but rather an attempt to blend in.

As Patrick Wardle and JAMF stated, this binary is a macOS build of the open source, cross-platform post-exploitation agent known as [Khepri](https://github.com/geemion/Khepri) and provides full backdoor access to a target system.

![Elastic Analyzer View True Process Tree](/assets/images/sinking-macos-pirate-ships/image6.png "image_tooltip")


From a detection perspective, we could create a very specific query here that looks for hidden binaries (files prefixed with a period are hidden from the user’s view in the GUI and CLI) executing from suspicious locations that contain process arguments containing the path to the SSH binary. 

The issue with creating a query like this is that, as JAMF pointed out:

> one particularly interesting technique that the malware uses is replacing its command-line arguments to further blend in with the operating system.

The malware updates these process arguments between samples, so while this query might detect one of the samples, they could easily change it and bypass this detection. 

Instead of the process arguments, we could focus on the unsigned, hidden binary executing from a suspicious directory like `/tmp`. 

**Rule Name: Untrusted or Unsigned Hidden Binary Executed from Temporary Directory**

```
process where event.type == "start" and event.action == "exec" and  
process.executable : ("/private/tmp/*", "/tmp/*") and  
process.name : ".*" and (process.code_signature.exists == false or  
process.code_signature.trusted == false)
```

With the above rule, if any hidden unsigned or untrusted binaries attempt to execute from a temporary directory, we will be alerted irrespective of whether our signature or our machine learning models detect it. 

![Hidden Binary Executed from Temporary Directory Detection Event Example](/assets/images/sinking-macos-pirate-ships/image1.png "image_tooltip")


(A note on false positives: It will happen, even though it should be extremely rare, to see hidden binaries executing from a temporary directory on macOS. There are many developers on macOS that adopt poor software development practices. False positives should be reviewed case-by-case and only excluded via the rule or Elastic exclusion list if the software is business-approved and validated.)

In addition to this rule, since the hidden payloads make outbound command and control network connections, we could also look for any outbound network connections from a hidden executable, as that is very suspicious activity on macOS and should warrant an alert at least. If you want to reduce the possibility of false positives, specify specific process executable directories like `/Users/Shared/` or `/tmp/` etc., or include process code signature data specifying unsigned or untrusted hidden executables. 

**Rule Name: Hidden Executable Outbound Network Connection**

```
network where event.type == "start" and 
event.action == “connection_attempted” and process.name : ".*"
```

Since this is a backdoor payload that offers a variety of functionality (upload, download, etc.), it would be prudent to create additional rules that look for some of these actions from an unsigned or untrusted, hidden binary. Since we already have a rule that would detect the hidden binary's initial execution, we will move on to the next payload.

### .fseventsd

`.fseventsd` was the second payload dropped by the malicious dylib at (`/Users/Shared/.fseventsd`). This payload’s purpose was to provide a persistent foothold on the victim’s machine utilizing a masqueraded launch agent and to act as a downloader for another payload that has yet to be found. Still, we know from reverse engineering of `.fseventsd` is named (`.fseventsds`).

We can see via the Elastic Analyzer View the first notable event is the persistence installation of a masqueraded launch agent. 

![Elastic Analyzer View Process Dylib Load](/assets/images/sinking-macos-pirate-ships/image9.png "image_tooltip")


This activity can be tackled from two different angles. We could first detect this by looking for the masqueraded `.plist` file utilizing file events and process code signature data. In the below behavior rule, we look for files where the file name starts with `com.apple…` and the file path is a `Library/LaunchAgent` or `Library/LaunchDaemon`, and the responsible process is unsigned or untrusted. 

**Rule Name: Persistence via a Masqueraded Plist Filename**

```
file where event.type != "deletion" and 
 file.name : "*com.apple*.plist" and
 file.path :
       ("/System/Library/LaunchAgents/*", 
        "/Library/LaunchAgents/*",
        "/Users/*/Library/LaunchAgents/*",
        "/System/Library/LaunchDaemons/*",
        "/Library/LaunchDaemons/*") and
(process.code_signature.trusted == false or  
process.code_signature.exists == false)
```

![Persistence via a Masqueraded Plist Filename Detection Event](/assets/images/sinking-macos-pirate-ships/image2.png "image_tooltip")


The second way we can detect this persistent install technique is to take advantage of another new data source unique to Elastic Agent, which my colleague Ricardo Ungureanu and I added to version 8.6 of Elastic Defend. We created an aptly named persistence event that monitors the launch services directories and collects the plist details, sending them back in a structured event that can be used to create rules around suspicious or malicious Launch Agents or Daemons. 

In the following rule, we look for launch events where the `runatload` value is set to `true` or the `keepalive` value is set to `true`. The plist arguments contain the path to a hidden executable in the `/Users/Shared` directory. This rule could be expanded to include additional suspicious or malicious arguments that would alert you to the installation of persistence by a malicious or suspicious binary. 

**Rule Name: Persistence via Suspicious Launch Agent or Launch Daemon**

```
file where event.action == "launch_daemon" and  
(Persistence.runatload == true or Persistence.keepalive == true) and 
  Persistence.args : "/Users/Shared/.*"
```

![Persistence via Suspicious Launch Agent or Launch Daemon Detection Event](/assets/images/sinking-macos-pirate-ships/image3.png "image_tooltip")


The masqueraded plist could also be detected using this persistence event using the below query.

```
file where event.action == "launch_daemon" and  
Persistence.name : "com.apple.*" and  
(process.code_signature.exists == false or 
process.code_signature.trusted == false)
```

The final piece here is the downloading of the missing 3rd stage payload. The hidden `.fseventsd` located in the `/Users/Shared` folder reaches out to download this new hidden payload to the `/tmp/` directory. You might remember we already created two rules (“Hidden Binary Executed from Temporary Directory” and “Hidden Executable Outbound Network Connection”) that would detect this activity. 

We could add another rule to catch when a hidden executable is created in a suspicious directory. We can look for any file event where the event action is not the deletion of the file, the file name denotes a hidden file, the file contains Mach-O header bytes, and the file path is a path where the execution of a hidden file is not common. We collect file header bytes if the file is an executable, allowing us to denote executable files from other types of files not based solely on the file extension.

**Rule Name: Hidden Executable Created in Unusual Directory**

```
file where event.action != "deletion" and file.name : ".*" and 
file.Ext.header_bytes : ("cffaedfe*", "cafebabe*") and 
file.path : ("/Users/Shared/*", "/private/tmp/*", "/tmp/*")
```

![Elastic Behavior Based Defense](/assets/images/sinking-macos-pirate-ships/image7.png "image_tooltip")


## Summary

This malware is representative of many campaigns targeting macOS today. Our report on the DPRK malware KANDYKORN shows that these campaigns are modular, encompassing multiple stages of payloads with capabilities and functionality distributed between these payloads to avoid detection. You can see that with UltraEdit, one payload serves as the interactive backdoor and the other as the persistence mechanism. Malware like this can often easily update to avoid signatures. Still, as we have shown, behavior rules are unavoidable and allow us to bridge the gap between static signatures and machine learning models. 

Behavior-based rules are very powerful if you have the right data and the ability to correlate that data. Our endpoint behavior rules can detect and prevent malware regardless of whether it updates or not. We have over 200+ endpoint behavior rules on macOS alone, including versions of those shown in this publication, that allow us to detect and prevent previously “undetected” malware by observing its actions in real time. If you want to check out our production endpoint behavior rules, they can be found [here](https://github.com/elastic/protections-artifacts). To learn more about our query languages, you can look here ([EQL](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql.html) and [ES|QL](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql-getting-started.html)). We are proud to be an open source company and want to let our software and features speak for themselves. If you want to test and explore these features for yourself, you can easily create an [Elastic Cloud](https://www.elastic.co/cloud) Account with a 30-day trial license, or for local testing, you can download “[The Elastic Container Project](https://github.com/peasead/elastic-container)” and set the license value to trial in the `.env` file. 

## References

* [https://twitter.com/malwrhunterteam/status/1745959438140297697](https://twitter.com/malwrhunterteam/status/1745959438140297697)
* [https://objective-see.org/blog/blog_0x79.html](https://objective-see.org/blog/blog_0x79.html)
* [https://jamf.com/blog/jtl-malware-pirated-applications](https://jamf.com/blog/jtl-malware-pirated-applications/)
* [https://developer.apple.com/documentation/endpointsecurity](https://developer.apple.com/documentation/endpointsecurity) 