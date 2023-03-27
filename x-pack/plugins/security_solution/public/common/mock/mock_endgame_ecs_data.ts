/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';

// these "mocks" are used by browser bundles so they were moved out of the mocks and are
// re-exported here for convenience and internal bwc
export { demoEndgameCreationEvent as mockEndgameCreationEvent } from '../demo_data/endgame_ecs/creation';
export { demoEndgameDnsRequest as mockEndgameDnsRequest } from '../demo_data/endgame_ecs/dns';
export {
  demoEndgameFileCreateEvent as mockEndgameFileCreateEvent,
  demoEndgameFileDeleteEvent as mockEndgameFileDeleteEvent,
} from '../demo_data/endgame_ecs/file_events';
export { demoEndgameIpv4ConnectionAcceptEvent as mockEndgameIpv4ConnectionAcceptEvent } from '../demo_data/endgame_ecs/ipv4';
export { demoEndgameTerminationEvent as mockEndgameTerminationEvent } from '../demo_data/endgame_ecs/termination';
export { demoEndgameUserLogon as mockEndgameUserLogon } from '../demo_data/endgame_ecs/user_logon';

export const mockEndpointNetworkLookupRequestedEvent: Ecs = {
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['win2019-endpoint'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
  },
  event: {
    category: ['network'],
    kind: ['event'],
    created: ['2021-01-25T16:44:40.788Z'],
    module: ['endpoint'],
    action: ['lookup_requested'],
    type: ['protocol,info'],
    id: ['LzzWB9jjGmCwGMvk++++6FZj'],
    dataset: ['endpoint.events.network'],
  },
  process: {
    name: ['google_osconfig_agent.exe'],
    pid: [3272],
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTMyNzItMTMyNTUwNzg4NjguNjUzODkxNTAw',
    ],
    executable: ['C:\\Program Files\\Google\\OSConfig\\google_osconfig_agent.exe'],
  },
  dns: {
    question: {
      name: ['logging.googleapis.com'],
      type: ['A'],
    },
  },
  agent: {
    type: ['endpoint'],
  },
  user: {
    name: ['SYSTEM'],
    domain: ['NT AUTHORITY'],
  },
  network: {
    protocol: ['dns'],
  },
  message: [
    'DNS query is completed for the name logging.googleapis.com, type 1, query options 1073766400 with status 87 Results',
  ],
  timestamp: '2021-01-25T16:44:40.788Z',
  _id: 'sUNzOncBPmkOXwyN9VbT',
};

export const mockEndpointNetworkLookupResultEvent: Ecs = {
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['win2019-endpoint'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
  },
  event: {
    category: ['network'],
    kind: ['event'],
    outcome: ['success'],
    created: ['2021-01-25T16:44:40.789Z'],
    module: ['endpoint'],
    action: ['lookup_result'],
    type: ['protocol,info'],
    id: ['LzzWB9jjGmCwGMvk++++6FZq'],
    dataset: ['endpoint.events.network'],
  },
  process: {
    name: ['google_osconfig_agent.exe'],
    pid: [3272],
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTMyNzItMTMyNTUwNzg4NjguNjUzODkxNTAw',
    ],
    executable: ['C:\\Program Files\\Google\\OSConfig\\google_osconfig_agent.exe'],
  },
  agent: {
    type: ['endpoint'],
  },
  dns: {
    question: {
      name: ['logging.googleapis.com'],
      type: ['AAAA'],
    },
  },
  user: {
    name: ['SYSTEM'],
    domain: ['NT AUTHORITY'],
  },
  network: {
    protocol: ['dns'],
  },
  message: [
    'DNS query is completed for the name logging.googleapis.com, type 28, query options 2251800887582720 with status 0 Results',
  ],
  timestamp: '2021-01-25T16:44:40.789Z',
  _id: 'skNzOncBPmkOXwyN9VbT',
};

export const mockEndpointFileCreationEvent: Ecs = {
  file: {
    path: ['C:\\Windows\\TEMP\\E38FD162-B6E6-4799-B52D-F590BACBAE94\\WimProvider.dll'],
    extension: ['dll'],
    name: ['WimProvider.dll'],
  },
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['win2019-endpoint'],
    architecture: ['x86_64'],
    ip: ['10.9.8.7'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
  },
  event: {
    category: ['file'],
    kind: ['event'],
    created: ['2021-01-25T16:21:56.832Z'],
    module: ['endpoint'],
    action: ['creation'],
    type: ['creation'],
    id: ['LzzWB9jjGmCwGMvk++++6FEM'],
    dataset: ['endpoint.events.file'],
  },
  process: {
    name: ['MsMpEng.exe'],
    pid: [2424],
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTI0MjQtMTMyNTUwNzg2OTAuNDQ1MzY0NzAw',
    ],
    executable: [
      'C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\4.18.2011.6-0\\MsMpEng.exe',
    ],
  },
  agent: {
    type: ['endpoint'],
  },
  user: {
    name: ['SYSTEM'],
    domain: ['NT AUTHORITY'],
  },
  message: ['Endpoint file event'],
  timestamp: '2021-01-25T16:21:56.832Z',
  _id: 'eSdbOncBLJMagDUQ3YFs',
};

export const mockEndpointFileDeletionEvent: Ecs = {
  file: {
    path: ['C:\\Windows\\SoftwareDistribution\\Download\\Install\\AM_Delta_Patch_1.329.2793.0.exe'],
    extension: ['exe'],
    name: ['AM_Delta_Patch_1.329.2793.0.exe'],
  },
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['11:22:33:44:55:66'],
    name: ['windows-endpoint-1'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['ce6fa3c3-fda1-4984-9bce-f6d602a5bd1a'],
  },
  event: {
    category: ['file'],
    kind: ['event'],
    created: ['2021-01-25T22:50:36.783Z'],
    module: ['endpoint'],
    action: ['deletion'],
    type: ['deletion'],
    id: ['Lzty2lsJxA05IUWg++++CBsc'],
    dataset: ['endpoint.events.file'],
  },
  process: {
    name: ['svchost.exe'],
    pid: [1728],
    entity_id: [
      'YjUwNDNiMTMtYTdjNi0xZGFlLTEyZWQtODQ1ZDlhNTRhZmQyLTE3MjgtMTMyNTQ5ODc2MjYuNjg3OTg0MDAw',
    ],
    executable: ['C:\\Windows\\System32\\svchost.exe'],
  },
  user: {
    id: ['S-1-5-18'],
    name: ['SYSTEM'],
    domain: ['NT AUTHORITY'],
  },
  agent: {
    type: ['endpoint'],
  },
  message: ['Endpoint file event'],
  timestamp: '2021-01-25T22:50:36.783Z',
  _id: 'mnXHO3cBPmkOXwyNlyv_',
};

