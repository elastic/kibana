---
title: "Dissecting REMCOS RAT: An in-depth analysis of a widespread 2024 malware, Part Three"
slug: "dissecting-remcos-rat-part-three"
date: "2024-05-03"
subtitle: "Part three: Configuration and commands"
description: "In previous articles in this multipart series, malware researchers on the Elastic Security Labs team dove into the REMCOS execution flow. In this article, you’ll learn more about REMCOS configuration structure and its C2 commands."
author:
  - slug: cyril-francois
  - slug: samir-bousseaden
image: "Security Labs Images 14.jpg"
category:
  - slug: malware-analysis
tags:
  - malware-analysis
  - remcos
---

In [previous](https://www.elastic.co/security-labs/dissecting-remcos-rat-part-one) [articles](https://www.elastic.co/security-labs/dissecting-remcos-rat-part-two) in this multipart series, malware researchers on the Elastic Security Labs team analyzed REMCOS execution flow, detailing its recording capabilities and its communication with  C2. In this article, you’ll learn more about REMCOS configuration structure and its C2 commands.

## The configuration

In this section, we provide a comprehensive overview of the configuration fields of the malware.

### Configuration Table

Researchers successfully recovered approximately 80% of the configuration structure (45 out of 56 fields). We provide detailed configuration information in the following table:


| Index | Name | Description |
| --- | --- | --- |
| 0x0 | c2_list | String containing “domain:port:enable_tls“ separated by the “\x1e” character |
| 0x1 | botnet | Name of the botnet |
| 0x2 | connect_interval | Interval in second between connection attempt to C2 |
| 0x3 | enable_install_flag | Install REMCOS on the machine host |
| 0x4 | enable_hkcu_run_persistence_flag | Enable setup of the persistence in the registry |
| 0x5 | enable_hklm_run_persistence_flag | Enable setup of the persistence in the registry |
| 0x7 | keylogger_maximum_file_size | Maximum size of the keylogging data before rotation |
| 0x8 | enable_hklm_policies_explorer_run_flag | Enable setup of the persistence in the registry |
| 0x9 | install_parent_directory |  Parent directory of the install folder. Integer mapped to an hardcoded path |
| 0xA | install_filename | Name of the REMCOS binary once installed |
| 0xC | enable_persistence_directory_and_binary_hidding_flag | Enable super hiding the install directory and binary as well as setting them to read only |
| 0xD | enable_process_injection_flag | Enable running the malware injected in another process |
| 0xE | mutex | String used as the malware mutex and registry key |
| 0xF | keylogger_mode | Set keylogging capability. Keylogging mode, 0 = disabled, 1 = keylogging everything, 2 = keylogging specific window(s) |
| 0x10 | keylogger_parent_directory | Parent directory of the keylogging folder. Integer mapped to an hardcoded path |
| 0x11 | keylogger_filename | Filename of the keylogged data |
| 0x12 | enable_keylogger_file_encryption_flag | Enable encryption RC4 of the keylogger data file |
| 0x13 | enable_keylogger_file_hidding_flag | Enable super hiding of the keylogger data file |
| 0x14 | enable_screenshot_flag | Enable screen recording capability |
| 0x15 | screenshot_interval_in_minutes | The time interval in minute for capturing each screenshot  |
| 0x16 | enable_screenshot_specific_window_names_flag | Enable screen recording for specific window names |
| 0x17 | screenshot_specific_window_names | String containing window names separated by the “;” character |
| 0x18 | screenshot_specific_window_names_interval_in_seconds | The time interval in second for capturing each screenshot when a specific window name is found in the current foreground window title |
| 0x19 | screenshot_parent_directory | Parent directory of the screenshot folder. Integer mapped to an hardcoded path |
| 0x1A | screenshot_folder | Name of the screenshot folder |
| 0x1B | enable_screenshot_encryption_flag | Enable encryption of screenshots |
| 0x23 | enable_audio_recording_flag | Enable audio recording capability |
| 0x24 | audio_recording_duration_in_minutes | Duration in second of each audio recording |
| 0x25 | audio_record_parent_directory | Parent directory of the audio recording folder. Integer mapped to an hardcoded path |
| 0x26 | audio_record_folder | Name of the audio recording folder |
| 0x27 | disable_uac_flag | Disable UAC in the registry |
| 0x28 | logging_mode | Set logging mode: 0 = disabled, 1 = minimized in tray, 2 = console logging |
| 0x29 | connect_delay_in_second | Delay in second before the first connection attempt to the C2 |
| 0x2A | keylogger_specific_window_names | String containing window names separated by the “;” character |
| 0x2B | enable_browser_cleaning_on_startup_flag | Enable cleaning web browsers’ cookies and logins on REMCOS startup |
| 0x2C | enable_browser_cleaning_only_for_the_first_run_flag | Enable web browsers cleaning only on the first run of Remcos |
| 0x2D | browser_cleaning_sleep_time_in_minutes | Sleep time in minute before cleaning the web browsers |
| 0x2E | enable_uac_bypass_flag | Enable UAC bypass capability |
| 0x30 | install_directory | Name of the install directory |
| 0x31 | keylogger_root_directory | Name of the keylogger directory |
| 0x32 | enable_watchdog_flag | Enable watchdog capability |
| 0x34 | license | License serial |
| 0x35 | enable_screenshot_mouse_drawing_flag | Enable drawing the mouse on each screenshot |
| 0x36 | tls_raw_certificate | Certificate in raw format used with tls enabled C2 communication |
| 0x37 | tls_key | Key of the certificate |
| 0x38 | tls_raw_peer_certificate | C2 public certificate in raw format |

### Integer to path mapping

REMCOS utilizes custom mapping for some of its "folder" fields instead of a string provided by the user.

![](/assets/images/dissecting-remcos-rat-part-three/image70.png)

We provide details of the mapping below:

| Value | Path |
| --- | --- |
| 0 | %Temp% |
| 1 | Current malware directory |
| 2 | %SystemDrive% |
| 3 | %WinDir% |
| 4 | %WinDir%//SysWOW64|system32 |
| 5 | %ProgramFiles% |
| 6 | %AppData% |
| 7 | %UserProfile% |
| 8 | %ProgramData%|%ProgramFiles% |

### Configuration extraction, an inside perspective

We enjoy building tools, and we'd like to take this opportunity to provide some insight into the type of tools we develop to aid in our analysis of malware families like REMCOS.

We developed a configuration extractor called "conf-tool", which not only extracts and unpacks the configuration from specific samples but can also repackage it with modifications.

![```conf-tool``` help screen](/assets/images/dissecting-remcos-rat-part-three/image28.png)


First, we unpack the configuration.

![Unpacking the configuration](/assets/images/dissecting-remcos-rat-part-three/image35.png)


The configuration is saved to the disk as a JSON document, with each field mapped to its corresponding type.

![Dumped configuration in JSON format](/assets/images/dissecting-remcos-rat-part-three/image86.png)


We are going to replace all the domains in the list with the IP address of our C2 emulator to initiate communication with the sample.

![Setting our IP in the C2 list](/assets/images/dissecting-remcos-rat-part-three/image44.png)


We are also enabling the logging mode to console (2):

![Setting logging mode to console in the configuration](/assets/images/dissecting-remcos-rat-part-three/image37.png)


Once we're done, repack everything:
![Repacking the configuration in the REMCOS sample](/assets/images/dissecting-remcos-rat-part-three/image35.png)


And voilà, we have the console, and the sample attempts to connect to our emulator!

![REMCOS console](/assets/images/dissecting-remcos-rat-part-three/image65.png)


We are releasing a [REMCOS malware configuration extractor](https://github.com/elastic/labs-releases/tree/main/extractors/remcos) that includes some of these features.

## C2 commands

In this section, we present a list of all the commands we've reversed that are executable by the Command and Control (C2). Furthermore, we provide additional details for a select subset of commands.

### Command table

Researchers recovered approximately 95% of the commands (74 out of 78). We provide information about the commands in the following table:

| Function | Name |
| --- | --- |
| 0x1 | HeartBeat |
| 0x2 | DisableKeepAlive |
| 0x3 | ListInstalledApplications |
| 0x6 | ListRunningProcesses |
| 0x7 | TerminateProcess |
| 0x8 | ListProcessesWindows |
| 0x9 | CloseWindow |
| 0xA | ShowWindowMaximized |
| 0xB | ShowWindowRestore |
| 0xC | TerminateProcessByWindowHandleAndListProcessesWindows |
| 0xD | ExecuteShellCmd |
| 0xE | StartPipedShell |
| 0xF | ExecuteProgram |
| 0x10 | MaybeUploadScreenshots |
| 0x11 | GetHostGeolocation |
| 0x12 | GetOfflineKeyloggerInformation |
| 0x13 | StartOnlineKeylogger |
| 0x14 | StopOnlineKeylogger |
| 0x15 | MaybeSetKeyloggerNameAndUploadData |
| 0x16 | UploadKeyloggerData |
| 0x17 | DeleteKeyloggerDataThenUploadIfAnythingNewInbetween |
| 0x18 | CleanBrowsersCookiesAndLogins |
| 0x1B | StartWebcamModule |
| 0x1C | StopWebcamModule |
| 0x1D | EnableAudioCapture |
| 0x1E | DisableAudioCapture |
| 0x1F | StealPasswords |
| 0x20 | DeleteFile |
| 0x21 | TerminateSelfAndWatchdog |
| 0x22 | Uninstall |
| 0x23 | Restart |
| 0x24 | UpdateFromURL |
| 0x25 | UpdateFromC2 |
| 0x26 | MessageBox |
| 0x27 | ShutdownOrHibernateHost |
| 0x28 | UploadClipboardData |
| 0x29 | SetClipboardToSpecificData |
| 0x2A | EmptyClipboardThenUploadIfAnythingInbetween |
| 0x2B | LoadDllFromC2 |
| 0x2C | LoadDllFromURL |
| 0x2D | StartFunFuncModule |
| 0x2F | EditRegistry |
| 0x30 | StartChatModule |
| 0x31 | SetBotnetName |
| 0x32 | StartProxyModule |
| 0x34 | ManageService |
| 0x8F | SearchFile |
| 0x92 | SetWallpaperFromC2 |
| 0x94 | SetWindowTextThenListProcessesWindow |
| 0x97 | UploadDataFromDXDiag |
| 0x98 | FileManager |
| 0x99 | ListUploadScreenshots |
| 0x9A | DumpBrowserHistoryUsingNirsoft |
| 0x9E | TriggerAlarmWav |
| 0x9F | EnableAlarmOnC2Disconnect |
| 0xA0 | DisableAlarmOnC2Disconnect |
| 0xA2 | DownloadAlarmWavFromC2AndOptPlayIt |
| 0xA3 | AudioPlayer |
| 0xAB | ElevateProcess |
| 0xAC | EnableLoggingConsole |
| 0xAD | ShowWindow |
| 0xAE | HideWindow |
| 0xB2 | ShellExecuteOrInjectPEFromC2OrURL |
| 0xC5 | RegistrySetHlightValue |
| 0xC6 | UploadBrowsersCookiesAndPasswords |
| 0xC8 | SuspendProcess |
| 0xC9 | ResumeProcess |
| 0xCA | ReadFile |
| 0xCB | WriteFile |
| 0xCC | StartOfflineKeylogger |
| 0xCD | StopOfflineKeylogger |
| 0xCE | ListProcessesTCPandUDPTables |

### ListInstalledApplications command

To list installed applications, REMCOS iterates over the ```Software\Microsoft\Windows\CurrentVersion\Uninstall``` registry key. For each subkey, it queries the following values:

 - ```DisplayName```
 - ```Publisher```
 - ```DisplayVersion```
 - ```InstallLocation```
 - ```InstallDate```
 - ```UninstallString```

![```0x41C68F``` REMCOS listing installed applications](/assets/images/dissecting-remcos-rat-part-three/image61.png)


### ExecuteShellCmd command
Shell commands are executed using the ShellExecuteW API with ```cmd.exe /C {command}``` as arguments.

![Executing a shell command using ```ShellExecuteW``` with ```cmd.exe```](/assets/images/dissecting-remcos-rat-part-three/image19.png)


### GetHostGeolocation command
To obtain host geolocation, REMCOS utilizes the [geoplugin.net](http://geoplugin.net) API and directly uploads the returned JSON data.

![Requesting geolocation information from geoplugin.net](/assets/images/dissecting-remcos-rat-part-three/image91.png)


### StartOnlineKeylogger command

The online keylogger employs the same keylogger structure as the offline version. However, instead of writing the data to the disk, the data is sent live to the C2.

![```0x40AEEE``` Initialization of the online keylogger](/assets/images/dissecting-remcos-rat-part-three/image23.png)


### StartWebcamModule command

REMCOS uses an external module for webcam recording. This module is a DLL that must be received and loaded from its C2 as part of the command parameters.

![```0x404582``` REMCOS loading the webcam module from C2](/assets/images/dissecting-remcos-rat-part-three/image93.png)



Once the module is loaded, you can send a sub-command to capture and upload a webcam picture.

![```0x4044F5``` Sub-command handler for capturing and uploading pictures](/assets/images/dissecting-remcos-rat-part-three/image52.png)


### StealPasswords command

Password stealing is likely carried out using 3 different [Nirsoft](https://www.nirsoft.net/) binaries, identified by the "/sext" parameters. These binaries are received from the C2 and injected into a freshly created process. Both elements are part of the command parameters.

![```0x412BAA``` REMCOS injects one of the Nirsoft binary into a freshly created process](/assets/images/dissecting-remcos-rat-part-three/image72.png)


The ```/sext``` parameter instructs the software to write the output to a file, each output filename is randomly generated and stored in the malware installation folder. Once their contents are read and uploaded to the C2, they are deleted.

![```0x412B12``` Building random filename for the Nirsoft output file](/assets/images/dissecting-remcos-rat-part-three/image87.png)


![Read and delete the output file](/assets/images/dissecting-remcos-rat-part-three/image98.png)


An additional DLL, with a [FoxMailRecovery](https://github.com/jacobsoo/FoxmailRecovery) export, can also be utilized. Like the other binaries, the DLL is received from the C2 as part of the command parameters. As the name implies the DLLis likely to be used to dump FoxMail data

![Loading additional dll with FoxMailRecovery export](/assets/images/dissecting-remcos-rat-part-three/image17.png)


### Uninstall command

The uninstall command will delete all Remcos-related files and persistence registry keys from the host machine.

First, it kills the watchdog process.
![```0x040D0A0``` Killing the watchdog process](/assets/images/dissecting-remcos-rat-part-three/image38.png)


Then, it deletes all the recording files (keylogging, screenshots, and audio recordings).

![```0x40D0A5``` Deleting * recording files](/assets/images/dissecting-remcos-rat-part-three/image88.png)


Then, it deletes its registry persistence keys.

![```0x40D0EC``` Deleting * persistence keys](/assets/images/dissecting-remcos-rat-part-three/image47.png)


Finally, it deletes its installation files by creating and executing a Visual Basic script in the %TEMP% folder with a random filename, then terminates its process.

![```0x40D412``` Executing the delete visual basic script and exit](/assets/images/dissecting-remcos-rat-part-three/image75.png)


Below the generated script with comments.

```
' Continue execution even if an error occurs
On Error Resume Next

' Create a FileSystemObject
Set fso = CreateObject("Scripting.FileSystemObject")

' Loop while the specified file exists
while fso.FileExists("C:\Users\Cyril\Desktop\corpus\0af76f2897158bf752b5ee258053215a6de198e8910458c02282c2d4d284add5.exe")

' Delete the specified file
fso.DeleteFile "C:\Users\Cyril\Desktop\corpus\0af76f2897158bf752b5ee258053215a6de198e8910458c02282c2d4d284add5.exe"

' End of the loop
wend

' Delete the script itself
fso.DeleteFile(Wscript.ScriptFullName)
```

### Restart command

The Restart command kills the watchdog process and restarts the REMCOS binary using a generated Visual Basic script.

Below is the generated script with comments.

```
' Create a WScript.Shell object and run a command in the command prompt
' The command runs the specified .exe file
' The "0" argument means the command prompt window will not be displayed
CreateObject("WScript.Shell").Run "cmd /c ""C:\Users\Cyril\Desktop\corpus\0af76f2897158bf752b5ee258053215a6de198e8910458c02282c2d4d284add5.exe""", 0

' Create a FileSystemObject and delete the script itself
CreateObject("Scripting.FileSystemObject").DeleteFile(Wscript.ScriptFullName)
```

## DumpBrowserHistoryUsingNirsoft command

Like the StealPasswords command, the DumpBrowserHistoryUsingNirsoft command steals browser history using likely another Nirsoft binary received from the C2 as part of the command parameter. Again, we identify the binary as part of Nirsoft because of the ```/stext``` parameter.

![```0x40404C``` Dumping browsers history using likely Nirsoft binary](/assets/images/dissecting-remcos-rat-part-three/image46.png)


### ElevateProcess command

The ElevateProcess command, if the process isn’t already running with administrator privileges, will set the ```HKCU/SOFTWARE/{mutex}/elev``` registry key and restart the malware using the same method as the Restart command.

![```0x416EF6``` Set the ```elev``` registry key and restart](/assets/images/dissecting-remcos-rat-part-three/image26.png)


Upon restart, the REMCOS checks the ```elev``` value as part of its initialization phase. If the value exists, it'll delete it and utilize its UAC bypass feature to elevate its privileges.

![```0x40EC39``` Forced UAC bypass if the ```elev``` key exists in the registry](/assets/images/dissecting-remcos-rat-part-three/image95.png)


That’s the end of the third article. In the final part we’ll cover detection and hunt strategies of REMCOS using Elastic technologies.
