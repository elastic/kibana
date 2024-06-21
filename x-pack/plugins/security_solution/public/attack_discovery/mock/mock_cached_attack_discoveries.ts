/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CachedAttackDiscoveries } from '../pages/session_storage';

export const mockCachedAttackDiscoveries: Record<string, CachedAttackDiscoveries> = {
  testClaudeV3SonnetUsWest2: {
    connectorId: 'testClaudeV3SonnetUsWest2',
    attackDiscoveries: [
      {
        alertIds: [
          '382d546a7ba5ab35c050f106bece236e87e3d51076a479f0beae8b2015b8fb26',
          'ca9da6b3b77b7038d958b9e144f0a406c223a862c0c991ce9782b98e03a98c87',
          '5301f4fb014538df7ce1eb9929227dde3adc0bf5b4f28aa15c8aa4e4fda95f35',
          '1459af4af8b92e1710c0ee075b1c444eaa927583dfd71b42e9a10de37c8b9cf0',
          '468457e9c5132aadae501b75ec5b766e1465ab865ad8d79e03f66593a76fccdf',
          'fb92e7fa5679db3e91d84d998faddb7ed269f1c8cdc40443f35e67c930383d34',
          '28021a7aca7de03018d820182c9784f8d5f2e1b99e0159177509a69bee1c3ac0',
          '03e0f8f1598018da8143bba6b60e6ddea30551a2286ba76d717568eed3d17a66',
        ],
        detailsMarkdown:
          'The following attack progression appears to have occurred:\n\n- A malicious application named "My Go Application.app" was executed on the macOS host {{ host.name 49b41e83-5c66-4fb0-a5f3-65a48c3a964c }}. This application is likely malware and failed code signature checks.\n- The malware dropped a malicious executable named "unix1" to the path {{ file.path /Users/james/unix1 }} and changed its permissions to be executable.\n- The malware then executed the "unix1" malware, which attempted to access the user\'s login keychain file at {{ file.path /Users/james/library/Keychains/login.keychain-db }} with the password "TempTemp1234!!" in an attempt to steal credentials.\n- Additionally, the malware spawned a new process using the "osascript" utility to display a fake system dialog prompting the user {{ user.name b6dd5c5e-bb66-4730-99bf-165b498ad7c3 }} for their password, likely in an attempt to phish credentials.\n\nThis appears to be a multi-stage malware attack involving credential theft and phishing techniques targeting the macOS host. The malware exhibited behavior associated with the MITRE ATT&CK tactics of Credential Access, Execution, and Defense Evasion.',
        entitySummaryMarkdown:
          'A multi-stage malware attack occurred on the host {{ host.name 49b41e83-5c66-4fb0-a5f3-65a48c3a964c }} targeting the user {{ user.name b6dd5c5e-bb66-4730-99bf-165b498ad7c3 }}.',
        id: '649c4cd3-ce5f-4cca-a32d-8068ae079d9d',
        mitreAttackTactics: ['Credential Access', 'Execution', 'Defense Evasion'],
        summaryMarkdown:
          'A multi-stage malware attack occurred on a macOS host {{ host.name 49b41e83-5c66-4fb0-a5f3-65a48c3a964c }} involving credential theft and phishing techniques targeting the user {{ user.name b6dd5c5e-bb66-4730-99bf-165b498ad7c3 }}. The malware exhibited behavior associated with the MITRE ATT&CK tactics of Credential Access, Execution, and Defense Evasion.',
        title: 'Malware Attack with Credential Theft on macOS',
      },
      {
        alertIds: [
          '8772effc4970e371a26d556556f68cb8c73f9d9d9482b7f20ee1b1710e642a23',
          '63c761718211fa51ea797669d845c3d4f23b1a28c77a101536905e6fd0b4aaa6',
          'eaf9991c83feef7798983dc7cacda86717d77136a3a72c9122178a03ce2f15d1',
          'fad83b4223f3c159646ad22df9877b9c400f9472655e49781e2a5951b641088e',
          'f7044f707ac119256e5a0ccd41d451b51bca00bdc6899c7e5e8e1edddfeb6774',
        ],
        detailsMarkdown:
          'The following attack progression appears to have occurred:\n\n- A malicious Microsoft Office document was opened on the Windows host {{ host.name 67620b3f-4c97-4afa-ac21-149a7fcc91f6 }} by the user {{ user.name 28ea48ac-d798-4c43-835a-a5f38618ee54 }}.\n- The malicious document spawned a child process "wscript.exe" which wrote a suspicious VBScript file named "AppPool.vbs" to the path {{ file.path C:\\ProgramData\\WindowsAppPool\\AppPool.vbs }}.\n- The VBScript file was then executed, which spawned a PowerShell process running obfuscated code from the file {{ file.path C:\\ProgramData\\WindowsAppPool\\AppPool.ps1 }}.\n- The PowerShell script created a scheduled task to periodically execute the malicious VBScript for persistence.\n\nThis appears to be a malware attack initiated through a malicious Microsoft Office document, likely delivered via phishing. The attack involved multiple stages of execution, obfuscation, and persistence mechanisms. The behavior exhibited is associated with the MITRE ATT&CK tactics of Initial Access, Execution, Defense Evasion, and Command and Control.',
        entitySummaryMarkdown:
          'A multi-stage malware attack occurred on the host {{ host.name 67620b3f-4c97-4afa-ac21-149a7fcc91f6 }} targeting the user {{ user.name 28ea48ac-d798-4c43-835a-a5f38618ee54 }}.',
        id: '165274f2-f21f-447a-9cce-0927617edf78',
        mitreAttackTactics: [
          'Initial Access',
          'Execution',
          'Defense Evasion',
          'Command and Control',
        ],
        summaryMarkdown:
          'A multi-stage malware attack occurred on a Windows host {{ host.name 67620b3f-4c97-4afa-ac21-149a7fcc91f6 }} initiated through a malicious Microsoft Office document targeting the user {{ user.name 28ea48ac-d798-4c43-835a-a5f38618ee54 }}. The attack involved execution, obfuscation, and persistence mechanisms associated with the MITRE ATT&CK tactics of Initial Access, Execution, Defense Evasion, and Command and Control.',
        title: 'Malware Attack via Malicious Office Document',
      },
      {
        alertIds: [
          '8bbacdb2026c6de17c99f0634be5a9cc2aa433aaabea96c5fed289a9589c3a54',
          'd1b8b1c6f891fd181af236d0a81b8769c4569016d5b341cdf6a3fefb7cf9cbfd',
          '005f2dfb7efb08b34865b308876ecad188fc9a3eebf35b5e3af3c3780a3fb239',
          '7e41ddd221831544c5ff805e0ec31fc3c1f22c04257de1366112cfef14df9f63',
        ],
        detailsMarkdown:
          'The following attack progression appears to have occurred:\n\n- A malicious installer package was executed on the Windows host {{ host.name 86da4cae-8e76-4782-8e4f-f67401719807 }} by the user {{ user.name 28ea48ac-d798-4c43-835a-a5f38618ee54 }}.\n- The installer spawned a suspicious child process "msiexec.exe" which executed a PowerShell script from the path {{ file.path C:\\Users\\ADMINI~1\\AppData\\Local\\Temp\\2\\Package Installation Dir\\chch.ps1 }}.\n- The PowerShell script was detected as the "Windows.Trojan.Bumblebee" malware, which likely attempted to establish a network connection for command and control purposes.\n- The malicious PowerShell process exhibited behavior indicative of shellcode injection, a technique used by malware to execute malicious code in memory.\n\nThis appears to be a malware attack initiated through a malicious installer package, potentially delivered via phishing or software supply chain compromise. The attack involved multiple stages of execution, memory injection techniques, and network communication for command and control purposes. The behavior exhibited is associated with the MITRE ATT&CK tactics of Defense Evasion and Execution.',
        entitySummaryMarkdown:
          'A multi-stage malware attack occurred on the host {{ host.name 86da4cae-8e76-4782-8e4f-f67401719807 }} targeting the user {{ user.name 28ea48ac-d798-4c43-835a-a5f38618ee54 }}.',
        id: '5fa71b14-a62b-4163-b35e-e7d1f6410ca9',
        mitreAttackTactics: ['Defense Evasion', 'Execution'],
        summaryMarkdown:
          'A multi-stage malware attack occurred on a Windows host {{ host.name 86da4cae-8e76-4782-8e4f-f67401719807 }} initiated through a malicious installer package targeting the user {{ user.name 28ea48ac-d798-4c43-835a-a5f38618ee54 }}. The attack involved execution, memory injection techniques, and network communication for command and control purposes associated with the MITRE ATT&CK tactics of Defense Evasion and Execution.',
        title: 'Malware Attack via Malicious Installer Package',
      },
      {
        alertIds: [
          '12057d82e79068080f6acf268ca45c777d3f80946b466b59954320ec5f86f24a',
          '81c7c57a360bee531b1398b0773e7c4a2332fbdda4e66f135e01fc98ec7f4e3d',
        ],
        detailsMarkdown:
          'The following attack progression appears to have occurred:\n\n- A malicious executable named "kdmtmpflush" with the SHA-256 hash {{ file.hash.sha256 74ef6cc38f5a1a80148752b63c117e6846984debd2af806c65887195a8eccc56 }} was executed on the Linux host {{ host.name f9b41c56-2d48-4948-8aec-d755b520ff5d }} by the user {{ user.name 51e22fe6-b4fb-48e6-9c8e-ab1be946500a }}.\n- The malware was detected as the "Linux.Trojan.BPFDoor" malware, which is a backdoor that leverages the Berkeley Packet Filter (BPF) to hide its network communications and maintain persistence.\n- The malware was copied to the path {{ file.path /dev/shm/kdmtmpflush }}, had its permissions changed, and was executed with the "--init" argument to likely establish its malicious functionality.\n\nThis appears to be a malware attack involving the deployment of a persistent backdoor on a Linux host. The behavior exhibited is associated with the MITRE ATT&CK tactic of Execution.',
        entitySummaryMarkdown:
          'A malware attack occurred on the host {{ host.name f9b41c56-2d48-4948-8aec-d755b520ff5d }} targeting the user {{ user.name 51e22fe6-b4fb-48e6-9c8e-ab1be946500a }}.',
        id: 'b7244f2a-7f59-4f1d-970c-caae836d11cc',
        mitreAttackTactics: ['Execution'],
        summaryMarkdown:
          'A malware attack occurred on a Linux host {{ host.name f9b41c56-2d48-4948-8aec-d755b520ff5d }} involving the deployment of a persistent backdoor targeting the user {{ user.name 51e22fe6-b4fb-48e6-9c8e-ab1be946500a }}. The behavior exhibited is associated with the MITRE ATT&CK tactic of Execution.',
        title: 'Linux Backdoor Malware Deployment',
      },
    ],
    replacements: {
      'b6dd5c5e-bb66-4730-99bf-165b498ad7c3': 'james',
      '49b41e83-5c66-4fb0-a5f3-65a48c3a964c': 'SRVMAC08',
      '51e22fe6-b4fb-48e6-9c8e-ab1be946500a': 'root',
      '28ea48ac-d798-4c43-835a-a5f38618ee54': 'Administrator',
      '48fc96ef-e64c-4599-a9d4-0fdd8c351baa': 'SRVWIN07-PRIV',
      '67620b3f-4c97-4afa-ac21-149a7fcc91f6': 'SRVWIN07',
      '86da4cae-8e76-4782-8e4f-f67401719807': 'SRVWIN06',
      'f9b41c56-2d48-4948-8aec-d755b520ff5d': 'SRVNIX05',
    },
    updated: new Date('2024-06-20T14:06:55.310Z'),
  },
  '14b4f8df-e2ca-4060-81a1-3bd2a2bffc7e': {
    connectorId: '14b4f8df-e2ca-4060-81a1-3bd2a2bffc7e',
    attackDiscoveries: [
      {
        alertIds: [
          '382d546a7ba5ab35c050f106bece236e87e3d51076a479f0beae8b2015b8fb26',
          'ca9da6b3b77b7038d958b9e144f0a406c223a862c0c991ce9782b98e03a98c87',
          '5301f4fb014538df7ce1eb9929227dde3adc0bf5b4f28aa15c8aa4e4fda95f35',
          '1459af4af8b92e1710c0ee075b1c444eaa927583dfd71b42e9a10de37c8b9cf0',
          '468457e9c5132aadae501b75ec5b766e1465ab865ad8d79e03f66593a76fccdf',
          'fb92e7fa5679db3e91d84d998faddb7ed269f1c8cdc40443f35e67c930383d34',
          '28021a7aca7de03018d820182c9784f8d5f2e1b99e0159177509a69bee1c3ac0',
          '03e0f8f1598018da8143bba6b60e6ddea30551a2286ba76d717568eed3d17a66',
        ],
        detailsMarkdown:
          '- **Host**: {{ host.name 26a9599f-5663-44d5-9acc-9164281b5a10 }}\n- **User**: {{ user.name bf7cc342-2229-4951-9723-8fdd8ebf30f6 }}\n- **OS**: {{ host.os.name macOS }} {{ host.os.version 13.4 }}\n- **File**: {{ file.name unix1 }}\n- **File Path**: {{ file.path /Users/james/unix1 }}\n- **SHA256**: {{ file.hash.sha256 0b18d6880dc9670ab2b955914598c96fc3d0097dc40ea61157b8c79e75edf231 }}\n- **Process**: {{ process.name unix1 }}\n- **Command Line**: {{ process.command_line /private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/6D63F08A-011C-4511-8556-EAEF9AFD6340/d/Setup.app/Contents/MacOS/My Go Application.app }}\n- **Parent Process**: {{ process.parent.name My Go Application.app }}\n- **Parent Command Line**: {{ process.parent.command_line /private/var/folders/_b/rmcpc65j6nv11ygrs50ctcjr0000gn/T/AppTranslocation/6D63F08A-011C-4511-8556-EAEF9AFD6340/d/Setup.app/Contents/MacOS/My Go Application.app }}\n- **Alert Time**: {{ kibana.alert.original_time 2023-06-19T00:28:37.881Z }}',
        entitySummaryMarkdown:
          '{{ host.name 26a9599f-5663-44d5-9acc-9164281b5a10 }} {{ user.name bf7cc342-2229-4951-9723-8fdd8ebf30f6 }}',
        id: 'd6fc544a-09fa-47f7-b4ef-03424b2bc107',
        mitreAttackTactics: ['Credential Access', 'Execution'],
        summaryMarkdown:
          'Multiple critical alerts detected on {{ host.name 26a9599f-5663-44d5-9acc-9164281b5a10 }} involving {{ user.name bf7cc342-2229-4951-9723-8fdd8ebf30f6 }}. The alerts indicate potential malware activity and credential phishing attempts.',
        title: 'Critical Malware and Phishing Alerts',
      },
      {
        alertIds: [
          '8772effc4970e371a26d556556f68cb8c73f9d9d9482b7f20ee1b1710e642a23',
          '63c761718211fa51ea797669d845c3d4f23b1a28c77a101536905e6fd0b4aaa6',
          '55f4641a9604e1088deae4897e346e63108bde9167256c7cb236164233899dcc',
          'eaf9991c83feef7798983dc7cacda86717d77136a3a72c9122178a03ce2f15d1',
          '7e41ddd221831544c5ff805e0ec31fc3c1f22c04257de1366112cfef14df9f63',
          '005f2dfb7efb08b34865b308876ecad188fc9a3eebf35b5e3af3c3780a3fb239',
          'd1b8b1c6f891fd181af236d0a81b8769c4569016d5b341cdf6a3fefb7cf9cbfd',
          '8bbacdb2026c6de17c99f0634be5a9cc2aa433aaabea96c5fed289a9589c3a54',
        ],
        detailsMarkdown:
          '- **Host**: {{ host.name 5a7784d9-b96f-4283-ae68-1eea93466470 }}\n- **User**: {{ user.name ab49e353-fb34-410a-8221-723591c62a23 }}\n- **OS**: {{ host.os.name Windows }} {{ host.os.version 21H2 (10.0.20348.1607) }}\n- **File**: {{ file.name AppPool.vbs }}\n- **File Path**: {{ file.path C:\\ProgramData\\WindowsAppPool\\AppPool.vbs }}\n- **Process**: {{ process.name WINWORD.EXE }}\n- **Command Line**: {{ process.command_line "C:\\Program Files\\Microsoft Office\\Root\\Office16\\WINWORD.EXE" /n "C:\\Users\\Administrator\\Desktop\\9828375091\\7cbad6b3f505a199d6766a86b41ed23786bbb99dab9cae6c18936afdc2512f00.doc" /o "" }}\n- **Parent Process**: {{ process.parent.name WINWORD.EXE }}\n- **Parent Command Line**: {{ process.parent.command_line "C:\\Program Files\\Microsoft Office\\Root\\Office16\\WINWORD.EXE" /n "C:\\Users\\Administrator\\Desktop\\9828375091\\7cbad6b3f505a199d6766a86b41ed23786bbb99dab9cae6c18936afdc2512f00.doc" /o "" }}\n- **Alert Time**: {{ kibana.alert.original_time 2023-04-01T22:03:39.546Z }}',
        entitySummaryMarkdown:
          '{{ host.name 5a7784d9-b96f-4283-ae68-1eea93466470 }} {{ user.name ab49e353-fb34-410a-8221-723591c62a23 }}',
        id: '37c6dd32-b064-4a89-a513-70997a40f4b9',
        mitreAttackTactics: ['Initial Access', 'Execution', 'Defense Evasion'],
        summaryMarkdown:
          'Multiple critical alerts detected on {{ host.name 5a7784d9-b96f-4283-ae68-1eea93466470 }} involving {{ user.name ab49e353-fb34-410a-8221-723591c62a23 }}. The alerts indicate potential malware activity and suspicious script execution.',
        title: 'Critical Malware and Script Execution Alerts',
      },
      {
        alertIds: [
          '81c7c57a360bee531b1398b0773e7c4a2332fbdda4e66f135e01fc98ec7f4e3d',
          '12057d82e79068080f6acf268ca45c777d3f80946b466b59954320ec5f86f24a',
        ],
        detailsMarkdown:
          '- **Host**: {{ host.name d7a3376b-c874-48ec-abdd-06e229243451 }}\n- **User**: {{ user.name 93c3bf44-9c12-40c1-a462-ba52943505da }}\n- **OS**: {{ host.os.name Linux }} {{ host.os.version 22.04.1 }}\n- **File**: {{ file.name kdmtmpflush }}\n- **File Path**: {{ file.path /dev/shm/kdmtmpflush }}\n- **SHA256**: {{ file.hash.sha256 74ef6cc38f5a1a80148752b63c117e6846984debd2af806c65887195a8eccc56 }}\n- **Process**: {{ process.name sh }}\n- **Command Line**: {{ process.command_line sh -c /bin/rm -f /dev/shm/kdmtmpflush;/bin/cp ./74ef6cc38f5a1a80148752b63c117e6846984debd2af806c65887195a8eccc56 /dev/shm/kdmtmpflush && /bin/chmod 755 /dev/shm/kdmtmpflush && /dev/shm/kdmtmpflush --init && /bin/rm -f /dev/shm/kdmtmpflush }}\n- **Parent Process**: {{ process.parent.name sh }}\n- **Parent Command Line**: {{ process.parent.command_line sh -c /bin/rm -f /dev/shm/kdmtmpflush;/bin/cp ./74ef6cc38f5a1a80148752b63c117e6846984debd2af806c65887195a8eccc56 /dev/shm/kdmtmpflush && /bin/chmod 755 /dev/shm/kdmtmpflush && /dev/shm/kdmtmpflush --init && /bin/rm -f /dev/shm/kdmtmpflush }}\n- **Alert Time**: {{ kibana.alert.original_time 2023-03-06T00:44:16.121Z }}',
        entitySummaryMarkdown:
          '{{ host.name d7a3376b-c874-48ec-abdd-06e229243451 }} {{ user.name 93c3bf44-9c12-40c1-a462-ba52943505da }}',
        id: '5e50cef2-c577-4c5d-8944-8f16544d6b0e',
        mitreAttackTactics: ['Execution'],
        summaryMarkdown:
          'Multiple critical alerts detected on {{ host.name d7a3376b-c874-48ec-abdd-06e229243451 }} involving {{ user.name 93c3bf44-9c12-40c1-a462-ba52943505da }}. The alerts indicate potential malware activity and suspicious file operations.',
        title: 'Critical Malware and File Operations Alerts',
      },
    ],
    replacements: {
      'b6dd5c5e-bb66-4730-99bf-165b498ad7c3': 'james',
      '49b41e83-5c66-4fb0-a5f3-65a48c3a964c': 'SRVMAC08',
      '51e22fe6-b4fb-48e6-9c8e-ab1be946500a': 'root',
      '28ea48ac-d798-4c43-835a-a5f38618ee54': 'Administrator',
      '48fc96ef-e64c-4599-a9d4-0fdd8c351baa': 'SRVWIN07-PRIV',
      '67620b3f-4c97-4afa-ac21-149a7fcc91f6': 'SRVWIN07',
      '86da4cae-8e76-4782-8e4f-f67401719807': 'SRVWIN06',
      'f9b41c56-2d48-4948-8aec-d755b520ff5d': 'SRVNIX05',
      '4beb3537-4668-4362-bd8b-22618420d975': 'james',
      'cadf7b28-e7db-42ae-b53f-405fff96dd0c': 'SRVMAC08',
      'f8951660-0be3-4709-bc92-849f05f14048': 'root',
      'd9fea773-72fe-43bf-af49-28619f31ba7d': 'Administrator',
      '6ebc80cc-e74a-46bd-8039-e9a60a60a9f5': 'SRVWIN07-PRIV',
      '418e2280-721a-4013-867e-e6e83f1ad92a': 'SRVWIN07',
      '6a0d1277-2221-43c7-b50e-793ca2be5d2a': 'SRVWIN06',
      '4bf448ae-61e4-4a0f-bdb0-41556b4bf01c': 'SRVNIX05',
      'fbf5ba23-fdc5-4de8-89c2-d2c919eebbb7': 'james',
      '87b76688-b846-4c58-89f4-47ec5d1534fa': 'SRVMAC08',
      'c3958607-d620-49bb-957d-80fa1a674726': 'root',
      'e3263ce2-d172-439d-a350-3b323560fc63': 'Administrator',
      '7bf580d3-25ee-415f-8163-ab1e4aa6ddc9': 'SRVWIN07-PRIV',
      'a8a02dc6-212e-4063-b12f-222e16e17338': 'SRVWIN07',
      '66cc023f-bff4-4688-868e-8050f3d5afbf': 'SRVWIN06',
      '24588f19-7e75-481d-944d-f1186b8c0d6d': 'SRVNIX05',
      '675a078d-b369-49ee-9c0d-e546a8745642': 'james',
      '9d36dafc-b053-4204-9cf7-f28a3213edb7': 'SRVMAC08',
      'f2b81e94-5935-4013-86dd-a1d47a44a9aa': 'root',
      '99580318-3262-4f2e-86ab-a2c153c3aaa0': 'Administrator',
      '36836a90-2e75-4356-8092-7bea00f0b3d9': 'SRVWIN07-PRIV',
      '76badba5-e70b-4faf-b980-35a9ef33dfa6': 'SRVWIN07',
      'b088bc5a-a893-40ed-9acb-1ec5bb5efef1': 'SRVWIN06',
      '4f4c208e-6286-45d0-85b1-489422ff1364': 'SRVNIX05',
      '4177b2a5-1bb8-45a0-88f0-300abf82c399': 'james',
      '8ca38c32-37bb-45d2-aa28-0ee06c0bfd32': 'SRVMAC08',
      'a0a64f1b-bd5f-4ca8-9e7f-a0a15194a5f2': 'root',
      'd6f0b4e3-e462-49c1-8222-3669aba1aa49': 'Administrator',
      'a78fb100-94b4-43bc-abbd-2bb56cf499bd': 'SRVWIN07-PRIV',
      '7abd816f-a933-4864-a254-4164dd0141b4': 'SRVWIN07',
      '2a0c74d3-88a0-4e7e-a08d-e36c7426c7d1': 'SRVWIN06',
      '5a28efcd-c64c-4f99-b05f-101d7bb5b64a': 'SRVNIX05',
      'bf7cc342-2229-4951-9723-8fdd8ebf30f6': 'james',
      '26a9599f-5663-44d5-9acc-9164281b5a10': 'SRVMAC08',
      '93c3bf44-9c12-40c1-a462-ba52943505da': 'root',
      'ab49e353-fb34-410a-8221-723591c62a23': 'Administrator',
      'f721b77b-a191-429f-ad6a-9978b8e6f10f': 'SRVWIN07-PRIV',
      '5a7784d9-b96f-4283-ae68-1eea93466470': 'SRVWIN07',
      '5bba3116-eadb-41a4-be86-59a878317ea1': 'SRVWIN06',
      'd7a3376b-c874-48ec-abdd-06e229243451': 'SRVNIX05',
    },
    updated: new Date('2024-06-20T17:49:56.418Z'),
  },
  testClaudeV3SonnetUsEast1: {
    connectorId: 'testClaudeV3SonnetUsEast1',
    attackDiscoveries: [
      {
        alertIds: [
          '382d546a7ba5ab35c050f106bece236e87e3d51076a479f0beae8b2015b8fb26',
          'ca9da6b3b77b7038d958b9e144f0a406c223a862c0c991ce9782b98e03a98c87',
          '5301f4fb014538df7ce1eb9929227dde3adc0bf5b4f28aa15c8aa4e4fda95f35',
          '1459af4af8b92e1710c0ee075b1c444eaa927583dfd71b42e9a10de37c8b9cf0',
          '468457e9c5132aadae501b75ec5b766e1465ab865ad8d79e03f66593a76fccdf',
          'fb92e7fa5679db3e91d84d998faddb7ed269f1c8cdc40443f35e67c930383d34',
          '03e0f8f1598018da8143bba6b60e6ddea30551a2286ba76d717568eed3d17a66',
          '28021a7aca7de03018d820182c9784f8d5f2e1b99e0159177509a69bee1c3ac0',
        ],
        detailsMarkdown:
          'The following attack progression appears to have occurred on the host {{ host.name 05207978-1585-4e46-9b36-69c4bb85a768 }} involving the user {{ user.name ddc8db29-46eb-44fe-80b6-1ea642c338ac }}:\n\n- A suspicious application named "My Go Application.app" was launched, likely through a malicious download or installation\n- This application attempted to run various malicious scripts and commands, including:\n  - Spawning a child process to run the "osascript" utility to display a fake system dialog prompting for user credentials ({{ process.command_line osascript -e display dialog "MacOS wants to access System Preferences\n\\t\\t\nPlease enter your password." with title "System Preferences" with icon file "System:Library:CoreServices:CoreTypes.bundle:Contents:Resources:ToolbarAdvanced.icns" default answer "" giving up after 30 with hidden answer ¬ }})\n  - Modifying permissions on a suspicious file named "unix1" ({{ process.command_line chmod 777 /Users/james/unix1 }})\n  - Executing the suspicious "unix1" file and passing it the user\'s login keychain file and a hardcoded password ({{ process.command_line /Users/james/unix1 /Users/james/library/Keychains/login.keychain-db TempTemp1234!! }})\n\nThis appears to be a multi-stage malware attack, potentially aimed at credential theft and further malicious execution on the compromised host. The tactics used align with Credential Access ({{ threat.tactic.name Credential Access }}) and Execution ({{ threat.tactic.name Execution }}) based on MITRE ATT&CK.',
        entitySummaryMarkdown:
          'Suspicious activity detected on {{ host.name 05207978-1585-4e46-9b36-69c4bb85a768 }} involving {{ user.name ddc8db29-46eb-44fe-80b6-1ea642c338ac }}.',
        id: 'ea369c90-9825-4b9c-8c93-2fe929893835',
        mitreAttackTactics: ['Credential Access', 'Execution'],
        summaryMarkdown:
          'A multi-stage malware attack was detected on a macOS host, likely initiated through a malicious application download. The attack involved credential phishing attempts, suspicious file modifications, and the execution of untrusted binaries potentially aimed at credential theft. {{ host.name 05207978-1585-4e46-9b36-69c4bb85a768 }} and {{ user.name ddc8db29-46eb-44fe-80b6-1ea642c338ac }} were involved.',
        title: 'Credential Theft Malware Attack on macOS',
      },
      {
        alertIds: [
          '8772effc4970e371a26d556556f68cb8c73f9d9d9482b7f20ee1b1710e642a23',
          '63c761718211fa51ea797669d845c3d4f23b1a28c77a101536905e6fd0b4aaa6',
          '55f4641a9604e1088deae4897e346e63108bde9167256c7cb236164233899dcc',
          'eaf9991c83feef7798983dc7cacda86717d77136a3a72c9122178a03ce2f15d1',
          'f7044f707ac119256e5a0ccd41d451b51bca00bdc6899c7e5e8e1edddfeb6774',
          'fad83b4223f3c159646ad22df9877b9c400f9472655e49781e2a5951b641088e',
        ],
        detailsMarkdown:
          'The following attack progression appears to have occurred on the host {{ host.name b775910b-4b71-494d-bfb1-4be3fe88c2b0 }} involving the user {{ user.name e411fe2e-aeea-44b5-b09a-4336dabb3969 }}:\n\n- A malicious Microsoft Office document was opened, spawning a child process to write a suspicious VBScript file named "AppPool.vbs" ({{ file.path C:\\ProgramData\\WindowsAppPool\\AppPool.vbs }})\n- The VBScript launched PowerShell and executed an obfuscated script from "AppPool.ps1"\n- Additional malicious activities were performed, including:\n  - Creating a scheduled task to periodically execute the VBScript\n  - Spawning a cmd.exe process to create the scheduled task\n  - Executing the VBScript directly\n\nThis appears to be a multi-stage malware attack initiated through malicious Office documents, employing script obfuscation, scheduled task persistence, and defense evasion tactics. The activities map to Initial Access ({{ threat.tactic.name Initial Access }}), Execution ({{ threat.tactic.name Execution }}), and Defense Evasion ({{ threat.tactic.name Defense Evasion }}) based on MITRE ATT&CK.',
        entitySummaryMarkdown:
          'Suspicious activity detected on {{ host.name b775910b-4b71-494d-bfb1-4be3fe88c2b0 }} involving {{ user.name e411fe2e-aeea-44b5-b09a-4336dabb3969 }}.',
        id: '795982e8-2f12-4d6e-baf1-d0c85d8402fa',
        mitreAttackTactics: ['Initial Access', 'Execution', 'Defense Evasion'],
        summaryMarkdown:
          'A multi-stage malware attack was detected on a Windows host, likely initiated through a malicious Microsoft Office document. The attack involved script obfuscation, scheduled task persistence, and other defense evasion tactics. {{ host.name b775910b-4b71-494d-bfb1-4be3fe88c2b0 }} and {{ user.name e411fe2e-aeea-44b5-b09a-4336dabb3969 }} were involved.',
        title: 'Malicious Office Document Initiates Malware Attack',
      },
      {
        alertIds: [
          'd1b8b1c6f891fd181af236d0a81b8769c4569016d5b341cdf6a3fefb7cf9cbfd',
          '005f2dfb7efb08b34865b308876ecad188fc9a3eebf35b5e3af3c3780a3fb239',
          '7e41ddd221831544c5ff805e0ec31fc3c1f22c04257de1366112cfef14df9f63',
        ],
        detailsMarkdown:
          'The following attack progression appears to have occurred on the host {{ host.name c1e00157-c636-4222-b3a2-5d9ea667a3a8 }} involving the user {{ user.name e411fe2e-aeea-44b5-b09a-4336dabb3969 }}:\n\n- A suspicious process launched by msiexec.exe spawned a PowerShell session\n- The PowerShell process exhibited the following malicious behaviors:\n  - Shellcode injection detected, indicating the presence of the "Windows.Trojan.Bumblebee" malware\n  - Establishing network connections, suggesting command and control or data exfiltration\n\nThis appears to be a case of malware delivery and execution via an MSI package, potentially initiated through a software supply chain compromise or social engineering attack. The tactics employed align with Defense Evasion ({{ threat.tactic.name Defense Evasion }}) through system binary proxy execution, as well as potential Command and Control ({{ threat.tactic.name Command and Control }}) based on MITRE ATT&CK.',
        entitySummaryMarkdown:
          'Suspicious activity detected on {{ host.name c1e00157-c636-4222-b3a2-5d9ea667a3a8 }} involving {{ user.name e411fe2e-aeea-44b5-b09a-4336dabb3969 }}.',
        id: '3c00a091-e437-49fe-9509-bccb3789114d',
        mitreAttackTactics: ['Defense Evasion', 'Command and Control'],
        summaryMarkdown:
          'A malware attack was detected on a Windows host, likely delivered through a compromised MSI package. The attack involved shellcode injection, network connections, and the use of system binaries for defense evasion. {{ host.name c1e00157-c636-4222-b3a2-5d9ea667a3a8 }} and {{ user.name e411fe2e-aeea-44b5-b09a-4336dabb3969 }} were involved.',
        title: 'Malware Delivery via Compromised MSI Package',
      },
      {
        alertIds: [
          '12057d82e79068080f6acf268ca45c777d3f80946b466b59954320ec5f86f24a',
          '81c7c57a360bee531b1398b0773e7c4a2332fbdda4e66f135e01fc98ec7f4e3d',
        ],
        detailsMarkdown:
          'The following attack progression appears to have occurred on the host {{ host.name d4c92b0d-b82f-4702-892d-dd06ad8418e8 }} involving the user {{ user.name 7245f867-9a09-48d7-9165-84a69fa0727d }}:\n\n- A malicious file named "kdmtmpflush" with the SHA256 hash {{ file.hash.sha256 74ef6cc38f5a1a80148752b63c117e6846984debd2af806c65887195a8eccc56 }} was copied to the /dev/shm directory\n- Permissions were modified to make the file executable\n- The file was then executed with the "--init" argument, likely to initialize malicious components\n\nThis appears to be a case of the "Linux.Trojan.BPFDoor" malware being deployed on the Linux host. The tactics employed align with Execution ({{ threat.tactic.name Execution }}) based on MITRE ATT&CK.',
        entitySummaryMarkdown:
          'Suspicious activity detected on {{ host.name d4c92b0d-b82f-4702-892d-dd06ad8418e8 }} involving {{ user.name 7245f867-9a09-48d7-9165-84a69fa0727d }}.',
        id: 'fce16922-ab99-4594-843e-4683e20f9084',
        mitreAttackTactics: ['Execution'],
        summaryMarkdown:
          'The "Linux.Trojan.BPFDoor" malware was detected being deployed on a Linux host. A malicious file was copied, permissions were modified, and the file was executed to likely initialize malicious components. {{ host.name d4c92b0d-b82f-4702-892d-dd06ad8418e8 }} and {{ user.name 7245f867-9a09-48d7-9165-84a69fa0727d }} were involved.',
        title: 'Linux.Trojan.BPFDoor Malware Deployment Detected',
      },
    ],
    replacements: {
      'b6dd5c5e-bb66-4730-99bf-165b498ad7c3': 'james',
      '49b41e83-5c66-4fb0-a5f3-65a48c3a964c': 'SRVMAC08',
      '51e22fe6-b4fb-48e6-9c8e-ab1be946500a': 'root',
      '28ea48ac-d798-4c43-835a-a5f38618ee54': 'Administrator',
      '48fc96ef-e64c-4599-a9d4-0fdd8c351baa': 'SRVWIN07-PRIV',
      '67620b3f-4c97-4afa-ac21-149a7fcc91f6': 'SRVWIN07',
      '86da4cae-8e76-4782-8e4f-f67401719807': 'SRVWIN06',
      'f9b41c56-2d48-4948-8aec-d755b520ff5d': 'SRVNIX05',
      '4beb3537-4668-4362-bd8b-22618420d975': 'james',
      'cadf7b28-e7db-42ae-b53f-405fff96dd0c': 'SRVMAC08',
      'f8951660-0be3-4709-bc92-849f05f14048': 'root',
      'd9fea773-72fe-43bf-af49-28619f31ba7d': 'Administrator',
      '6ebc80cc-e74a-46bd-8039-e9a60a60a9f5': 'SRVWIN07-PRIV',
      '418e2280-721a-4013-867e-e6e83f1ad92a': 'SRVWIN07',
      '6a0d1277-2221-43c7-b50e-793ca2be5d2a': 'SRVWIN06',
      '4bf448ae-61e4-4a0f-bdb0-41556b4bf01c': 'SRVNIX05',
      'fbf5ba23-fdc5-4de8-89c2-d2c919eebbb7': 'james',
      '87b76688-b846-4c58-89f4-47ec5d1534fa': 'SRVMAC08',
      'c3958607-d620-49bb-957d-80fa1a674726': 'root',
      'e3263ce2-d172-439d-a350-3b323560fc63': 'Administrator',
      '7bf580d3-25ee-415f-8163-ab1e4aa6ddc9': 'SRVWIN07-PRIV',
      'a8a02dc6-212e-4063-b12f-222e16e17338': 'SRVWIN07',
      '66cc023f-bff4-4688-868e-8050f3d5afbf': 'SRVWIN06',
      '24588f19-7e75-481d-944d-f1186b8c0d6d': 'SRVNIX05',
      '675a078d-b369-49ee-9c0d-e546a8745642': 'james',
      '9d36dafc-b053-4204-9cf7-f28a3213edb7': 'SRVMAC08',
      'f2b81e94-5935-4013-86dd-a1d47a44a9aa': 'root',
      '99580318-3262-4f2e-86ab-a2c153c3aaa0': 'Administrator',
      '36836a90-2e75-4356-8092-7bea00f0b3d9': 'SRVWIN07-PRIV',
      '76badba5-e70b-4faf-b980-35a9ef33dfa6': 'SRVWIN07',
      'b088bc5a-a893-40ed-9acb-1ec5bb5efef1': 'SRVWIN06',
      '4f4c208e-6286-45d0-85b1-489422ff1364': 'SRVNIX05',
      '4177b2a5-1bb8-45a0-88f0-300abf82c399': 'james',
      '8ca38c32-37bb-45d2-aa28-0ee06c0bfd32': 'SRVMAC08',
      'a0a64f1b-bd5f-4ca8-9e7f-a0a15194a5f2': 'root',
      'd6f0b4e3-e462-49c1-8222-3669aba1aa49': 'Administrator',
      'a78fb100-94b4-43bc-abbd-2bb56cf499bd': 'SRVWIN07-PRIV',
      '7abd816f-a933-4864-a254-4164dd0141b4': 'SRVWIN07',
      '2a0c74d3-88a0-4e7e-a08d-e36c7426c7d1': 'SRVWIN06',
      '5a28efcd-c64c-4f99-b05f-101d7bb5b64a': 'SRVNIX05',
      'bf7cc342-2229-4951-9723-8fdd8ebf30f6': 'james',
      '26a9599f-5663-44d5-9acc-9164281b5a10': 'SRVMAC08',
      '93c3bf44-9c12-40c1-a462-ba52943505da': 'root',
      'ab49e353-fb34-410a-8221-723591c62a23': 'Administrator',
      'f721b77b-a191-429f-ad6a-9978b8e6f10f': 'SRVWIN07-PRIV',
      '5a7784d9-b96f-4283-ae68-1eea93466470': 'SRVWIN07',
      '5bba3116-eadb-41a4-be86-59a878317ea1': 'SRVWIN06',
      'd7a3376b-c874-48ec-abdd-06e229243451': 'SRVNIX05',
      'f89e0ea5-0512-4cbc-b8f5-7689542d2a07': 'james',
      '40b6f6f3-50d7-43ac-8cd4-7cd4293ab759': 'SRVMAC08',
      'bac399de-172e-4814-b715-05b0e826613d': 'root',
      'd5a411bc-0e50-4918-928f-5de4ddd84e03': 'Administrator',
      'e599c34e-faab-44a0-ac5d-e9ca5124e9e5': 'SRVWIN07-PRIV',
      '9c0bb341-b981-4777-b757-8e6e8e6366e0': 'SRVWIN07',
      'eea32964-3254-4c84-b936-f6648e4d206c': 'SRVWIN06',
      '99784e26-57e3-4be0-8f63-1fe9fc701c31': 'SRVNIX05',
      '8100f8b9-796f-4344-a819-4f9e6917c2b3': 'james',
      'dbe09b14-d876-44ec-9784-61342f44bb7f': 'SRVMAC08',
      '896084bd-1497-4b89-81a7-814b1b81cab5': 'root',
      'b81107f0-9b8b-490f-a0b5-b6a9fea14b3d': 'Administrator',
      '74f8f6db-2151-4dfd-a1f6-8795b4860148': 'SRVWIN07-PRIV',
      '545362fd-ca84-4242-801a-8fa7ec4d4f7b': 'SRVWIN07',
      '3b8100b8-f683-4ab2-9b05-f927820e1a82': 'SRVWIN06',
      'dbab229b-931f-43cf-9332-c2e474fd4194': 'SRVNIX05',
      'e823e9e9-d8ac-4850-9cff-a2491ba7f7b2': 'james',
      '1d4ec68e-9251-4e5f-8dc4-9027e54876fd': 'SRVMAC08',
      '357fe768-0244-439e-b2bb-cf087ec074c1': 'root',
      '04d678f1-5a3c-47b6-a5fe-160545115dd9': 'Administrator',
      'f47bdc2b-8290-40aa-a86c-305666197d72': 'SRVWIN07-PRIV',
      'e8b9c5c0-f97a-4f2f-a6b4-d255ae48e1bf': 'SRVWIN07',
      '53332f7e-074e-426f-a9b4-4fe7abe30818': 'SRVWIN06',
      'd783fea9-3f63-4de4-8032-32a4feaed0f0': 'SRVNIX05',
      'ddc8db29-46eb-44fe-80b6-1ea642c338ac': 'james',
      '05207978-1585-4e46-9b36-69c4bb85a768': 'SRVMAC08',
      '7245f867-9a09-48d7-9165-84a69fa0727d': 'root',
      'e411fe2e-aeea-44b5-b09a-4336dabb3969': 'Administrator',
      '5a63f6dc-4e40-41fe-a92c-7898e891025e': 'SRVWIN07-PRIV',
      'b775910b-4b71-494d-bfb1-4be3fe88c2b0': 'SRVWIN07',
      'c1e00157-c636-4222-b3a2-5d9ea667a3a8': 'SRVWIN06',
      'd4c92b0d-b82f-4702-892d-dd06ad8418e8': 'SRVNIX05',
    },
    updated: new Date('2024-06-20T20:53:51.596Z'),
  },
};