export const mockEndpointFileCreationMalwarePreventionAlert: Ecs = {
  process: {
    hash: {
      md5: ['efca0a88adab8b92e4a333b56db5fbaa'],
      sha256: ['8c177f6129dddbd36cae196ef9d9eb71f50cee44640068f24830e83d6a9dd1d0'],
      sha1: ['e55e587058112c60d015994424f70a7a8e78afb1'],
    },
    parent: {
      name: ['explorer.exe'],
      pid: [1008],
    },
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTg5NDQtMTMyNDkwNjg0NzIuNzM4OTY4NTAw',
    ],
    executable: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'],
    name: ['chrome.exe'],
    pid: [8944],
    args: ['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'],
  },
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1518)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1518)'],
      platform: ['windows'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1518)'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
    name: ['win2019-endpoint-1'],
  },
  event: {
    category: ['malware', 'intrusion_detection', 'file'],
    outcome: ['success'],
    code: ['malicious_file'],
    action: ['creation'],
    id: ['LsuMZVr+sdhvehVM++++Ic8J'],
    kind: ['alert'],
    module: ['endpoint'],
    type: ['info', 'creation', 'denied'],
    dataset: ['endpoint.alerts'],
  },
  file: {
    path: ['C:\\Users\\sean\\Downloads\\6a5eabd6-1c79-4962-b411-a5e7d9e967d4.tmp'],
    owner: ['sean'],
    hash: {
      md5: ['c1f8d2b73b4c2488f95e7305f0421bdf'],
      sha256: ['7cc42618e580f233fee47e82312cc5c3476cb5de9219ba3f9eb7f99ac0659c30'],
      sha1: ['542b2796e9f57a92504f852b6698148bba9ff289'],
    },
    name: ['6a5eabd6-1c79-4962-b411-a5e7d9e967d4.tmp'],
    extension: ['tmp'],
    size: [196608],
  },
  agent: {
    type: ['endpoint'],
  },
  timestamp: '2020-11-05T16:48:19.923Z',
  message: ['Malware Prevention Alert'],
  _id: 'dGZQmXUB-o9SpDeMqvln',
};

