/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockAttackDiscoveryChainResult = {
  records: [
    {
      alertIds: [
        'b6e883c29b32571aaa667fa13e65bbb4f95172a2b84bdfb85d6f16c72b2d2560',
        '0215a6c5cc9499dd0290cd69a4947efb87d3ddd8b6385a766d122c2475be7367',
        '600eb9eca925f4c5b544b4e9d3cf95d83b7829f8f74c5bd746369cb4c2968b9a',
        'e1f4a4ed70190eb4bd256c813029a6a9101575887cdbfa226ac330fbd3063f0c',
        '2a7a4809ca625dfe22ccd35fbef7a7ba8ed07f109e5cbd17250755cfb0bc615f',
      ],
      detailsMarkdown:
        '- Malicious Go application named "My Go Application.app" is being executed from temporary directories, likely indicating malware delivery\n- The malicious application is spawning child processes like `osascript` to display fake system dialogs and attempt to phish user credentials ({{ host.name 6c57a4f7-b30b-465d-a670-47377655b1bb }}, {{ user.name 639fab6d-369b-4879-beae-7767a7145c7f }})\n- The malicious application is also executing `chmod` to make the file `unix1` executable ({{ file.path /Users/james/unix1 }})\n- `unix1` is a potentially malicious executable that is being run with suspicious arguments related to the macOS keychain ({{ process.command_line /Users/james/unix1 /Users/james/library/Keychains/login.keychain-db TempTemp1234!! }})\n- Multiple detections indicate the presence of malware on the host attempting credential access and execution of malicious payloads',
      entitySummaryMarkdown:
        'Malicious activity detected on {{ host.name 6c57a4f7-b30b-465d-a670-47377655b1bb }} involving user {{ user.name 639fab6d-369b-4879-beae-7767a7145c7f }}.',
      mitreAttackTactics: ['Credential Access', 'Execution'],
      summaryMarkdown:
        'Multiple detections indicate the presence of malware on a macOS host {{ host.name 6c57a4f7-b30b-465d-a670-47377655b1bb }} attempting credential theft and execution of malicious payloads targeting the user {{ user.name 639fab6d-369b-4879-beae-7767a7145c7f }}.',
      title: 'Malware Delivering Malicious Payloads on macOS',
    },
    {
      alertIds: [
        'f465ca9fbfc8bc3b1871e965c9e111cac76ff3f4076fed6bc9da88d49fb43014',
        'ce110da958fe0cf0c07599a21c68d90a64c93b7607aa27970a614c7f49598316',
        'dd9e4ea23961ccfdb7a9c760ee6bedd19a013beac3b0d38227e7ae77ba4ce515',
        'f30d55e503b1d848b34ee57741b203d8052360dd873ea34802f3fa7a9ef34d0a',
        '6f8cd5e8021dbb64598f2b7ec56bee21fd00d1e62d4e08905f86bf234873ee66',
        'aa283e6a13be77b533eceffb09e48254c8f91feeccc39f7eed80fd3881d053f4',
        '7b4f49f21cf141e67856d3207fb4ea069c8035b41f0ea501970694cf8bd43cbe',
        'ea81d79104cbd442236b5bcdb7a3331de897aa4ce1523e622068038d048d0a9e',
        '0866787b0027b4d908767ac16e35a1da00970c83632ba85be65f2ad371132b4f',
        'b0fdf96721e361e1137d49a67e26d92f96b146392d7f44322bddc3d660abaef1',
      ],
      detailsMarkdown:
        '- A malicious executable named `d55f983c994caa160ec63a59f6b4250fe67fb3e8c43a388aec60a4a6978e9f1e.exe` is being executed from `C:\\Users\\Administrator\\Desktop\\8813719803\\` ({{ file.path C:\\Users\\Administrator\\Desktop\\8813719803\\d55f983c994caa160ec63a59f6b4250fe67fb3e8c43a388aec60a4a6978e9f1e.exe }})\n- The malicious executable is injecting shellcode into the legitimate Windows process `MsMpEng.exe` ({{ process.name MsMpEng.exe }})\n- Signatures indicate the shellcode is related to ransomware\n- The malicious executable is also loading and manipulating the Windows library `mpsvc.dll` ({{ file.path C:\\Windows\\mpsvc.dll }})\n- Ransomware artifacts like text files with the extension `.txt` are being created, indicating potential ransomware execution ({{ Ransomware.files.path c:\\hd3vuk19y-readme.txt }})\n- The activity is occurring for the user `f02a851c-9e18-4501-97d3-61d1b0c4c55b` on the host `61af21b2-33ff-4a78-81a1-40fb979da0bb`',
      entitySummaryMarkdown:
        'Ransomware activity detected on {{ host.name 61af21b2-33ff-4a78-81a1-40fb979da0bb }} involving user {{ user.name f02a851c-9e18-4501-97d3-61d1b0c4c55b }}.',
      mitreAttackTactics: ['Execution', 'Defense Evasion'],
      summaryMarkdown:
        'Ransomware has been detected executing on the Windows host {{ host.name 61af21b2-33ff-4a78-81a1-40fb979da0bb }} and impacting the user {{ user.name f02a851c-9e18-4501-97d3-61d1b0c4c55b }}. The malware is injecting shellcode, loading malicious libraries, and creating ransomware artifacts.',
      title: 'Ransomware Executing on Windows Host',
    },
    {
      alertIds: [
        'cdf3b5510bb5ed622e8cefd1ce6bedc52bdd99a4c1ead537af0603469e713c8b',
        '6abe81eb6350fb08031761be029e7ab19f7e577a7c17a9c5ea1ed010ba1620e3',
      ],
      detailsMarkdown:
        '- A malicious DLL named `cdnver.dll` is being loaded by the Windows process `rundll32.exe` with suspicious arguments ({{ process.command_line "C:\\Windows\\System32\\rundll32.exe" "C:\\Users\\Administrator\\AppData\\Local\\cdnver.dll",#1 }})\n- The malicious DLL is likely being used for execution of malicious code on the host `feb0c555-7572-4427-9475-2052d15373f9`\n- The activity is occurring for the user `f02a851c-9e18-4501-97d3-61d1b0c4c55b`',
      entitySummaryMarkdown:
        'Malicious DLL execution detected on {{ host.name feb0c555-7572-4427-9475-2052d15373f9 }} involving user {{ user.name f02a851c-9e18-4501-97d3-61d1b0c4c55b }}.',
      mitreAttackTactics: ['Defense Evasion', 'Execution'],
      summaryMarkdown:
        'A malicious DLL named `cdnver.dll` is being loaded by `rundll32.exe` on the Windows host {{ host.name feb0c555-7572-4427-9475-2052d15373f9 }} likely for execution of malicious code. The activity involves the user {{ user.name f02a851c-9e18-4501-97d3-61d1b0c4c55b }}.',
      title: 'Malicious DLL Loaded via Rundll32 on Windows',
    },
  ],
};