export const mockEndpointFileCreationMalwareDetectionAlert: Ecs = {
  process: {
    hash: {
      md5: ['16d6a536bb2115dcbd16011e6991a9fd'],
      sha256: ['6637eca55fedbabc510168f0c4696d41971c89e5d1fb440f2f9391e6ab0e8f54'],
      sha1: ['05cc6d37603ca9076f3baf4dc421500c5cf69e4c'],
    },
    entity_id: [
      'Yjk3ZWYwODktNzYyZi00ZTljLTg3OWMtNmQ5MDM1ZjBmYTUzLTQ0MDAtMTMyNDM2MTgwMzIuMjA0MzMxMDA=',
    ],
    executable: ['C:\\Python27\\python.exe'],
    parent: {
      name: ['pythonservice.exe'],
      pid: [2936],
    },
    name: ['python.exe'],
    args: ['C:\\Python27\\python.exe', 'main.py', '-a,execute', '-p', 'c:\\temp'],
    pid: [4400],
  },
  host: {
    os: {
      full: ['Windows 10 Pro 1903 (10.0.18362.1016)'],
      name: ['Windows'],
      version: ['1903 (10.0.18362.1016)'],
      platform: ['windows'],
      family: ['windows'],
      kernel: ['1903 (10.0.18362.1016)'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    ip: ['10.1.2.3'],
    id: ['c85e6c40-d4a1-db21-7458-2565a6b857f3'],
    architecture: ['x86_64'],
    name: ['DESKTOP-1'],
  },
  file: {
    path: ['C:\\temp\\mimikatz_write.exe'],
    owner: ['Administrators'],
    hash: {
      md5: ['cc52aebdf82048364119f117f52dbba0'],
      sha256: ['263f09eeee80e03aa27a2d19530e2451978e18bf733c5f1c64ff2389c5dc17b0'],
      sha1: ['c929f6ff2d6d1085ee69625cd8efb92101a0e906'],
    },
    name: ['mimikatz_write.exe'],
    extension: ['exe'],
    size: [1265456],
  },
  event: {
    id: ['Lp/73XQ38EF48a6i+++++5Ds'],
    module: ['endpoint'],
    category: ['malware', 'intrusion_detection', 'file'],
    outcome: ['success'],
    code: ['malicious_file'],
    action: ['creation'],
    kind: ['signal'],
    type: ['info', 'creation', 'allowed'],
    dataset: ['endpoint.alerts'],
  },
  agent: {
    type: ['endpoint'],
  },
  message: ['Malware Detection Alert'],
  timestamp: '2020-09-03T15:51:50.209Z',
  _id: '51e04f7dad15fe394a3f7ed582ad4528c8ce62948e315571fc3388befd9aa0e6',
};

export const mockEndpointFilesEncryptedRansomwarePreventionAlert: Ecs = {
  process: {
    hash: {
      md5: ['85bc517e37fe24f909e4378a46a4b567'],
      sha256: ['e9fa973eb5ad446e0be31c7b8ae02d48281319e7f492e1ddaadddfbdd5b480c7'],
      sha1: ['10a3671c0fbc2bce14fc94891e87e2f4ba07e0df'],
    },
    parent: {
      name: ['cmd.exe'],
      pid: [10680],
    },
    entity_id: [
      'OTI1MTRiMTYtMWJkNi05NzljLWE2MDMtOTgwY2ZkNzQ4M2IwLTYwNTYtMTMyNTczODEzMzYuNzIxNTIxODAw',
    ],
    name: ['powershell.exe'],
    pid: [6056],
    args: ['powershell.exe', '-file', 'mock_ransomware_v3.ps1'],
  },
  host: {
    os: {
      full: ['Windows 7 Enterprise Service Pack 1 (6.1.7601)'],
      name: ['Windows'],
      version: ['Service Pack 1 (6.1.7601)'],
      platform: ['windows'],
      family: ['windows'],
      kernel: ['Service Pack 1 (6.1.7601)'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['c6bb2832-d58c-4c57-9d1f-3b102ea74d46'],
    name: ['DESKTOP-1'],
  },
  event: {
    category: ['malware', 'intrusion_detection', 'process', 'file'],
    outcome: ['success'],
    code: ['ransomware'],
    action: ['files-encrypted'],
    id: ['M0A1DXHIg6/kaeku+++++1Gv'],
    kind: ['alert'],
    module: ['endpoint'],
    type: ['info', 'start', 'change', 'denied'],
    dataset: ['endpoint.alerts'],
  },
  agent: {
    type: ['endpoint'],
  },
  timestamp: '2021-02-09T21:55:48.941Z',
  message: ['Ransomware Prevention Alert'],
  _id: 'BfvLiHcBVXUk10dUK1Pk',
};

export const mockEndpointFilesEncryptedRansomwareDetectionAlert: Ecs = {
  process: {
    hash: {
      md5: ['85bc517e37fe24f909e4378a46a4b567'],
      sha256: ['e9fa973eb5ad446e0be31c7b8ae02d48281319e7f492e1ddaadddfbdd5b480c7'],
      sha1: ['10a3671c0fbc2bce14fc94891e87e2f4ba07e0df'],
    },
    parent: {
      name: ['cmd.exe'],
      pid: [8616],
    },
    entity_id: [
      'MDAwODRkOTAtZDRhOC1kOTZhLWVmYWItZDU1ZWFhNDY1N2M2LTQ2ODQtMTMyNTc0NjE2MzEuNDM3NDUzMDA=',
    ],
    executable: ['C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'],
    name: ['powershell.exe'],
    pid: [4684],
    args: ['powershell.exe', '-file', 'mock_ransomware_v3.ps1'],
  },
  host: {
    os: {
      full: ['Windows 7 Enterprise Service Pack 1 (6.1.7601)'],
      name: ['Windows'],
      version: ['Service Pack 1 (6.1.7601)'],
      platform: ['windows'],
      family: ['windows'],
      kernel: ['Service Pack 1 (6.1.7601)'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['c6bb2832-d58c-4c57-9d1f-3b102ea74d46'],
    name: ['DESKTOP-1'],
  },
  event: {
    category: ['malware', 'intrusion_detection', 'process', 'file'],
    code: ['ransomware'],
    action: ['files-encrypted'],
    id: ['M0ExfR/BggxoHQ1e+++++1Zv'],
    kind: ['alert'],
    module: ['endpoint'],
    type: ['info', 'start', 'change', 'allowed'],
    dataset: ['endpoint.alerts'],
  },
  agent: {
    type: ['endpoint'],
  },
  timestamp: '2021-02-10T20:14:03.927Z',
  message: ['Ransomware Detection Alert'],
  _id: 'enyUjXcBxUk8qlINZEJr',
};

export const mockEndpointFileModificationMalwarePreventionAlert: Ecs = {
  process: {
    hash: {
      md5: ['47ea9e07b7dbfbeba368bd95a3a2d25b'],
      sha256: ['f45557c0b57dec4c000d8cb7d7068c8a4dccf392de740501b1046994460d77ea'],
      sha1: ['da714f84a7bbaee2be9f1ca0262aca649657cf3e'],
    },
    parent: {
      name: ['C:\\Windows\\System32\\userinit.exe'],
      pid: [356],
    },
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTEwMDgtMTMyNDc1Njk3ODUuODA0NzQyMDA=',
    ],
    executable: ['C:\\Windows\\explorer.exe'],
    name: ['explorer.exe'],
    pid: [1008],
    args: ['C:\\Windows\\Explorer.EXE'],
  },
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1518)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1518)'],
      platform: ['windows'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1518)'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
    name: ['win2019-endpoint-1'],
  },
  file: {
    path: ['C:\\Users\\sean\\Downloads\\mimikatz_trunk (1)\\x64\\mimikatz - Copy.exe'],
    owner: ['sean'],
    hash: {
      md5: ['a3cb3b02a683275f7e0a0f8a9a5c9e07'],
      sha256: ['31eb1de7e840a342fd468e558e5ab627bcb4c542a8fe01aec4d5ba01d539a0fc'],
      sha1: ['d241df7b9d2ec0b8194751cd5ce153e27cc40fa4'],
    },
    name: ['mimikatz - Copy.exe'],
    extension: ['exe'],
    size: [1309448],
  },
  event: {
    category: ['malware', 'intrusion_detection', 'file'],
    outcome: ['success'],
    code: ['malicious_file'],
    action: ['modification'],
    id: ['LsuMZVr+sdhvehVM++++GvWi'],
    kind: ['alert'],
    created: ['2020-11-04T22:40:51.724Z'],
    module: ['endpoint'],
    type: ['info', 'change', 'denied'],
    dataset: ['endpoint.alerts'],
  },
  agent: {
    type: ['endpoint'],
  },
  timestamp: '2020-11-04T22:40:51.724Z',
  message: ['Malware Prevention Alert'],
  _id: 'j0RtlXUB-o9SpDeMLdEE',
};

export const mockEndpointFileModificationMalwareDetectionAlert: Ecs = {
  process: {
    hash: {
      md5: ['c93876879542fc4710ab1d3b52382d95'],
      sha256: ['0ead4d0131ca81aa4820efdcd3c6053eab23179a46c5480c94d7c11eb8451d62'],
      sha1: ['def88472b5d92022b6182bfe031c043ddfc5ff0f'],
    },
    parent: {
      name: ['Python'],
      pid: [97],
    },
    entity_id: [
      'ZGQ0NDBhNjMtZjcyNy00NGY4LWI5M2UtNzQzZWEzMDBiYTk2LTU5OTUtMTMyNDM2MTg1MzkuOTUyNjkwMDA=',
    ],
    executable: [
      '/usr/local/Cellar/python/2.7.14/Frameworks/Python.framework/Versions/2.7/Resources/Python.app/Contents/MacOS/Python',
    ],
    name: ['Python'],
    args: [
      '/usr/local/Cellar/python/2.7.14/Frameworks/Python.framework/Versions/2.7/Resources/Python.app/Contents/MacOS/Python',
      'main.py',
      '-a',
      'modify',
    ],
    pid: [5995],
  },
  host: {
    os: {
      full: ['macOS 10.14.1'],
      name: ['macOS'],
      version: ['10.14.1'],
      platform: ['macos'],
      family: ['macos'],
      kernel: [
        'Darwin Kernel Version 18.2.0: Fri Oct  5 19:40:55 PDT 2018; root:xnu-4903.221.2~1/RELEASE_X86_64',
      ],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    ip: ['10.1.2.3'],
    id: ['7d59b1a5-afa1-6531-07ea-691602558230'],
    architecture: ['x86_64'],
    name: ['mac-1.local'],
  },
  file: {
    mtime: ['2020-09-03T14:55:42.842Z'],
    path: ['/private/var/root/write_malware/modules/write_malware/aircrack'],
    owner: ['root'],
    hash: {
      md5: ['59328cdab10fb4f25a026eb362440422'],
      sha256: ['f0954d9673878b2223b00b7ec770c7b438d876a9bb44ec78457e5c618f31f52b'],
      sha1: ['f10b043652da8c444e04aede3a9ce4a10ef9028e'],
    },
    name: ['aircrack'],
    size: [240916],
  },
  event: {
    id: ['Lp21aufnU2nkG+fO++++++7h'],
    module: ['endpoint'],
    category: ['malware', 'intrusion_detection', 'file'],
    outcome: ['success'],
    code: ['malicious_file'],
    action: ['modification'],
    type: ['info', 'change', 'allowed'],
    dataset: ['endpoint.alerts'],
  },
  agent: {
    type: ['endpoint'],
  },
  message: ['Malware Detection Alert'],
  timestamp: '2020-09-03T15:01:19.445Z',
  _id: '04d309c7e4cf7c4e54b7e3d93c38399e51797eed2484078487f4d6661f94da2c',
};

export const mockEndpointFileRenameMalwarePreventionAlert: Ecs = {
  process: {
    hash: {
      md5: ['47ea9e07b7dbfbeba368bd95a3a2d25b'],
      sha256: ['f45557c0b57dec4c000d8cb7d7068c8a4dccf392de740501b1046994460d77ea'],
      sha1: ['da714f84a7bbaee2be9f1ca0262aca649657cf3e'],
    },
    parent: {
      name: ['C:\\Windows\\System32\\userinit.exe'],
      pid: [356],
    },
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTEwMDgtMTMyNDc1Njk3ODUuODA0NzQyMDA=',
    ],
    executable: ['C:\\Windows\\explorer.exe'],
    name: ['explorer.exe'],
    pid: [1008],
    args: ['C:\\Windows\\Explorer.EXE'],
  },
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1518)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1518)'],
      platform: ['windows'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1518)'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
    name: ['win2019-endpoint-1'],
  },
  file: {
    mtime: ['2020-11-04T21:48:47.559Z'],
    path: [
      'C:\\Users\\sean\\Downloads\\23361f8f413dd9258545030e42056a352fe35f66bac376d49954551c9b4bcf97.exe',
    ],
    owner: ['sean'],
    hash: {
      md5: ['9798063a1fe056ef2f1d6f5217e7b82b'],
      sha256: ['23361f8f413dd9258545030e42056a352fe35f66bac376d49954551c9b4bcf97'],
      sha1: ['ced72fe7fc3835385faea41c657efab7b9f883cd'],
    },
    name: ['23361f8f413dd9258545030e42056a352fe35f66bac376d49954551c9b4bcf97.exe'],
    extension: ['exe'],
    size: [242010],
  },
  event: {
    category: ['malware', 'intrusion_detection', 'file'],
    outcome: ['success'],
    code: ['malicious_file'],
    action: ['rename'],
    id: ['LsuMZVr+sdhvehVM++++GppA'],
    kind: ['alert'],
    module: ['endpoint'],
    type: ['info', 'change', 'denied'],
    dataset: ['endpoint.alerts'],
  },
  agent: {
    type: ['endpoint'],
  },
  timestamp: '2020-11-04T21:48:57.847Z',
  message: ['Malware Prevention Alert'],
  _id: 'qtA9lXUBn9bLIbfPj-Tu',
};

export const mockEndpointFileRenameMalwareDetectionAlert: Ecs = {
  ...mockEndpointFileRenameMalwarePreventionAlert,
  event: {
    ...mockEndpointFileRenameMalwarePreventionAlert.event,
    type: ['info', 'change', 'allowed'],
  },
  message: ['Malware Detection Alert'],
  _id: 'CD7B6A22-809C-4502-BB94-BC38901EC942',
};

// NOTE: see `mock_timeline_data.ts` for the mockEndpointProcessExecutionMalwarePreventionAlert

export const mockEndpointProcessExecutionMalwareDetectionAlert: Ecs = {
  process: {
    hash: {
      md5: ['cc52aebdf82048364119f117f52dbba0'],
      sha256: ['263f09eeee80e03aa27a2d19530e2451978e18bf733c5f1c64ff2389c5dc17b0'],
      sha1: ['c929f6ff2d6d1085ee69625cd8efb92101a0e906'],
    },
    entity_id: [
      'Yjk3ZWYwODktNzYyZi00ZTljLTg3OWMtNmQ5MDM1ZjBmYTUzLTg2NjgtMTMyNDM2MTgwMzQuODU3Njg5MDA=',
    ],
    executable: ['C:\\temp\\mimikatz_write.exe'],
    parent: {
      name: ['python.exe'],
    },
    name: ['mimikatz_write.exe'],
    args: ['c:\\temp\\mimikatz_write.exe'],
    pid: [8668],
  },
  host: {
    os: {
      full: ['Windows 10 Pro 1903 (10.0.18362.1016)'],
      name: ['Windows'],
      version: ['1903 (10.0.18362.1016)'],
      platform: ['windows'],
      family: ['windows'],
      kernel: ['1903 (10.0.18362.1016)'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    ip: ['10.1.2.3'],
    id: ['c85e6c40-d4a1-db21-7458-2565a6b857f3'],
    architecture: ['x86_64'],
    name: ['DESKTOP-1'],
  },
  file: {
    mtime: ['2020-09-03T14:47:14.647Z'],
    path: ['C:\\temp\\mimikatz_write.exe'],
    owner: ['Administrators'],
    hash: {
      md5: ['cc52aebdf82048364119f117f52dbba0'],
      sha256: ['263f09eeee80e03aa27a2d19530e2451978e18bf733c5f1c64ff2389c5dc17b0'],
      sha1: ['c929f6ff2d6d1085ee69625cd8efb92101a0e906'],
    },
    name: ['mimikatz_write.exe'],
    extension: ['exe'],
    size: [1265456],
  },
  event: {
    id: ['Lp/73XQ38EF48a6i+++++5Do'],
    module: ['endpoint'],
    category: ['malware', 'intrusion_detection', 'process'],
    outcome: ['success'],
    code: ['malicious_file'],
    action: ['execution'],
    kind: ['signal'],
    type: ['info', 'start', 'allowed'],
    dataset: ['endpoint.alerts'],
  },
  agent: {
    type: ['endpoint'],
  },
  message: ['Malware Detection Alert'],
  timestamp: '2020-09-03T15:51:50.209Z',
  _id: '96b3db3079891faaf155f1ada645b7364a03018c65677ce002f18038e7ce1c47',
};

export const mockEndpointFileModificationEvent: Ecs = {
  file: {
    path: ['/Users/admin/Library/Application Support/CrashReporter/.dat.nosync01a5.6hoWv1'],
    name: ['.dat.nosync01a5.6hoWv1'],
  },
  host: {
    os: {
      full: ['macOS 10.14.6'],
      name: ['macOS'],
      version: ['10.14.6'],
      family: ['macos'],
      kernel: [
        'Darwin Kernel Version 18.7.0: Mon Aug 31 20:53:32 PDT 2020; root:xnu-4903.278.44~1/RELEASE_X86_64',
      ],
      platform: ['macos'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['test-Mac.local'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['fce6b9f1-5c09-d8f0-3d99-9ecb30f995df'],
  },
  event: {
    category: ['file'],
    kind: ['event'],
    module: ['endpoint'],
    action: ['modification'],
    type: ['change'],
    dataset: ['endpoint.events.file'],
  },
  process: {
    name: ['diagnostics_agent'],
    pid: [421],
    entity_id: ['OTA1ZDkzMTctMjIxOS00ZjQ1LTg4NTMtYzNiYzk1NGU1ZGU4LTQyMS0xMzI0OTEwNTIwOC4w'],
    executable: ['/System/Library/CoreServices/diagnostics_agent'],
  },
  user: {
    id: ['501'],
    name: ['admin'],
  },
  agent: {
    type: ['endpoint'],
  },
  message: ['Endpoint file event'],
  timestamp: '2021-02-02T18:56:12.871Z',
  _id: 'ulkWZHcBGrBB52F2vFf_',
};

export const mockEndpointFileOverwriteEvent: Ecs = {
  file: {
    path: ['C:\\Windows\\ServiceState\\EventLog\\Data\\lastalive0.dat'],
    extension: ['dat'],
    name: ['lastalive0.dat'],
  },
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['windows-endpoint-1'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['ce6fa3c3-fda1-4984-9bce-f6d602a5bd1a'],
  },
  event: {
    category: ['file'],
    kind: ['event'],
    created: ['2021-02-02T21:40:14.400Z'],
    module: ['endpoint'],
    action: ['overwrite'],
    type: ['change'],
    id: ['Lzty2lsJxA05IUWg++++Icrn'],
    dataset: ['endpoint.events.file'],
  },
  process: {
    name: ['svchost.exe'],
    pid: [1228],
    entity_id: [
      'YjUwNDNiMTMtYTdjNi0xZGFlLTEyZWQtODQ1ZDlhNTRhZmQyLTEyMjgtMTMyNTQ5ODc1MDcuODc1MTIxNjAw',
    ],
    executable: ['C:\\Windows\\System32\\svchost.exe'],
  },
  user: {
    id: ['S-1-5-19'],
    name: ['LOCAL SERVICE'],
    domain: ['NT AUTHORITY'],
  },
  agent: {
    type: ['endpoint'],
  },
  message: ['Endpoint file event'],
  timestamp: '2021-02-02T21:40:14.400Z',
  _id: 'LBmxZHcBtgfIO53sCImw',
};

export const mockEndpointFileRenameEvent: Ecs = {
  file: {
    path: ['C:\\Windows\\System32\\sru\\SRU.log'],
    Ext: {
      original: {
        path: ['C:\\Windows\\System32\\sru\\SRUtmp.log'],
        name: ['SRUtmp.log'],
      },
    },
    extension: ['log'],
    name: ['SRU.log'],
  },
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['windows-endpoint-1'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['ce6fa3c3-fda1-4984-9bce-f6d602a5bd1a'],
  },
  event: {
    category: ['file'],
    kind: ['event'],
    created: ['2021-02-01T16:43:00.373Z'],
    module: ['endpoint'],
    action: ['rename'],
    type: ['change'],
    id: ['Lzty2lsJxA05IUWg++++I3jv'],
    dataset: ['endpoint.events.file'],
  },
  process: {
    name: ['svchost.exe'],
    pid: [1204],
    entity_id: [
      'YjUwNDNiMTMtYTdjNi0xZGFlLTEyZWQtODQ1ZDlhNTRhZmQyLTEyMDQtMTMyNTQ5ODc2NzQuNzQ5MjUzNzAw',
    ],
    executable: ['C:\\Windows\\System32\\svchost.exe'],
  },
  user: {
    id: ['S-1-5-19'],
    name: ['LOCAL SERVICE'],
    domain: ['NT AUTHORITY'],
  },
  agent: {
    type: ['endpoint'],
  },
  message: ['Endpoint file event'],
  timestamp: '2021-02-01T16:43:00.373Z',
  _id: 'OlJ8XncBGrBB52F2Oga7',
};

// NOTE: see `mock_timeline_data.ts` for the mockEndpointRegistryModificationEvent

// NOTE: see `mock_timeline_data.ts` for the mockEndpointLibraryLoadEvent

export const mockEndpointNetworkHttpRequestEvent: Ecs = {
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['win2019-endpoint-1'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
  },
  event: {
    category: ['network'],
    kind: ['event'],
    module: ['endpoint'],
    action: ['http_request'],
    type: ['protocol'],
    id: ['LzzWB9jjGmCwGMvk++++FD+p'],
    dataset: ['endpoint.events.network'],
  },
  process: {
    name: ['svchost.exe'],
    pid: [2232],
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTIyMzItMTMyNTUwNzg2ODkuNTA1NzEzMDA=',
    ],
    executable: ['C:\\Windows\\System32\\svchost.exe'],
  },
  destination: {
    geo: {
      region_name: ['Arizona'],
      continent_name: ['North America'],
      city_name: ['Phoenix'],
      country_name: ['United States'],
      region_iso_code: ['US-AZ'],
      country_iso_code: ['US'],
    },
    port: [80],
    ip: ['10.11.12.13'],
  },
  source: {
    ip: ['10.1.2.3'],
    port: [51570],
  },
  http: {
    request: {
      body: {
        content: [
          'GET /msdownload/update/v3/static/trustedr/en/authrootstl.cab?b3d6249cb8dde683 HTTP/1.1\r\nConnection: Keep-Alive\r\nAccept: */*\r\nIf-Modified-Since: Fri, 15 Jan 2021 00:46:38 GMT\r\nIf-None-Match: "0ebbae1d7ead61:0"\r\nUser-Agent: Microsoft-CryptoAPI/10.0\r\nHost: ctldl.windowsupdate.com\r\n\r\n',
        ],
        bytes: [281],
      },
    },
  },
  agent: {
    type: ['endpoint'],
  },
  user: {
    name: ['NETWORK SERVICE'],
    domain: ['NT AUTHORITY'],
  },
  network: {
    protocol: ['http'],
    direction: ['outgoing'],
    transport: ['tcp'],
  },
  message: ['Endpoint network event'],
  timestamp: '2021-02-08T19:19:38.241Z',
  _id: '5Qwdg3cBX5UUcOOY03W7',
};

export const mockEndpointProcessExecEvent: Ecs = {
  process: {
    hash: {
      md5: ['fbc61bd19421211e341e6d9b3f65e334'],
      sha256: ['4bc018ac461706496302d1faab0a8bb39aad974eb432758665103165f3a2dd2b'],
      sha1: ['1dc525922869533265fbeac8f7d3021489b60129'],
    },
    name: ['mdworker_shared'],
    parent: {
      name: ['launchd'],
      pid: [1],
    },
    pid: [4454],
    entity_id: [
      'OTA1ZDkzMTctMjIxOS00ZjQ1LTg4NTMtYzNiYzk1NGU1ZGU4LTQ0NTQtMTMyNTY3NjYwMDEuNzIwMjkwMDA=',
    ],
    executable: [
      '/System/Library/Frameworks/CoreServices.framework/Versions/A/Frameworks/Metadata.framework/Versions/A/Support/mdworker_shared',
    ],
    args: [
      '/System/Library/Frameworks/CoreServices.framework/Frameworks/Metadata.framework/Versions/A/Support/mdworker_shared',
      '-s',
      'mdworker',
      '-c',
      'MDSImporterWorker',
      '-m',
      'com.apple.mdworker.shared',
    ],
  },
  host: {
    os: {
      full: ['macOS 10.14.6'],
      name: ['macOS'],
      version: ['10.14.6'],
      family: ['macos'],
      kernel: [
        'Darwin Kernel Version 18.7.0: Mon Aug 31 20:53:32 PDT 2020; root:xnu-4903.278.44~1/RELEASE_X86_64',
      ],
      platform: ['macos'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['test-mac.local'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['fce6b9f1-5c09-d8f0-3d99-9ecb30f995df'],
  },
  event: {
    category: ['process'],
    kind: ['event'],
    module: ['endpoint'],
    action: ['exec'],
    type: ['start'],
    id: ['LuH/UjERrFf60dea+++++NW7'],
    dataset: ['endpoint.events.process'],
  },
  user: {
    id: ['501'],
    name: ['admin'],
  },
  agent: {
    type: ['endpoint'],
  },
  message: ['Endpoint process event'],
  timestamp: '2021-02-02T19:00:01.972Z',
  _id: '8lkaZHcBGrBB52F2aN8c',
};

export const mockEndpointProcessForkEvent: Ecs = {
  process: {
    hash: {
      md5: ['24a77cf54ab89f3d0772c65204074710'],
      sha256: ['cbf3d059cc9f9c0adff5ef15bf331b95ab381837fa0adecd965a41b5846f4bd4'],
      sha1: ['6cc7c36da55c7af0969539fae73768fbef11aa1a'],
    },
    name: ['zoom.us'],
    parent: {
      name: ['zoom.us'],
      pid: [3961],
    },
    pid: [4042],
    entity_id: [
      'OTA1ZDkzMTctMjIxOS00ZjQ1LTg4NTMtYzNiYzk1NGU1ZGU4LTQwNDItMTMyNTY2ODI5MjQuNzYxNDAwMA==',
    ],
    executable: ['/Applications/zoom.us.app/Contents/MacOS/zoom.us'],
    args: ['/Applications/zoom.us.app/Contents/MacOS/zoom.us'],
  },
  host: {
    os: {
      full: ['macOS 10.14.6'],
      name: ['macOS'],
      version: ['10.14.6'],
      family: ['macos'],
      kernel: [
        'Darwin Kernel Version 18.7.0: Mon Aug 31 20:53:32 PDT 2020; root:xnu-4903.278.44~1/RELEASE_X86_64',
      ],
      platform: ['macos'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['test-mac.local'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['fce6b9f1-5c09-d8f0-3d99-9ecb30f995df'],
  },
  event: {
    category: ['process'],
    kind: ['event'],
    module: ['endpoint'],
    action: ['fork'],
    type: ['start'],
    id: ['LuH/UjERrFf60dea+++++KYC'],
    dataset: ['endpoint.events.process'],
  },
  user: {
    id: ['501'],
    name: ['admin'],
  },
  agent: {
    type: ['endpoint'],
  },
  message: ['Endpoint process event'],
  timestamp: '2021-02-01T19:55:24.907Z',
  _id: 'KXomX3cBGrBB52F2S9XY',
};

export const mockEndgameIpv6ConnectionAcceptEvent: Ecs = {
  _id: '-8SucG0BOpWiDweS0wrq',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.240.11.26'],
    name: ['HD-55b-3ec87f66'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['ipv6_connection_accept_event'],
    category: ['network'],
    kind: ['event'],
  },
  timestamp: '1569553566000',
  network: {
    community_id: ['1:network-community_id'],
    transport: ['tcp'],
  },
  process: {
    pid: [4],
  },
  source: {
    ip: ['::1'],
    port: [51324],
  },
  destination: {
    port: [5357],
    ip: ['::1'],
  },
  endgame: {
    pid: [4],
  },
};

export const mockEndpointNetworkConnectionAcceptedEvent: Ecs = {
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['windows-endpoint-1'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['ce6fa3c3-fda1-4984-9bce-f6d602a5bd1a'],
  },
  event: {
    category: ['network'],
    kind: ['event'],
    outcome: ['success'],
    created: ['2021-01-25T16:44:45.048Z'],
    module: ['endpoint'],
    action: ['connection_accepted'],
    type: ['start'],
    id: ['Lzty2lsJxA05IUWg++++C1CY'],
    dataset: ['endpoint.events.network'],
  },
  process: {
    name: ['svchost.exe'],
    pid: [328],
    entity_id: [
      'YjUwNDNiMTMtYTdjNi0xZGFlLTEyZWQtODQ1ZDlhNTRhZmQyLTMyOC0xMzI1NDk4NzUwNS45OTYxMjUzMDA=',
    ],
    executable: ['C:\\Windows\\System32\\svchost.exe'],
  },
  source: {
    geo: {
      region_name: ['North Carolina'],
      region_iso_code: ['US-NC'],
      city_name: ['Concord'],
      country_iso_code: ['US'],
      continent_name: ['North America'],
      country_name: ['United States'],
    },
    ip: ['10.1.2.3'],
    port: [64557],
  },
  destination: {
    port: [3389],
    ip: ['10.50.60.70'],
  },
  user: {
    id: ['S-1-5-20'],
    name: ['NETWORK SERVICE'],
    domain: ['NT AUTHORITY'],
  },
  agent: {
    type: ['endpoint'],
  },
  network: {
    direction: ['incoming'],
    transport: ['tcp'],
  },
  message: ['Endpoint network event'],
  timestamp: '2021-01-25T16:44:45.048Z',
  _id: 'tUN0OncBPmkOXwyNOGPV',
};

export const mockEndgameIpv4DisconnectReceivedEvent: Ecs = {
  _id: 'hMjPcG0BOpWiDweSoOin',
  user: {
    id: ['S-1-5-21-3573271228-3407584681-1597858646-1002'],
    domain: ['Anvi-Acer'],
    name: ['Arun'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.178.85.222'],
    name: ['HD-obe-8bf77f54'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['ipv4_disconnect_received_event'],
    category: ['network'],
    kind: ['event'],
  },
  timestamp: '1569555712000',
  network: {
    community_id: ['1:LxYHJJv98b2O0fNccXu6HheXmwk='],
    transport: ['tcp'],
    bytes: [8344],
  },
  process: {
    pid: [11620],
    name: ['chrome.exe'],
    executable: ['C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'],
  },
  source: {
    ip: ['192.168.0.6'],
    port: [59356],
    bytes: [2151],
  },
  destination: {
    port: [443],
    ip: ['10.156.162.53'],
    bytes: [6193],
  },
  endgame: {
    process_name: ['chrome.exe'],
  },
};

export const mockEndgameIpv6DisconnectReceivedEvent: Ecs = {
  _id: 'EcSucG0BOpWiDweS1Ayg',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.240.11.26'],
    name: ['HD-55b-3ec87f66'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['ipv6_disconnect_received_event'],
    category: ['network'],
    kind: ['event'],
  },
  timestamp: '1569553566000',
  network: {
    community_id: ['1:ZylzQhsB1dcptA2t4DY8S6l9o8E='],
    transport: ['tcp'],
    bytes: [8086],
  },
  process: {
    pid: [4],
  },
  source: {
    ip: ['::1'],
    port: [51338],
    bytes: [7837],
  },
  destination: {
    port: [2869],
    ip: ['::1'],
    bytes: [249],
  },
  endgame: {
    pid: [4],
  },
};

export const mockEndpointDisconnectReceivedEvent: Ecs = {
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['windows-endpoint-1'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['ce6fa3c3-fda1-4984-9bce-f6d602a5bd1a'],
  },
  event: {
    category: ['network'],
    kind: ['event'],
    created: ['2021-01-25T16:44:47.004Z'],
    module: ['endpoint'],
    action: ['disconnect_received'],
    type: ['end'],
    id: ['Lzty2lsJxA05IUWg++++C1Ch'],
    dataset: ['endpoint.events.network'],
  },
  process: {
    name: ['svchost.exe'],
    pid: [328],
    entity_id: [
      'YjUwNDNiMTMtYTdjNi0xZGFlLTEyZWQtODQ1ZDlhNTRhZmQyLTMyOC0xMzI1NDk4NzUwNS45OTYxMjUzMDA=',
    ],
    executable: ['C:\\Windows\\System32\\svchost.exe'],
  },
  source: {
    geo: {
      region_name: ['North Carolina'],
      region_iso_code: ['US-NC'],
      city_name: ['Concord'],
      country_iso_code: ['US'],
      continent_name: ['North America'],
      country_name: ['United States'],
    },
    ip: ['10.20.30.40'],
    port: [64557],
    bytes: [1192],
  },
  destination: {
    bytes: [1615],
    port: [3389],
    ip: ['10.11.12.13'],
  },
  user: {
    id: ['S-1-5-20'],
    name: ['NETWORK SERVICE'],
    domain: ['NT AUTHORITY'],
  },
  agent: {
    type: ['endpoint'],
  },
  network: {
    direction: ['incoming'],
    transport: ['tcp'],
  },
  message: ['Endpoint network event'],
  timestamp: '2021-01-25T16:44:47.004Z',
  _id: 'uUN0OncBPmkOXwyNOGPV',
};

export const mockEndpointSecurityLogOnSuccessEvent: Ecs = {
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['win2019-endpoint'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
  },
  event: {
    category: ['authentication', 'session'],
    kind: ['event'],
    outcome: ['success'],
    created: ['2021-01-25T16:24:51.761Z'],
    module: ['endpoint'],
    action: ['log_on'],
    type: ['start'],
    id: ['LzzWB9jjGmCwGMvk++++6FKC'],
    dataset: ['endpoint.events.security'],
  },
  process: {
    name: ['C:\\Program Files\\OpenSSH-Win64\\sshd.exe'],
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTQzNDQtMTMyNTYwNjU0ODYuMzIwNDI3MDAw',
    ],
    executable: ['C:\\Program Files\\OpenSSH-Win64\\sshd.exe'],
    pid: [90210],
  },
  agent: {
    type: ['endpoint'],
  },
  user: {
    name: ['SYSTEM'],
    domain: ['NT AUTHORITY'],
  },
  message: ['Endpoint security event'],
  timestamp: '2021-01-25T16:24:51.761Z',
  _id: 'eSlgOncBLJMagDUQ-yBL',
};

export const mockEndpointSecurityLogOnFailureEvent: Ecs = {
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1637)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1637)'],
      kernel: ['1809 (10.0.17763.1637)'],
      platform: ['windows'],
      family: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    ip: ['10.1.2.3'],
    name: ['win2019-endpoint'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
    architecture: ['x86_64'],
  },
  event: {
    category: ['authentication', 'session'],
    module: ['endpoint'],
    kind: ['event'],
    outcome: ['failure'],
    action: ['log_on'],
    created: ['2020-12-28T04:05:01.409Z'],
    type: ['start'],
    id: ['Ly1AjdVRChqy2iq3++++3jlX'],
    dataset: ['endpoint.events.security'],
  },
  process: {
    name: ['C:\\Program Files\\OpenSSH-Win64\\sshd.exe'],
    pid: [90210],
  },
  agent: {
    type: ['endpoint'],
  },
  message: ['Endpoint security event'],
  timestamp: '2020-12-28T04:05:01.409Z',
  _id: 's8GIp3YBN9Y7_e914Upz',
};

export const mockEndgameAdminLogon: Ecs = {
  _id: 'psjPcG0BOpWiDweSoelR',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.178.85.222'],
    name: ['HD-obe-8bf77f54'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['admin_logon'],
    category: ['authentication'],
    type: ['authentication_success'],
    kind: ['event'],
  },
  message: [
    'Special privileges assigned to new logon.\r\n\r\nSubject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tSYSTEM\r\n\tAccount Domain:\t\tNT AUTHORITY\r\n\tLogon ID:\t\t0x3E7\r\n\r\nPrivileges:\t\tSeAssignPrimaryTokenPrivilege\r\n\t\t\tSeTcbPrivilege\r\n\t\t\tSeSecurityPrivilege\r\n\t\t\tSeTakeOwnershipPrivilege\r\n\t\t\tSeLoadDriverPrivilege\r\n\t\t\tSeBackupPrivilege\r\n\t\t\tSeRestorePrivilege\r\n\t\t\tSeDebugPrivilege\r\n\t\t\tSeAuditPrivilege\r\n\t\t\tSeSystemEnvironmentPrivilege\r\n\t\t\tSeImpersonatePrivilege\r\n\t\t\tSeDelegateSessionUserImpersonatePrivilege',
  ],
  timestamp: '1569555712000',
  process: {
    pid: [964],
    executable: ['C:\\Windows\\System32\\lsass.exe'],
  },
  winlog: {
    event_id: [4672],
  },
  endgame: {
    subject_domain_name: ['NT AUTHORITY'],
    subject_user_name: ['SYSTEM'],
    pid: [964],
  },
};

export const mockEndgameExplicitUserLogon: Ecs = {
  _id: '-cSvcG0BOpWiDweSvi_s',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.240.11.26'],
    name: ['HD-55b-3ec87f66'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['explicit_user_logon'],
    category: ['authentication'],
    type: ['authentication_success'],
    kind: ['event'],
  },
  message: [
    'A logon was attempted using explicit credentials.\r\n\r\nSubject:\r\n\tSecurity ID:\t\tS-1-5-18\r\n\tAccount Name:\t\tANVI-ACER$\r\n\tAccount Domain:\t\tWORKGROUP\r\n\tLogon ID:\t\t0x3E7\r\n\tLogon GUID:\t\t{00000000-0000-0000-0000-000000000000}\r\n\r\nAccount Whose Credentials Were Used:\r\n\tAccount Name:\t\tArun\r\n\tAccount Domain:\t\tAnvi-Acer\r\n\tLogon GUID:\t\t{00000000-0000-0000-0000-000000000000}\r\n\r\nTarget Server:\r\n\tTarget Server Name:\tlocalhost\r\n\tAdditional Information:\tlocalhost\r\n\r\nProcess Information:\r\n\tProcess ID:\t\t0x6c8\r\n\tProcess Name:\t\tC:\\Windows\\System32\\svchost.exe\r\n\r\nNetwork Information:\r\n\tNetwork Address:\t127.0.0.1\r\n\tPort:\t\t\t0\r\n\r\nThis event is generated when a process attempts to log on an account by explicitly specifying that account’s credentials.  This most commonly occurs in batch-type configurations such as scheduled tasks, or when using the RUNAS command.',
  ],
  timestamp: '1569553626000',
  process: {
    pid: [1736],
    name: ['C:\\Windows\\System32\\svchost.exe'],
    executable: ['C:\\Windows\\System32\\svchost.exe'],
  },
  winlog: {
    event_id: [4648],
  },
  endgame: {
    subject_domain_name: ['WORKGROUP'],
    target_user_name: ['Arun'],
    pid: [1736],
    subject_user_name: ['ANVI-ACER$'],
    target_domain_name: ['Anvi-Acer'],
    process_name: ['C:\\Windows\\System32\\svchost.exe'],
    subject_logon_id: ['0x3e7'],
  },
};

export const mockEndgameUserLogoff: Ecs = {
  _id: 'rcSvcG0BOpWiDweSvi5K',
  user: {
    id: ['S-1-5-18'],
    domain: ['NT AUTHORITY'],
    name: ['SYSTEM'],
  },
  host: {
    os: {
      platform: ['windows'],
      name: ['Windows'],
      version: ['6.1'],
    },
    ip: ['10.240.11.26'],
    name: ['HD-55b-3ec87f66'],
  },
  event: {
    module: ['endgame'],
    dataset: ['esensor'],
    action: ['user_logoff'],
    category: ['authentication'],
    kind: ['event'],
  },
  message: [
    'An account was logged off.\r\n\r\nSubject:\r\n\tSecurity ID:\t\tS-1-5-21-3573271228-3407584681-1597858646-1002\r\n\tAccount Name:\t\tArun\r\n\tAccount Domain:\t\tAnvi-Acer\r\n\tLogon ID:\t\t0x16DB41E\r\n\r\nLogon Type:\t\t\t2\r\n\r\nThis event is generated when a logon session is destroyed. It may be positively correlated with a logon event using the Logon ID value. Logon IDs are only unique between reboots on the same computer.',
  ],
  timestamp: '1569553626000',
  process: {
    pid: [964],
    executable: ['C:\\Windows\\System32\\lsass.exe'],
  },
  winlog: {
    event_id: [4634],
  },
  endgame: {
    logon_type: [2],
    target_user_name: ['Arun'],
    target_logon_id: ['0x16db41e'],
    target_domain_name: ['Anvi-Acer'],
  },
};

export const mockEndpointSecurityLogOffEvent: Ecs = {
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['win2019-endpoint'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
  },
  event: {
    category: ['authentication,session'],
    kind: ['event'],
    outcome: ['success'],
    created: ['2021-01-26T23:27:27.610Z'],
    module: ['endpoint'],
    action: ['log_off'],
    type: ['end'],
    id: ['LzzWB9jjGmCwGMvk++++6l0y'],
    dataset: ['endpoint.events.security'],
  },
  process: {
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTU4MC0xMzI1NTA3ODY2Ny45MTg5Njc1MDA=',
    ],
    executable: ['C:\\Windows\\System32\\lsass.exe'],
    pid: [90210],
  },
  user: {
    name: ['SYSTEM'],
    domain: ['NT AUTHORITY'],
  },
  message: ['Endpoint security event'],
  timestamp: '2021-01-26T23:27:27.610Z',
  _id: 'ZesLQXcBPmkOXwyNdT1a',
};

export const mockEndpointProcessStartEvent: Ecs = {
  process: {
    hash: {
      md5: ['1b0e9b5fcb62de0787235ecca560b610'],
      sha256: ['697334c236cce7d4c9e223146ee683a1219adced9729d4ae771fd6a1502a6b63'],
      sha1: ['e19da2c35ba1c38adf12d1a472c1fcf1f1a811a7'],
    },
    name: ['conhost.exe'],
    pid: [3636],
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTM2MzYtMTMyNTYwODU1OTguMTA3NTA3MDAw',
    ],
    executable: ['C:\\Windows\\System32\\conhost.exe'],
    args: ['C:\\Windows\\system32\\conhost.exe,0xffffffff,-ForceV1'],
  },
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['win2019-endpoint-1'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
  },
  event: {
    category: ['process'],
    kind: ['event'],
    created: ['2021-01-25T21:59:58.107Z'],
    module: ['endpoint'],
    action: ['start'],
    type: ['start'],
    id: ['LzzWB9jjGmCwGMvk++++6Kw+'],
    dataset: ['endpoint.events.process'],
  },
  agent: {
    type: ['endpoint'],
  },
  user: {
    name: ['SYSTEM'],
    domain: ['NT AUTHORITY'],
  },
  message: ['Endpoint process event'],
  timestamp: '2021-01-25T21:59:58.107Z',
  _id: 't5KSO3cB8l64wN2iQ8V9',
};

export const mockEndpointProcessEndEvent: Ecs = {
  process: {
    hash: {
      md5: ['8a0a29438052faed8a2532da50455756'],
      sha256: ['7fd065bac18c5278777ae44908101cdfed72d26fa741367f0ad4d02020787ab6'],
      sha1: ['a1385ce20ad79f55df235effd9780c31442aa234'],
    },
    name: ['svchost.exe'],
    parent: {
      name: ['services.exe'],
    },
    pid: [10392],
    entity_id: [
      'MWQxNWNmOWUtM2RjNy01Yjk3LWY1ODYtNzQzZjdjMjUxOGIyLTEwMzkyLTEzMjU2MjY2OTkwLjcwMzgzMDgwMA==',
    ],
    executable: ['C:\\Windows\\System32\\svchost.exe'],
    exit_code: [-1],
    args: ['C:\\Windows\\System32\\svchost.exe,-k,netsvcs,-p,-s,NetSetupSvc'],
  },
  host: {
    os: {
      full: ['Windows Server 2019 Datacenter 1809 (10.0.17763.1697)'],
      name: ['Windows'],
      version: ['1809 (10.0.17763.1697)'],
      family: ['windows'],
      kernel: ['1809 (10.0.17763.1697)'],
      platform: ['windows'],
    },
    mac: ['aa:bb:cc:dd:ee:ff'],
    name: ['win2019-endpoint'],
    architecture: ['x86_64'],
    ip: ['10.1.2.3'],
    id: ['d8ad572e-d224-4044-a57d-f5a84c0dfe5d'],
  },
  event: {
    category: ['process'],
    kind: ['event'],
    created: ['2021-01-28T00:24:05.929Z'],
    module: ['endpoint'],
    action: ['end'],
    type: ['end'],
    id: ['LzzWB9jjGmCwGMvk++++77mE'],
    dataset: ['endpoint.events.process'],
  },
  agent: {
    type: ['endpoint'],
  },
  user: {
    name: ['SYSTEM'],
    domain: ['NT AUTHORITY'],
  },
  message: ['Endpoint process event'],
  timestamp: '2021-01-28T00:24:05.929Z',
  _id: 'quloRncBX5UUcOOYo2ZS',
};
