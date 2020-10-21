/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import { MitreTacticsOptions, MitreTechniquesOptions } from './types';

export const tactics = [
  {
    name: 'Collection',
    id: 'TA0009',
    reference: 'https://attack.mitre.org/tactics/TA0009',
  },
  {
    name: 'Command and Control',
    id: 'TA0011',
    reference: 'https://attack.mitre.org/tactics/TA0011',
  },
  {
    name: 'Credential Access',
    id: 'TA0006',
    reference: 'https://attack.mitre.org/tactics/TA0006',
  },
  {
    name: 'Defense Evasion',
    id: 'TA0005',
    reference: 'https://attack.mitre.org/tactics/TA0005',
  },
  {
    name: 'Discovery',
    id: 'TA0007',
    reference: 'https://attack.mitre.org/tactics/TA0007',
  },
  {
    name: 'Execution',
    id: 'TA0002',
    reference: 'https://attack.mitre.org/tactics/TA0002',
  },
  {
    name: 'Exfiltration',
    id: 'TA0010',
    reference: 'https://attack.mitre.org/tactics/TA0010',
  },
  {
    name: 'Impact',
    id: 'TA0040',
    reference: 'https://attack.mitre.org/tactics/TA0040',
  },
  {
    name: 'Initial Access',
    id: 'TA0001',
    reference: 'https://attack.mitre.org/tactics/TA0001',
  },
  {
    name: 'Lateral Movement',
    id: 'TA0008',
    reference: 'https://attack.mitre.org/tactics/TA0008',
  },
  {
    name: 'Persistence',
    id: 'TA0003',
    reference: 'https://attack.mitre.org/tactics/TA0003',
  },
  {
    name: 'Privilege Escalation',
    id: 'TA0004',
    reference: 'https://attack.mitre.org/tactics/TA0004',
  },
];

export const tacticsOptions: MitreTacticsOptions[] = [
  {
    id: 'TA0009',
    name: 'Collection',
    reference: 'https://attack.mitre.org/tactics/TA0009',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.collectionDescription',
      { defaultMessage: 'Collection (TA0009)' }
    ),
    value: 'collection',
  },
  {
    id: 'TA0011',
    name: 'Command and Control',
    reference: 'https://attack.mitre.org/tactics/TA0011',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.commandAndControlDescription',
      { defaultMessage: 'Command and Control (TA0011)' }
    ),
    value: 'commandAndControl',
  },
  {
    id: 'TA0006',
    name: 'Credential Access',
    reference: 'https://attack.mitre.org/tactics/TA0006',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.credentialAccessDescription',
      { defaultMessage: 'Credential Access (TA0006)' }
    ),
    value: 'credentialAccess',
  },
  {
    id: 'TA0005',
    name: 'Defense Evasion',
    reference: 'https://attack.mitre.org/tactics/TA0005',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.defenseEvasionDescription',
      { defaultMessage: 'Defense Evasion (TA0005)' }
    ),
    value: 'defenseEvasion',
  },
  {
    id: 'TA0007',
    name: 'Discovery',
    reference: 'https://attack.mitre.org/tactics/TA0007',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.discoveryDescription',
      { defaultMessage: 'Discovery (TA0007)' }
    ),
    value: 'discovery',
  },
  {
    id: 'TA0002',
    name: 'Execution',
    reference: 'https://attack.mitre.org/tactics/TA0002',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.executionDescription',
      { defaultMessage: 'Execution (TA0002)' }
    ),
    value: 'execution',
  },
  {
    id: 'TA0010',
    name: 'Exfiltration',
    reference: 'https://attack.mitre.org/tactics/TA0010',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.exfiltrationDescription',
      { defaultMessage: 'Exfiltration (TA0010)' }
    ),
    value: 'exfiltration',
  },
  {
    id: 'TA0040',
    name: 'Impact',
    reference: 'https://attack.mitre.org/tactics/TA0040',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.impactDescription',
      { defaultMessage: 'Impact (TA0040)' }
    ),
    value: 'impact',
  },
  {
    id: 'TA0001',
    name: 'Initial Access',
    reference: 'https://attack.mitre.org/tactics/TA0001',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.initialAccessDescription',
      { defaultMessage: 'Initial Access (TA0001)' }
    ),
    value: 'initialAccess',
  },
  {
    id: 'TA0008',
    name: 'Lateral Movement',
    reference: 'https://attack.mitre.org/tactics/TA0008',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.lateralMovementDescription',
      { defaultMessage: 'Lateral Movement (TA0008)' }
    ),
    value: 'lateralMovement',
  },
  {
    id: 'TA0003',
    name: 'Persistence',
    reference: 'https://attack.mitre.org/tactics/TA0003',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.persistenceDescription',
      { defaultMessage: 'Persistence (TA0003)' }
    ),
    value: 'persistence',
  },
  {
    id: 'TA0004',
    name: 'Privilege Escalation',
    reference: 'https://attack.mitre.org/tactics/TA0004',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.privilegeEscalationDescription',
      { defaultMessage: 'Privilege Escalation (TA0004)' }
    ),
    value: 'privilegeEscalation',
  },
];

export const technique = [
  {
    name: '.bash_profile and .bashrc',
    id: 'T1156',
    reference: 'https://attack.mitre.org/techniques/T1156',
    tactics: [],
  },
  {
    name: '.bash_profile and .bashrc',
    id: 'T1546.004',
    reference: 'https://attack.mitre.org/techniques/T1546/004',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: '/etc/passwd and /etc/shadow',
    id: 'T1003.008',
    reference: 'https://attack.mitre.org/techniques/T1003/008',
    tactics: ['credential-access'],
  },
  {
    name: 'Abuse Elevation Control Mechanism',
    id: 'T1548',
    reference: 'https://attack.mitre.org/techniques/T1548',
    tactics: ['privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Access Token Manipulation',
    id: 'T1134',
    reference: 'https://attack.mitre.org/techniques/T1134',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Accessibility Features',
    id: 'T1015',
    reference: 'https://attack.mitre.org/techniques/T1015',
    tactics: [],
  },
  {
    name: 'Accessibility Features',
    id: 'T1546.008',
    reference: 'https://attack.mitre.org/techniques/T1546/008',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Account Access Removal',
    id: 'T1531',
    reference: 'https://attack.mitre.org/techniques/T1531',
    tactics: ['impact'],
  },
  {
    name: 'Account Discovery',
    id: 'T1087',
    reference: 'https://attack.mitre.org/techniques/T1087',
    tactics: ['discovery'],
  },
  {
    name: 'Account Manipulation',
    id: 'T1098',
    reference: 'https://attack.mitre.org/techniques/T1098',
    tactics: ['persistence'],
  },
  {
    name: 'Add Office 365 Global Administrator Role',
    id: 'T1098.003',
    reference: 'https://attack.mitre.org/techniques/T1098/003',
    tactics: ['persistence'],
  },
  {
    name: 'Add-ins',
    id: 'T1137.006',
    reference: 'https://attack.mitre.org/techniques/T1137/006',
    tactics: ['persistence'],
  },
  {
    name: 'Additional Azure Service Principal Credentials',
    id: 'T1098.001',
    reference: 'https://attack.mitre.org/techniques/T1098/001',
    tactics: ['persistence'],
  },
  {
    name: 'AppCert DLLs',
    id: 'T1182',
    reference: 'https://attack.mitre.org/techniques/T1182',
    tactics: [],
  },
  {
    name: 'AppCert DLLs',
    id: 'T1546.009',
    reference: 'https://attack.mitre.org/techniques/T1546/009',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'AppInit DLLs',
    id: 'T1103',
    reference: 'https://attack.mitre.org/techniques/T1103',
    tactics: [],
  },
  {
    name: 'AppInit DLLs',
    id: 'T1546.010',
    reference: 'https://attack.mitre.org/techniques/T1546/010',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'AppleScript',
    id: 'T1155',
    reference: 'https://attack.mitre.org/techniques/T1155',
    tactics: [],
  },
  {
    name: 'AppleScript',
    id: 'T1059.002',
    reference: 'https://attack.mitre.org/techniques/T1059/002',
    tactics: ['execution'],
  },
  {
    name: 'Application Access Token',
    id: 'T1527',
    reference: 'https://attack.mitre.org/techniques/T1527',
    tactics: [],
  },
  {
    name: 'Application Access Token',
    id: 'T1550.001',
    reference: 'https://attack.mitre.org/techniques/T1550/001',
    tactics: ['defense-evasion', 'lateral-movement'],
  },
  {
    name: 'Application Deployment Software',
    id: 'T1017',
    reference: 'https://attack.mitre.org/techniques/T1017',
    tactics: [],
  },
  {
    name: 'Application Exhaustion Flood',
    id: 'T1499.003',
    reference: 'https://attack.mitre.org/techniques/T1499/003',
    tactics: ['impact'],
  },
  {
    name: 'Application Layer Protocol',
    id: 'T1071',
    reference: 'https://attack.mitre.org/techniques/T1071',
    tactics: ['command-and-control'],
  },
  {
    name: 'Application Shimming',
    id: 'T1138',
    reference: 'https://attack.mitre.org/techniques/T1138',
    tactics: [],
  },
  {
    name: 'Application Shimming',
    id: 'T1546.011',
    reference: 'https://attack.mitre.org/techniques/T1546/011',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Application Window Discovery',
    id: 'T1010',
    reference: 'https://attack.mitre.org/techniques/T1010',
    tactics: ['discovery'],
  },
  {
    name: 'Application or System Exploitation',
    id: 'T1499.004',
    reference: 'https://attack.mitre.org/techniques/T1499/004',
    tactics: ['impact'],
  },
  {
    name: 'Archive Collected Data',
    id: 'T1560',
    reference: 'https://attack.mitre.org/techniques/T1560',
    tactics: ['collection'],
  },
  {
    name: 'Archive via Custom Method',
    id: 'T1560.003',
    reference: 'https://attack.mitre.org/techniques/T1560/003',
    tactics: ['collection'],
  },
  {
    name: 'Archive via Library',
    id: 'T1560.002',
    reference: 'https://attack.mitre.org/techniques/T1560/002',
    tactics: ['collection'],
  },
  {
    name: 'Archive via Utility',
    id: 'T1560.001',
    reference: 'https://attack.mitre.org/techniques/T1560/001',
    tactics: ['collection'],
  },
  {
    name: 'Asymmetric Cryptography',
    id: 'T1573.002',
    reference: 'https://attack.mitre.org/techniques/T1573/002',
    tactics: ['command-and-control'],
  },
  {
    name: 'Asynchronous Procedure Call',
    id: 'T1055.004',
    reference: 'https://attack.mitre.org/techniques/T1055/004',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'At (Linux)',
    id: 'T1053.001',
    reference: 'https://attack.mitre.org/techniques/T1053/001',
    tactics: ['execution', 'persistence', 'privilege-escalation'],
  },
  {
    name: 'At (Windows)',
    id: 'T1053.002',
    reference: 'https://attack.mitre.org/techniques/T1053/002',
    tactics: ['execution', 'persistence', 'privilege-escalation'],
  },
  {
    name: 'Audio Capture',
    id: 'T1123',
    reference: 'https://attack.mitre.org/techniques/T1123',
    tactics: ['collection'],
  },
  {
    name: 'Authentication Package',
    id: 'T1131',
    reference: 'https://attack.mitre.org/techniques/T1131',
    tactics: [],
  },
  {
    name: 'Authentication Package',
    id: 'T1547.002',
    reference: 'https://attack.mitre.org/techniques/T1547/002',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Automated Collection',
    id: 'T1119',
    reference: 'https://attack.mitre.org/techniques/T1119',
    tactics: ['collection'],
  },
  {
    name: 'Automated Exfiltration',
    id: 'T1020',
    reference: 'https://attack.mitre.org/techniques/T1020',
    tactics: ['exfiltration'],
  },
  {
    name: 'BITS Jobs',
    id: 'T1197',
    reference: 'https://attack.mitre.org/techniques/T1197',
    tactics: ['defense-evasion', 'persistence'],
  },
  {
    name: 'Bash History',
    id: 'T1139',
    reference: 'https://attack.mitre.org/techniques/T1139',
    tactics: [],
  },
  {
    name: 'Bash History',
    id: 'T1552.003',
    reference: 'https://attack.mitre.org/techniques/T1552/003',
    tactics: ['credential-access'],
  },
  {
    name: 'Bidirectional Communication',
    id: 'T1102.002',
    reference: 'https://attack.mitre.org/techniques/T1102/002',
    tactics: ['command-and-control'],
  },
  {
    name: 'Binary Padding',
    id: 'T1009',
    reference: 'https://attack.mitre.org/techniques/T1009',
    tactics: [],
  },
  {
    name: 'Binary Padding',
    id: 'T1027.001',
    reference: 'https://attack.mitre.org/techniques/T1027/001',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Boot or Logon Autostart Execution',
    id: 'T1547',
    reference: 'https://attack.mitre.org/techniques/T1547',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Boot or Logon Initialization Scripts',
    id: 'T1037',
    reference: 'https://attack.mitre.org/techniques/T1037',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Bootkit',
    id: 'T1067',
    reference: 'https://attack.mitre.org/techniques/T1067',
    tactics: [],
  },
  {
    name: 'Bootkit',
    id: 'T1542.003',
    reference: 'https://attack.mitre.org/techniques/T1542/003',
    tactics: ['persistence', 'defense-evasion'],
  },
  {
    name: 'Browser Bookmark Discovery',
    id: 'T1217',
    reference: 'https://attack.mitre.org/techniques/T1217',
    tactics: ['discovery'],
  },
  {
    name: 'Browser Extensions',
    id: 'T1176',
    reference: 'https://attack.mitre.org/techniques/T1176',
    tactics: ['persistence'],
  },
  {
    name: 'Brute Force',
    id: 'T1110',
    reference: 'https://attack.mitre.org/techniques/T1110',
    tactics: ['credential-access'],
  },
  {
    name: 'Bypass User Access Control',
    id: 'T1548.002',
    reference: 'https://attack.mitre.org/techniques/T1548/002',
    tactics: ['privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Bypass User Account Control',
    id: 'T1088',
    reference: 'https://attack.mitre.org/techniques/T1088',
    tactics: [],
  },
  {
    name: 'CMSTP',
    id: 'T1191',
    reference: 'https://attack.mitre.org/techniques/T1191',
    tactics: [],
  },
  {
    name: 'CMSTP',
    id: 'T1218.003',
    reference: 'https://attack.mitre.org/techniques/T1218/003',
    tactics: ['defense-evasion'],
  },
  {
    name: 'COR_PROFILER',
    id: 'T1574.012',
    reference: 'https://attack.mitre.org/techniques/T1574/012',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Cached Domain Credentials',
    id: 'T1003.005',
    reference: 'https://attack.mitre.org/techniques/T1003/005',
    tactics: ['credential-access'],
  },
  {
    name: 'Change Default File Association',
    id: 'T1042',
    reference: 'https://attack.mitre.org/techniques/T1042',
    tactics: [],
  },
  {
    name: 'Change Default File Association',
    id: 'T1546.001',
    reference: 'https://attack.mitre.org/techniques/T1546/001',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Clear Command History',
    id: 'T1146',
    reference: 'https://attack.mitre.org/techniques/T1146',
    tactics: [],
  },
  {
    name: 'Clear Command History',
    id: 'T1070.003',
    reference: 'https://attack.mitre.org/techniques/T1070/003',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Clear Linux or Mac System Logs',
    id: 'T1070.002',
    reference: 'https://attack.mitre.org/techniques/T1070/002',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Clear Windows Event Logs',
    id: 'T1070.001',
    reference: 'https://attack.mitre.org/techniques/T1070/001',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Clipboard Data',
    id: 'T1115',
    reference: 'https://attack.mitre.org/techniques/T1115',
    tactics: ['collection'],
  },
  {
    name: 'Cloud Account',
    id: 'T1136.003',
    reference: 'https://attack.mitre.org/techniques/T1136/003',
    tactics: ['persistence'],
  },
  {
    name: 'Cloud Account',
    id: 'T1087.004',
    reference: 'https://attack.mitre.org/techniques/T1087/004',
    tactics: ['discovery'],
  },
  {
    name: 'Cloud Accounts',
    id: 'T1078.004',
    reference: 'https://attack.mitre.org/techniques/T1078/004',
    tactics: ['defense-evasion', 'persistence', 'privilege-escalation', 'initial-access'],
  },
  {
    name: 'Cloud Groups',
    id: 'T1069.003',
    reference: 'https://attack.mitre.org/techniques/T1069/003',
    tactics: ['discovery'],
  },
  {
    name: 'Cloud Instance Metadata API',
    id: 'T1522',
    reference: 'https://attack.mitre.org/techniques/T1522',
    tactics: [],
  },
  {
    name: 'Cloud Instance Metadata API',
    id: 'T1552.005',
    reference: 'https://attack.mitre.org/techniques/T1552/005',
    tactics: ['credential-access'],
  },
  {
    name: 'Cloud Service Dashboard',
    id: 'T1538',
    reference: 'https://attack.mitre.org/techniques/T1538',
    tactics: ['discovery'],
  },
  {
    name: 'Cloud Service Discovery',
    id: 'T1526',
    reference: 'https://attack.mitre.org/techniques/T1526',
    tactics: ['discovery'],
  },
  {
    name: 'Code Signing',
    id: 'T1116',
    reference: 'https://attack.mitre.org/techniques/T1116',
    tactics: [],
  },
  {
    name: 'Code Signing',
    id: 'T1553.002',
    reference: 'https://attack.mitre.org/techniques/T1553/002',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Command and Scripting Interpreter',
    id: 'T1059',
    reference: 'https://attack.mitre.org/techniques/T1059',
    tactics: ['execution'],
  },
  {
    name: 'Commonly Used Port',
    id: 'T1043',
    reference: 'https://attack.mitre.org/techniques/T1043',
    tactics: ['command-and-control'],
  },
  {
    name: 'Communication Through Removable Media',
    id: 'T1092',
    reference: 'https://attack.mitre.org/techniques/T1092',
    tactics: ['command-and-control'],
  },
  {
    name: 'Compile After Delivery',
    id: 'T1500',
    reference: 'https://attack.mitre.org/techniques/T1500',
    tactics: [],
  },
  {
    name: 'Compile After Delivery',
    id: 'T1027.004',
    reference: 'https://attack.mitre.org/techniques/T1027/004',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Compiled HTML File',
    id: 'T1223',
    reference: 'https://attack.mitre.org/techniques/T1223',
    tactics: [],
  },
  {
    name: 'Compiled HTML File',
    id: 'T1218.001',
    reference: 'https://attack.mitre.org/techniques/T1218/001',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Component Firmware',
    id: 'T1109',
    reference: 'https://attack.mitre.org/techniques/T1109',
    tactics: [],
  },
  {
    name: 'Component Firmware',
    id: 'T1542.002',
    reference: 'https://attack.mitre.org/techniques/T1542/002',
    tactics: ['persistence', 'defense-evasion'],
  },
  {
    name: 'Component Object Model',
    id: 'T1559.001',
    reference: 'https://attack.mitre.org/techniques/T1559/001',
    tactics: ['execution'],
  },
  {
    name: 'Component Object Model Hijacking',
    id: 'T1122',
    reference: 'https://attack.mitre.org/techniques/T1122',
    tactics: [],
  },
  {
    name: 'Component Object Model Hijacking',
    id: 'T1546.015',
    reference: 'https://attack.mitre.org/techniques/T1546/015',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Component Object Model and Distributed COM',
    id: 'T1175',
    reference: 'https://attack.mitre.org/techniques/T1175',
    tactics: ['lateral-movement', 'execution'],
  },
  {
    name: 'Compromise Client Software Binary',
    id: 'T1554',
    reference: 'https://attack.mitre.org/techniques/T1554',
    tactics: ['persistence'],
  },
  {
    name: 'Compromise Hardware Supply Chain',
    id: 'T1195.003',
    reference: 'https://attack.mitre.org/techniques/T1195/003',
    tactics: ['initial-access'],
  },
  {
    name: 'Compromise Software Dependencies and Development Tools',
    id: 'T1195.001',
    reference: 'https://attack.mitre.org/techniques/T1195/001',
    tactics: ['initial-access'],
  },
  {
    name: 'Compromise Software Supply Chain',
    id: 'T1195.002',
    reference: 'https://attack.mitre.org/techniques/T1195/002',
    tactics: ['initial-access'],
  },
  {
    name: 'Confluence',
    id: 'T1213.001',
    reference: 'https://attack.mitre.org/techniques/T1213/001',
    tactics: ['collection'],
  },
  {
    name: 'Control Panel',
    id: 'T1218.002',
    reference: 'https://attack.mitre.org/techniques/T1218/002',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Control Panel Items',
    id: 'T1196',
    reference: 'https://attack.mitre.org/techniques/T1196',
    tactics: [],
  },
  {
    name: 'Create Account',
    id: 'T1136',
    reference: 'https://attack.mitre.org/techniques/T1136',
    tactics: ['persistence'],
  },
  {
    name: 'Create Cloud Instance',
    id: 'T1578.002',
    reference: 'https://attack.mitre.org/techniques/T1578/002',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Create Process with Token',
    id: 'T1134.002',
    reference: 'https://attack.mitre.org/techniques/T1134/002',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Create Snapshot',
    id: 'T1578.001',
    reference: 'https://attack.mitre.org/techniques/T1578/001',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Create or Modify System Process',
    id: 'T1543',
    reference: 'https://attack.mitre.org/techniques/T1543',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Credential API Hooking',
    id: 'T1056.004',
    reference: 'https://attack.mitre.org/techniques/T1056/004',
    tactics: ['collection', 'credential-access'],
  },
  {
    name: 'Credential Stuffing',
    id: 'T1110.004',
    reference: 'https://attack.mitre.org/techniques/T1110/004',
    tactics: ['credential-access'],
  },
  {
    name: 'Credentials In Files',
    id: 'T1552.001',
    reference: 'https://attack.mitre.org/techniques/T1552/001',
    tactics: ['credential-access'],
  },
  {
    name: 'Credentials from Password Stores',
    id: 'T1555',
    reference: 'https://attack.mitre.org/techniques/T1555',
    tactics: ['credential-access'],
  },
  {
    name: 'Credentials from Web Browsers',
    id: 'T1503',
    reference: 'https://attack.mitre.org/techniques/T1503',
    tactics: [],
  },
  {
    name: 'Credentials from Web Browsers',
    id: 'T1555.003',
    reference: 'https://attack.mitre.org/techniques/T1555/003',
    tactics: ['credential-access'],
  },
  {
    name: 'Credentials in Files',
    id: 'T1081',
    reference: 'https://attack.mitre.org/techniques/T1081',
    tactics: [],
  },
  {
    name: 'Credentials in Registry',
    id: 'T1214',
    reference: 'https://attack.mitre.org/techniques/T1214',
    tactics: [],
  },
  {
    name: 'Credentials in Registry',
    id: 'T1552.002',
    reference: 'https://attack.mitre.org/techniques/T1552/002',
    tactics: ['credential-access'],
  },
  {
    name: 'Cron',
    id: 'T1053.003',
    reference: 'https://attack.mitre.org/techniques/T1053/003',
    tactics: ['execution', 'persistence', 'privilege-escalation'],
  },
  {
    name: 'Custom Command and Control Protocol',
    id: 'T1094',
    reference: 'https://attack.mitre.org/techniques/T1094',
    tactics: [],
  },
  {
    name: 'Custom Cryptographic Protocol',
    id: 'T1024',
    reference: 'https://attack.mitre.org/techniques/T1024',
    tactics: [],
  },
  {
    name: 'DCSync',
    id: 'T1003.006',
    reference: 'https://attack.mitre.org/techniques/T1003/006',
    tactics: ['credential-access'],
  },
  {
    name: 'DLL Search Order Hijacking',
    id: 'T1038',
    reference: 'https://attack.mitre.org/techniques/T1038',
    tactics: [],
  },
  {
    name: 'DLL Search Order Hijacking',
    id: 'T1574.001',
    reference: 'https://attack.mitre.org/techniques/T1574/001',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'DLL Side-Loading',
    id: 'T1073',
    reference: 'https://attack.mitre.org/techniques/T1073',
    tactics: [],
  },
  {
    name: 'DLL Side-Loading',
    id: 'T1574.002',
    reference: 'https://attack.mitre.org/techniques/T1574/002',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'DNS',
    id: 'T1071.004',
    reference: 'https://attack.mitre.org/techniques/T1071/004',
    tactics: ['command-and-control'],
  },
  {
    name: 'DNS Calculation',
    id: 'T1568.003',
    reference: 'https://attack.mitre.org/techniques/T1568/003',
    tactics: ['command-and-control'],
  },
  {
    name: 'Data Compressed',
    id: 'T1002',
    reference: 'https://attack.mitre.org/techniques/T1002',
    tactics: [],
  },
  {
    name: 'Data Destruction',
    id: 'T1485',
    reference: 'https://attack.mitre.org/techniques/T1485',
    tactics: ['impact'],
  },
  {
    name: 'Data Encoding',
    id: 'T1132',
    reference: 'https://attack.mitre.org/techniques/T1132',
    tactics: ['command-and-control'],
  },
  {
    name: 'Data Encrypted',
    id: 'T1022',
    reference: 'https://attack.mitre.org/techniques/T1022',
    tactics: [],
  },
  {
    name: 'Data Encrypted for Impact',
    id: 'T1486',
    reference: 'https://attack.mitre.org/techniques/T1486',
    tactics: ['impact'],
  },
  {
    name: 'Data Manipulation',
    id: 'T1565',
    reference: 'https://attack.mitre.org/techniques/T1565',
    tactics: ['impact'],
  },
  {
    name: 'Data Obfuscation',
    id: 'T1001',
    reference: 'https://attack.mitre.org/techniques/T1001',
    tactics: ['command-and-control'],
  },
  {
    name: 'Data Staged',
    id: 'T1074',
    reference: 'https://attack.mitre.org/techniques/T1074',
    tactics: ['collection'],
  },
  {
    name: 'Data Transfer Size Limits',
    id: 'T1030',
    reference: 'https://attack.mitre.org/techniques/T1030',
    tactics: ['exfiltration'],
  },
  {
    name: 'Data from Cloud Storage Object',
    id: 'T1530',
    reference: 'https://attack.mitre.org/techniques/T1530',
    tactics: ['collection'],
  },
  {
    name: 'Data from Information Repositories',
    id: 'T1213',
    reference: 'https://attack.mitre.org/techniques/T1213',
    tactics: ['collection'],
  },
  {
    name: 'Data from Local System',
    id: 'T1005',
    reference: 'https://attack.mitre.org/techniques/T1005',
    tactics: ['collection'],
  },
  {
    name: 'Data from Network Shared Drive',
    id: 'T1039',
    reference: 'https://attack.mitre.org/techniques/T1039',
    tactics: ['collection'],
  },
  {
    name: 'Data from Removable Media',
    id: 'T1025',
    reference: 'https://attack.mitre.org/techniques/T1025',
    tactics: ['collection'],
  },
  {
    name: 'Dead Drop Resolver',
    id: 'T1102.001',
    reference: 'https://attack.mitre.org/techniques/T1102/001',
    tactics: ['command-and-control'],
  },
  {
    name: 'Defacement',
    id: 'T1491',
    reference: 'https://attack.mitre.org/techniques/T1491',
    tactics: ['impact'],
  },
  {
    name: 'Default Accounts',
    id: 'T1078.001',
    reference: 'https://attack.mitre.org/techniques/T1078/001',
    tactics: ['defense-evasion', 'persistence', 'privilege-escalation', 'initial-access'],
  },
  {
    name: 'Delete Cloud Instance',
    id: 'T1578.003',
    reference: 'https://attack.mitre.org/techniques/T1578/003',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Deobfuscate/Decode Files or Information',
    id: 'T1140',
    reference: 'https://attack.mitre.org/techniques/T1140',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Direct Network Flood',
    id: 'T1498.001',
    reference: 'https://attack.mitre.org/techniques/T1498/001',
    tactics: ['impact'],
  },
  {
    name: 'Direct Volume Access',
    id: 'T1006',
    reference: 'https://attack.mitre.org/techniques/T1006',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Disable Windows Event Logging',
    id: 'T1562.002',
    reference: 'https://attack.mitre.org/techniques/T1562/002',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Disable or Modify Cloud Firewall',
    id: 'T1562.007',
    reference: 'https://attack.mitre.org/techniques/T1562/007',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Disable or Modify System Firewall',
    id: 'T1562.004',
    reference: 'https://attack.mitre.org/techniques/T1562/004',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Disable or Modify Tools',
    id: 'T1562.001',
    reference: 'https://attack.mitre.org/techniques/T1562/001',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Disabling Security Tools',
    id: 'T1089',
    reference: 'https://attack.mitre.org/techniques/T1089',
    tactics: [],
  },
  {
    name: 'Disk Content Wipe',
    id: 'T1488',
    reference: 'https://attack.mitre.org/techniques/T1488',
    tactics: [],
  },
  {
    name: 'Disk Content Wipe',
    id: 'T1561.001',
    reference: 'https://attack.mitre.org/techniques/T1561/001',
    tactics: ['impact'],
  },
  {
    name: 'Disk Structure Wipe',
    id: 'T1487',
    reference: 'https://attack.mitre.org/techniques/T1487',
    tactics: [],
  },
  {
    name: 'Disk Structure Wipe',
    id: 'T1561.002',
    reference: 'https://attack.mitre.org/techniques/T1561/002',
    tactics: ['impact'],
  },
  {
    name: 'Disk Wipe',
    id: 'T1561',
    reference: 'https://attack.mitre.org/techniques/T1561',
    tactics: ['impact'],
  },
  {
    name: 'Distributed Component Object Model',
    id: 'T1021.003',
    reference: 'https://attack.mitre.org/techniques/T1021/003',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Domain Account',
    id: 'T1136.002',
    reference: 'https://attack.mitre.org/techniques/T1136/002',
    tactics: ['persistence'],
  },
  {
    name: 'Domain Account',
    id: 'T1087.002',
    reference: 'https://attack.mitre.org/techniques/T1087/002',
    tactics: ['discovery'],
  },
  {
    name: 'Domain Accounts',
    id: 'T1078.002',
    reference: 'https://attack.mitre.org/techniques/T1078/002',
    tactics: ['defense-evasion', 'persistence', 'privilege-escalation', 'initial-access'],
  },
  {
    name: 'Domain Controller Authentication',
    id: 'T1556.001',
    reference: 'https://attack.mitre.org/techniques/T1556/001',
    tactics: ['credential-access', 'defense-evasion'],
  },
  {
    name: 'Domain Fronting',
    id: 'T1172',
    reference: 'https://attack.mitre.org/techniques/T1172',
    tactics: [],
  },
  {
    name: 'Domain Fronting',
    id: 'T1090.004',
    reference: 'https://attack.mitre.org/techniques/T1090/004',
    tactics: ['command-and-control'],
  },
  {
    name: 'Domain Generation Algorithms',
    id: 'T1483',
    reference: 'https://attack.mitre.org/techniques/T1483',
    tactics: [],
  },
  {
    name: 'Domain Generation Algorithms',
    id: 'T1568.002',
    reference: 'https://attack.mitre.org/techniques/T1568/002',
    tactics: ['command-and-control'],
  },
  {
    name: 'Domain Groups',
    id: 'T1069.002',
    reference: 'https://attack.mitre.org/techniques/T1069/002',
    tactics: ['discovery'],
  },
  {
    name: 'Domain Trust Discovery',
    id: 'T1482',
    reference: 'https://attack.mitre.org/techniques/T1482',
    tactics: ['discovery'],
  },
  {
    name: 'Drive-by Compromise',
    id: 'T1189',
    reference: 'https://attack.mitre.org/techniques/T1189',
    tactics: ['initial-access'],
  },
  {
    name: 'Dylib Hijacking',
    id: 'T1157',
    reference: 'https://attack.mitre.org/techniques/T1157',
    tactics: [],
  },
  {
    name: 'Dylib Hijacking',
    id: 'T1574.004',
    reference: 'https://attack.mitre.org/techniques/T1574/004',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Dynamic Data Exchange',
    id: 'T1173',
    reference: 'https://attack.mitre.org/techniques/T1173',
    tactics: [],
  },
  {
    name: 'Dynamic Data Exchange',
    id: 'T1559.002',
    reference: 'https://attack.mitre.org/techniques/T1559/002',
    tactics: ['execution'],
  },
  {
    name: 'Dynamic Resolution',
    id: 'T1568',
    reference: 'https://attack.mitre.org/techniques/T1568',
    tactics: ['command-and-control'],
  },
  {
    name: 'Dynamic-link Library Injection',
    id: 'T1055.001',
    reference: 'https://attack.mitre.org/techniques/T1055/001',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Elevated Execution with Prompt',
    id: 'T1514',
    reference: 'https://attack.mitre.org/techniques/T1514',
    tactics: [],
  },
  {
    name: 'Elevated Execution with Prompt',
    id: 'T1548.004',
    reference: 'https://attack.mitre.org/techniques/T1548/004',
    tactics: ['privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Email Account',
    id: 'T1087.003',
    reference: 'https://attack.mitre.org/techniques/T1087/003',
    tactics: ['discovery'],
  },
  {
    name: 'Email Collection',
    id: 'T1114',
    reference: 'https://attack.mitre.org/techniques/T1114',
    tactics: ['collection'],
  },
  {
    name: 'Email Forwarding Rule',
    id: 'T1114.003',
    reference: 'https://attack.mitre.org/techniques/T1114/003',
    tactics: ['collection'],
  },
  {
    name: 'Emond',
    id: 'T1519',
    reference: 'https://attack.mitre.org/techniques/T1519',
    tactics: [],
  },
  {
    name: 'Emond',
    id: 'T1546.014',
    reference: 'https://attack.mitre.org/techniques/T1546/014',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Encrypted Channel',
    id: 'T1573',
    reference: 'https://attack.mitre.org/techniques/T1573',
    tactics: ['command-and-control'],
  },
  {
    name: 'Endpoint Denial of Service',
    id: 'T1499',
    reference: 'https://attack.mitre.org/techniques/T1499',
    tactics: ['impact'],
  },
  {
    name: 'Environmental Keying',
    id: 'T1480.001',
    reference: 'https://attack.mitre.org/techniques/T1480/001',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Event Triggered Execution',
    id: 'T1546',
    reference: 'https://attack.mitre.org/techniques/T1546',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Exchange Email Delegate Permissions',
    id: 'T1098.002',
    reference: 'https://attack.mitre.org/techniques/T1098/002',
    tactics: ['persistence'],
  },
  {
    name: 'Executable Installer File Permissions Weakness',
    id: 'T1574.005',
    reference: 'https://attack.mitre.org/techniques/T1574/005',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Execution Guardrails',
    id: 'T1480',
    reference: 'https://attack.mitre.org/techniques/T1480',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Exfiltration Over Alternative Protocol',
    id: 'T1048',
    reference: 'https://attack.mitre.org/techniques/T1048',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exfiltration Over Asymmetric Encrypted Non-C2 Protocol',
    id: 'T1048.002',
    reference: 'https://attack.mitre.org/techniques/T1048/002',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exfiltration Over Bluetooth',
    id: 'T1011.001',
    reference: 'https://attack.mitre.org/techniques/T1011/001',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exfiltration Over C2 Channel',
    id: 'T1041',
    reference: 'https://attack.mitre.org/techniques/T1041',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exfiltration Over Other Network Medium',
    id: 'T1011',
    reference: 'https://attack.mitre.org/techniques/T1011',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exfiltration Over Physical Medium',
    id: 'T1052',
    reference: 'https://attack.mitre.org/techniques/T1052',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exfiltration Over Symmetric Encrypted Non-C2 Protocol',
    id: 'T1048.001',
    reference: 'https://attack.mitre.org/techniques/T1048/001',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exfiltration Over Unencrypted/Obfuscated Non-C2 Protocol',
    id: 'T1048.003',
    reference: 'https://attack.mitre.org/techniques/T1048/003',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exfiltration Over Web Service',
    id: 'T1567',
    reference: 'https://attack.mitre.org/techniques/T1567',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exfiltration over USB',
    id: 'T1052.001',
    reference: 'https://attack.mitre.org/techniques/T1052/001',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exfiltration to Cloud Storage',
    id: 'T1567.002',
    reference: 'https://attack.mitre.org/techniques/T1567/002',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exfiltration to Code Repository',
    id: 'T1567.001',
    reference: 'https://attack.mitre.org/techniques/T1567/001',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exploit Public-Facing Application',
    id: 'T1190',
    reference: 'https://attack.mitre.org/techniques/T1190',
    tactics: ['initial-access'],
  },
  {
    name: 'Exploitation for Client Execution',
    id: 'T1203',
    reference: 'https://attack.mitre.org/techniques/T1203',
    tactics: ['execution'],
  },
  {
    name: 'Exploitation for Credential Access',
    id: 'T1212',
    reference: 'https://attack.mitre.org/techniques/T1212',
    tactics: ['credential-access'],
  },
  {
    name: 'Exploitation for Defense Evasion',
    id: 'T1211',
    reference: 'https://attack.mitre.org/techniques/T1211',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Exploitation for Privilege Escalation',
    id: 'T1068',
    reference: 'https://attack.mitre.org/techniques/T1068',
    tactics: ['privilege-escalation'],
  },
  {
    name: 'Exploitation of Remote Services',
    id: 'T1210',
    reference: 'https://attack.mitre.org/techniques/T1210',
    tactics: ['lateral-movement'],
  },
  {
    name: 'External Defacement',
    id: 'T1491.002',
    reference: 'https://attack.mitre.org/techniques/T1491/002',
    tactics: ['impact'],
  },
  {
    name: 'External Proxy',
    id: 'T1090.002',
    reference: 'https://attack.mitre.org/techniques/T1090/002',
    tactics: ['command-and-control'],
  },
  {
    name: 'External Remote Services',
    id: 'T1133',
    reference: 'https://attack.mitre.org/techniques/T1133',
    tactics: ['persistence', 'initial-access'],
  },
  {
    name: 'Extra Window Memory Injection',
    id: 'T1181',
    reference: 'https://attack.mitre.org/techniques/T1181',
    tactics: [],
  },
  {
    name: 'Extra Window Memory Injection',
    id: 'T1055.011',
    reference: 'https://attack.mitre.org/techniques/T1055/011',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Fallback Channels',
    id: 'T1008',
    reference: 'https://attack.mitre.org/techniques/T1008',
    tactics: ['command-and-control'],
  },
  {
    name: 'Fast Flux DNS',
    id: 'T1568.001',
    reference: 'https://attack.mitre.org/techniques/T1568/001',
    tactics: ['command-and-control'],
  },
  {
    name: 'File Deletion',
    id: 'T1107',
    reference: 'https://attack.mitre.org/techniques/T1107',
    tactics: [],
  },
  {
    name: 'File Deletion',
    id: 'T1070.004',
    reference: 'https://attack.mitre.org/techniques/T1070/004',
    tactics: ['defense-evasion'],
  },
  {
    name: 'File System Permissions Weakness',
    id: 'T1044',
    reference: 'https://attack.mitre.org/techniques/T1044',
    tactics: [],
  },
  {
    name: 'File Transfer Protocols',
    id: 'T1071.002',
    reference: 'https://attack.mitre.org/techniques/T1071/002',
    tactics: ['command-and-control'],
  },
  {
    name: 'File and Directory Discovery',
    id: 'T1083',
    reference: 'https://attack.mitre.org/techniques/T1083',
    tactics: ['discovery'],
  },
  {
    name: 'File and Directory Permissions Modification',
    id: 'T1222',
    reference: 'https://attack.mitre.org/techniques/T1222',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Firmware Corruption',
    id: 'T1495',
    reference: 'https://attack.mitre.org/techniques/T1495',
    tactics: ['impact'],
  },
  {
    name: 'Forced Authentication',
    id: 'T1187',
    reference: 'https://attack.mitre.org/techniques/T1187',
    tactics: ['credential-access'],
  },
  {
    name: 'GUI Input Capture',
    id: 'T1056.002',
    reference: 'https://attack.mitre.org/techniques/T1056/002',
    tactics: ['collection', 'credential-access'],
  },
  {
    name: 'Gatekeeper Bypass',
    id: 'T1144',
    reference: 'https://attack.mitre.org/techniques/T1144',
    tactics: [],
  },
  {
    name: 'Gatekeeper Bypass',
    id: 'T1553.001',
    reference: 'https://attack.mitre.org/techniques/T1553/001',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Golden Ticket',
    id: 'T1558.001',
    reference: 'https://attack.mitre.org/techniques/T1558/001',
    tactics: ['credential-access'],
  },
  {
    name: 'Graphical User Interface',
    id: 'T1061',
    reference: 'https://attack.mitre.org/techniques/T1061',
    tactics: ['execution'],
  },
  {
    name: 'Group Policy Modification',
    id: 'T1484',
    reference: 'https://attack.mitre.org/techniques/T1484',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Group Policy Preferences',
    id: 'T1552.006',
    reference: 'https://attack.mitre.org/techniques/T1552/006',
    tactics: ['credential-access'],
  },
  {
    name: 'HISTCONTROL',
    id: 'T1148',
    reference: 'https://attack.mitre.org/techniques/T1148',
    tactics: [],
  },
  {
    name: 'HISTCONTROL',
    id: 'T1562.003',
    reference: 'https://attack.mitre.org/techniques/T1562/003',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Hardware Additions',
    id: 'T1200',
    reference: 'https://attack.mitre.org/techniques/T1200',
    tactics: ['initial-access'],
  },
  {
    name: 'Hidden File System',
    id: 'T1564.005',
    reference: 'https://attack.mitre.org/techniques/T1564/005',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Hidden Files and Directories',
    id: 'T1158',
    reference: 'https://attack.mitre.org/techniques/T1158',
    tactics: [],
  },
  {
    name: 'Hidden Files and Directories',
    id: 'T1564.001',
    reference: 'https://attack.mitre.org/techniques/T1564/001',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Hidden Users',
    id: 'T1147',
    reference: 'https://attack.mitre.org/techniques/T1147',
    tactics: [],
  },
  {
    name: 'Hidden Users',
    id: 'T1564.002',
    reference: 'https://attack.mitre.org/techniques/T1564/002',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Hidden Window',
    id: 'T1143',
    reference: 'https://attack.mitre.org/techniques/T1143',
    tactics: [],
  },
  {
    name: 'Hidden Window',
    id: 'T1564.003',
    reference: 'https://attack.mitre.org/techniques/T1564/003',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Hide Artifacts',
    id: 'T1564',
    reference: 'https://attack.mitre.org/techniques/T1564',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Hijack Execution Flow',
    id: 'T1574',
    reference: 'https://attack.mitre.org/techniques/T1574',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Hooking',
    id: 'T1179',
    reference: 'https://attack.mitre.org/techniques/T1179',
    tactics: [],
  },
  {
    name: 'Hypervisor',
    id: 'T1062',
    reference: 'https://attack.mitre.org/techniques/T1062',
    tactics: ['persistence'],
  },
  {
    name: 'Image File Execution Options Injection',
    id: 'T1183',
    reference: 'https://attack.mitre.org/techniques/T1183',
    tactics: [],
  },
  {
    name: 'Image File Execution Options Injection',
    id: 'T1546.012',
    reference: 'https://attack.mitre.org/techniques/T1546/012',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Impair Defenses',
    id: 'T1562',
    reference: 'https://attack.mitre.org/techniques/T1562',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Implant Container Image',
    id: 'T1525',
    reference: 'https://attack.mitre.org/techniques/T1525',
    tactics: ['persistence'],
  },
  {
    name: 'Indicator Blocking',
    id: 'T1054',
    reference: 'https://attack.mitre.org/techniques/T1054',
    tactics: [],
  },
  {
    name: 'Indicator Blocking',
    id: 'T1562.006',
    reference: 'https://attack.mitre.org/techniques/T1562/006',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Indicator Removal from Tools',
    id: 'T1066',
    reference: 'https://attack.mitre.org/techniques/T1066',
    tactics: [],
  },
  {
    name: 'Indicator Removal from Tools',
    id: 'T1027.005',
    reference: 'https://attack.mitre.org/techniques/T1027/005',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Indicator Removal on Host',
    id: 'T1070',
    reference: 'https://attack.mitre.org/techniques/T1070',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Indirect Command Execution',
    id: 'T1202',
    reference: 'https://attack.mitre.org/techniques/T1202',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Ingress Tool Transfer',
    id: 'T1105',
    reference: 'https://attack.mitre.org/techniques/T1105',
    tactics: ['command-and-control'],
  },
  {
    name: 'Inhibit System Recovery',
    id: 'T1490',
    reference: 'https://attack.mitre.org/techniques/T1490',
    tactics: ['impact'],
  },
  {
    name: 'Input Capture',
    id: 'T1056',
    reference: 'https://attack.mitre.org/techniques/T1056',
    tactics: ['collection', 'credential-access'],
  },
  {
    name: 'Input Prompt',
    id: 'T1141',
    reference: 'https://attack.mitre.org/techniques/T1141',
    tactics: [],
  },
  {
    name: 'Install Root Certificate',
    id: 'T1130',
    reference: 'https://attack.mitre.org/techniques/T1130',
    tactics: [],
  },
  {
    name: 'Install Root Certificate',
    id: 'T1553.004',
    reference: 'https://attack.mitre.org/techniques/T1553/004',
    tactics: ['defense-evasion'],
  },
  {
    name: 'InstallUtil',
    id: 'T1118',
    reference: 'https://attack.mitre.org/techniques/T1118',
    tactics: [],
  },
  {
    name: 'InstallUtil',
    id: 'T1218.004',
    reference: 'https://attack.mitre.org/techniques/T1218/004',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Inter-Process Communication',
    id: 'T1559',
    reference: 'https://attack.mitre.org/techniques/T1559',
    tactics: ['execution'],
  },
  {
    name: 'Internal Defacement',
    id: 'T1491.001',
    reference: 'https://attack.mitre.org/techniques/T1491/001',
    tactics: ['impact'],
  },
  {
    name: 'Internal Proxy',
    id: 'T1090.001',
    reference: 'https://attack.mitre.org/techniques/T1090/001',
    tactics: ['command-and-control'],
  },
  {
    name: 'Internal Spearphishing',
    id: 'T1534',
    reference: 'https://attack.mitre.org/techniques/T1534',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Invalid Code Signature',
    id: 'T1036.001',
    reference: 'https://attack.mitre.org/techniques/T1036/001',
    tactics: ['defense-evasion'],
  },
  {
    name: 'JavaScript/JScript',
    id: 'T1059.007',
    reference: 'https://attack.mitre.org/techniques/T1059/007',
    tactics: ['execution'],
  },
  {
    name: 'Junk Data',
    id: 'T1001.001',
    reference: 'https://attack.mitre.org/techniques/T1001/001',
    tactics: ['command-and-control'],
  },
  {
    name: 'Kerberoasting',
    id: 'T1208',
    reference: 'https://attack.mitre.org/techniques/T1208',
    tactics: [],
  },
  {
    name: 'Kerberoasting',
    id: 'T1558.003',
    reference: 'https://attack.mitre.org/techniques/T1558/003',
    tactics: ['credential-access'],
  },
  {
    name: 'Kernel Modules and Extensions',
    id: 'T1215',
    reference: 'https://attack.mitre.org/techniques/T1215',
    tactics: [],
  },
  {
    name: 'Kernel Modules and Extensions',
    id: 'T1547.006',
    reference: 'https://attack.mitre.org/techniques/T1547/006',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Keychain',
    id: 'T1142',
    reference: 'https://attack.mitre.org/techniques/T1142',
    tactics: [],
  },
  {
    name: 'Keychain',
    id: 'T1555.001',
    reference: 'https://attack.mitre.org/techniques/T1555/001',
    tactics: ['credential-access'],
  },
  {
    name: 'Keylogging',
    id: 'T1056.001',
    reference: 'https://attack.mitre.org/techniques/T1056/001',
    tactics: ['collection', 'credential-access'],
  },
  {
    name: 'LC_LOAD_DYLIB Addition',
    id: 'T1161',
    reference: 'https://attack.mitre.org/techniques/T1161',
    tactics: [],
  },
  {
    name: 'LC_LOAD_DYLIB Addition',
    id: 'T1546.006',
    reference: 'https://attack.mitre.org/techniques/T1546/006',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'LC_MAIN Hijacking',
    id: 'T1149',
    reference: 'https://attack.mitre.org/techniques/T1149',
    tactics: ['defense-evasion'],
  },
  {
    name: 'LD_PRELOAD',
    id: 'T1574.006',
    reference: 'https://attack.mitre.org/techniques/T1574/006',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'LLMNR/NBT-NS Poisoning and Relay',
    id: 'T1171',
    reference: 'https://attack.mitre.org/techniques/T1171',
    tactics: [],
  },
  {
    name: 'LLMNR/NBT-NS Poisoning and SMB Relay',
    id: 'T1557.001',
    reference: 'https://attack.mitre.org/techniques/T1557/001',
    tactics: ['credential-access', 'collection'],
  },
  {
    name: 'LSA Secrets',
    id: 'T1003.004',
    reference: 'https://attack.mitre.org/techniques/T1003/004',
    tactics: ['credential-access'],
  },
  {
    name: 'LSASS Driver',
    id: 'T1177',
    reference: 'https://attack.mitre.org/techniques/T1177',
    tactics: [],
  },
  {
    name: 'LSASS Driver',
    id: 'T1547.008',
    reference: 'https://attack.mitre.org/techniques/T1547/008',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'LSASS Memory',
    id: 'T1003.001',
    reference: 'https://attack.mitre.org/techniques/T1003/001',
    tactics: ['credential-access'],
  },
  {
    name: 'Lateral Tool Transfer',
    id: 'T1570',
    reference: 'https://attack.mitre.org/techniques/T1570',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Launch Agent',
    id: 'T1159',
    reference: 'https://attack.mitre.org/techniques/T1159',
    tactics: [],
  },
  {
    name: 'Launch Agent',
    id: 'T1543.001',
    reference: 'https://attack.mitre.org/techniques/T1543/001',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Launch Daemon',
    id: 'T1160',
    reference: 'https://attack.mitre.org/techniques/T1160',
    tactics: [],
  },
  {
    name: 'Launch Daemon',
    id: 'T1543.004',
    reference: 'https://attack.mitre.org/techniques/T1543/004',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Launchctl',
    id: 'T1152',
    reference: 'https://attack.mitre.org/techniques/T1152',
    tactics: [],
  },
  {
    name: 'Launchctl',
    id: 'T1569.001',
    reference: 'https://attack.mitre.org/techniques/T1569/001',
    tactics: ['execution'],
  },
  {
    name: 'Launchd',
    id: 'T1053.004',
    reference: 'https://attack.mitre.org/techniques/T1053/004',
    tactics: ['execution', 'persistence', 'privilege-escalation'],
  },
  {
    name: 'Linux and Mac File and Directory Permissions Modification',
    id: 'T1222.002',
    reference: 'https://attack.mitre.org/techniques/T1222/002',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Local Account',
    id: 'T1136.001',
    reference: 'https://attack.mitre.org/techniques/T1136/001',
    tactics: ['persistence'],
  },
  {
    name: 'Local Account',
    id: 'T1087.001',
    reference: 'https://attack.mitre.org/techniques/T1087/001',
    tactics: ['discovery'],
  },
  {
    name: 'Local Accounts',
    id: 'T1078.003',
    reference: 'https://attack.mitre.org/techniques/T1078/003',
    tactics: ['defense-evasion', 'persistence', 'privilege-escalation', 'initial-access'],
  },
  {
    name: 'Local Data Staging',
    id: 'T1074.001',
    reference: 'https://attack.mitre.org/techniques/T1074/001',
    tactics: ['collection'],
  },
  {
    name: 'Local Email Collection',
    id: 'T1114.001',
    reference: 'https://attack.mitre.org/techniques/T1114/001',
    tactics: ['collection'],
  },
  {
    name: 'Local Groups',
    id: 'T1069.001',
    reference: 'https://attack.mitre.org/techniques/T1069/001',
    tactics: ['discovery'],
  },
  {
    name: 'Local Job Scheduling',
    id: 'T1168',
    reference: 'https://attack.mitre.org/techniques/T1168',
    tactics: [],
  },
  {
    name: 'Login Item',
    id: 'T1162',
    reference: 'https://attack.mitre.org/techniques/T1162',
    tactics: [],
  },
  {
    name: 'Logon Script (Mac)',
    id: 'T1037.002',
    reference: 'https://attack.mitre.org/techniques/T1037/002',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Logon Script (Windows)',
    id: 'T1037.001',
    reference: 'https://attack.mitre.org/techniques/T1037/001',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'MSBuild',
    id: 'T1127.001',
    reference: 'https://attack.mitre.org/techniques/T1127/001',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Mail Protocols',
    id: 'T1071.003',
    reference: 'https://attack.mitre.org/techniques/T1071/003',
    tactics: ['command-and-control'],
  },
  {
    name: 'Make and Impersonate Token',
    id: 'T1134.003',
    reference: 'https://attack.mitre.org/techniques/T1134/003',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Malicious File',
    id: 'T1204.002',
    reference: 'https://attack.mitre.org/techniques/T1204/002',
    tactics: ['execution'],
  },
  {
    name: 'Malicious Link',
    id: 'T1204.001',
    reference: 'https://attack.mitre.org/techniques/T1204/001',
    tactics: ['execution'],
  },
  {
    name: 'Man in the Browser',
    id: 'T1185',
    reference: 'https://attack.mitre.org/techniques/T1185',
    tactics: ['collection'],
  },
  {
    name: 'Man-in-the-Middle',
    id: 'T1557',
    reference: 'https://attack.mitre.org/techniques/T1557',
    tactics: ['credential-access', 'collection'],
  },
  {
    name: 'Masquerade Task or Service',
    id: 'T1036.004',
    reference: 'https://attack.mitre.org/techniques/T1036/004',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Masquerading',
    id: 'T1036',
    reference: 'https://attack.mitre.org/techniques/T1036',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Match Legitimate Name or Location',
    id: 'T1036.005',
    reference: 'https://attack.mitre.org/techniques/T1036/005',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Modify Authentication Process',
    id: 'T1556',
    reference: 'https://attack.mitre.org/techniques/T1556',
    tactics: ['credential-access', 'defense-evasion'],
  },
  {
    name: 'Modify Cloud Compute Infrastructure',
    id: 'T1578',
    reference: 'https://attack.mitre.org/techniques/T1578',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Modify Existing Service',
    id: 'T1031',
    reference: 'https://attack.mitre.org/techniques/T1031',
    tactics: [],
  },
  {
    name: 'Modify Registry',
    id: 'T1112',
    reference: 'https://attack.mitre.org/techniques/T1112',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Mshta',
    id: 'T1170',
    reference: 'https://attack.mitre.org/techniques/T1170',
    tactics: [],
  },
  {
    name: 'Mshta',
    id: 'T1218.005',
    reference: 'https://attack.mitre.org/techniques/T1218/005',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Msiexec',
    id: 'T1218.007',
    reference: 'https://attack.mitre.org/techniques/T1218/007',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Multi-Stage Channels',
    id: 'T1104',
    reference: 'https://attack.mitre.org/techniques/T1104',
    tactics: ['command-and-control'],
  },
  {
    name: 'Multi-hop Proxy',
    id: 'T1188',
    reference: 'https://attack.mitre.org/techniques/T1188',
    tactics: [],
  },
  {
    name: 'Multi-hop Proxy',
    id: 'T1090.003',
    reference: 'https://attack.mitre.org/techniques/T1090/003',
    tactics: ['command-and-control'],
  },
  {
    name: 'Multiband Communication',
    id: 'T1026',
    reference: 'https://attack.mitre.org/techniques/T1026',
    tactics: ['command-and-control'],
  },
  {
    name: 'Multilayer Encryption',
    id: 'T1079',
    reference: 'https://attack.mitre.org/techniques/T1079',
    tactics: [],
  },
  {
    name: 'NTDS',
    id: 'T1003.003',
    reference: 'https://attack.mitre.org/techniques/T1003/003',
    tactics: ['credential-access'],
  },
  {
    name: 'NTFS File Attributes',
    id: 'T1096',
    reference: 'https://attack.mitre.org/techniques/T1096',
    tactics: [],
  },
  {
    name: 'NTFS File Attributes',
    id: 'T1564.004',
    reference: 'https://attack.mitre.org/techniques/T1564/004',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Native API',
    id: 'T1106',
    reference: 'https://attack.mitre.org/techniques/T1106',
    tactics: ['execution'],
  },
  {
    name: 'Netsh Helper DLL',
    id: 'T1128',
    reference: 'https://attack.mitre.org/techniques/T1128',
    tactics: [],
  },
  {
    name: 'Netsh Helper DLL',
    id: 'T1546.007',
    reference: 'https://attack.mitre.org/techniques/T1546/007',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Network Denial of Service',
    id: 'T1498',
    reference: 'https://attack.mitre.org/techniques/T1498',
    tactics: ['impact'],
  },
  {
    name: 'Network Logon Script',
    id: 'T1037.003',
    reference: 'https://attack.mitre.org/techniques/T1037/003',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Network Service Scanning',
    id: 'T1046',
    reference: 'https://attack.mitre.org/techniques/T1046',
    tactics: ['discovery'],
  },
  {
    name: 'Network Share Connection Removal',
    id: 'T1126',
    reference: 'https://attack.mitre.org/techniques/T1126',
    tactics: [],
  },
  {
    name: 'Network Share Connection Removal',
    id: 'T1070.005',
    reference: 'https://attack.mitre.org/techniques/T1070/005',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Network Share Discovery',
    id: 'T1135',
    reference: 'https://attack.mitre.org/techniques/T1135',
    tactics: ['discovery'],
  },
  {
    name: 'Network Sniffing',
    id: 'T1040',
    reference: 'https://attack.mitre.org/techniques/T1040',
    tactics: ['credential-access', 'discovery'],
  },
  {
    name: 'New Service',
    id: 'T1050',
    reference: 'https://attack.mitre.org/techniques/T1050',
    tactics: [],
  },
  {
    name: 'Non-Application Layer Protocol',
    id: 'T1095',
    reference: 'https://attack.mitre.org/techniques/T1095',
    tactics: ['command-and-control'],
  },
  {
    name: 'Non-Standard Encoding',
    id: 'T1132.002',
    reference: 'https://attack.mitre.org/techniques/T1132/002',
    tactics: ['command-and-control'],
  },
  {
    name: 'Non-Standard Port',
    id: 'T1571',
    reference: 'https://attack.mitre.org/techniques/T1571',
    tactics: ['command-and-control'],
  },
  {
    name: 'OS Credential Dumping',
    id: 'T1003',
    reference: 'https://attack.mitre.org/techniques/T1003',
    tactics: ['credential-access'],
  },
  {
    name: 'OS Exhaustion Flood',
    id: 'T1499.001',
    reference: 'https://attack.mitre.org/techniques/T1499/001',
    tactics: ['impact'],
  },
  {
    name: 'Obfuscated Files or Information',
    id: 'T1027',
    reference: 'https://attack.mitre.org/techniques/T1027',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Odbcconf',
    id: 'T1218.008',
    reference: 'https://attack.mitre.org/techniques/T1218/008',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Office Application Startup',
    id: 'T1137',
    reference: 'https://attack.mitre.org/techniques/T1137',
    tactics: ['persistence'],
  },
  {
    name: 'Office Template Macros',
    id: 'T1137.001',
    reference: 'https://attack.mitre.org/techniques/T1137/001',
    tactics: ['persistence'],
  },
  {
    name: 'Office Test',
    id: 'T1137.002',
    reference: 'https://attack.mitre.org/techniques/T1137/002',
    tactics: ['persistence'],
  },
  {
    name: 'One-Way Communication',
    id: 'T1102.003',
    reference: 'https://attack.mitre.org/techniques/T1102/003',
    tactics: ['command-and-control'],
  },
  {
    name: 'Outlook Forms',
    id: 'T1137.003',
    reference: 'https://attack.mitre.org/techniques/T1137/003',
    tactics: ['persistence'],
  },
  {
    name: 'Outlook Home Page',
    id: 'T1137.004',
    reference: 'https://attack.mitre.org/techniques/T1137/004',
    tactics: ['persistence'],
  },
  {
    name: 'Outlook Rules',
    id: 'T1137.005',
    reference: 'https://attack.mitre.org/techniques/T1137/005',
    tactics: ['persistence'],
  },
  {
    name: 'Parent PID Spoofing',
    id: 'T1502',
    reference: 'https://attack.mitre.org/techniques/T1502',
    tactics: [],
  },
  {
    name: 'Parent PID Spoofing',
    id: 'T1134.004',
    reference: 'https://attack.mitre.org/techniques/T1134/004',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Pass the Hash',
    id: 'T1075',
    reference: 'https://attack.mitre.org/techniques/T1075',
    tactics: [],
  },
  {
    name: 'Pass the Hash',
    id: 'T1550.002',
    reference: 'https://attack.mitre.org/techniques/T1550/002',
    tactics: ['defense-evasion', 'lateral-movement'],
  },
  {
    name: 'Pass the Ticket',
    id: 'T1097',
    reference: 'https://attack.mitre.org/techniques/T1097',
    tactics: [],
  },
  {
    name: 'Pass the Ticket',
    id: 'T1550.003',
    reference: 'https://attack.mitre.org/techniques/T1550/003',
    tactics: ['defense-evasion', 'lateral-movement'],
  },
  {
    name: 'Password Cracking',
    id: 'T1110.002',
    reference: 'https://attack.mitre.org/techniques/T1110/002',
    tactics: ['credential-access'],
  },
  {
    name: 'Password Filter DLL',
    id: 'T1174',
    reference: 'https://attack.mitre.org/techniques/T1174',
    tactics: [],
  },
  {
    name: 'Password Filter DLL',
    id: 'T1556.002',
    reference: 'https://attack.mitre.org/techniques/T1556/002',
    tactics: ['credential-access', 'defense-evasion'],
  },
  {
    name: 'Password Guessing',
    id: 'T1110.001',
    reference: 'https://attack.mitre.org/techniques/T1110/001',
    tactics: ['credential-access'],
  },
  {
    name: 'Password Policy Discovery',
    id: 'T1201',
    reference: 'https://attack.mitre.org/techniques/T1201',
    tactics: ['discovery'],
  },
  {
    name: 'Password Spraying',
    id: 'T1110.003',
    reference: 'https://attack.mitre.org/techniques/T1110/003',
    tactics: ['credential-access'],
  },
  {
    name: 'Path Interception',
    id: 'T1034',
    reference: 'https://attack.mitre.org/techniques/T1034',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Path Interception by PATH Environment Variable',
    id: 'T1574.007',
    reference: 'https://attack.mitre.org/techniques/T1574/007',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Path Interception by Search Order Hijacking',
    id: 'T1574.008',
    reference: 'https://attack.mitre.org/techniques/T1574/008',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Path Interception by Unquoted Path',
    id: 'T1574.009',
    reference: 'https://attack.mitre.org/techniques/T1574/009',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Peripheral Device Discovery',
    id: 'T1120',
    reference: 'https://attack.mitre.org/techniques/T1120',
    tactics: ['discovery'],
  },
  {
    name: 'Permission Groups Discovery',
    id: 'T1069',
    reference: 'https://attack.mitre.org/techniques/T1069',
    tactics: ['discovery'],
  },
  {
    name: 'Phishing',
    id: 'T1566',
    reference: 'https://attack.mitre.org/techniques/T1566',
    tactics: ['initial-access'],
  },
  {
    name: 'Plist Modification',
    id: 'T1150',
    reference: 'https://attack.mitre.org/techniques/T1150',
    tactics: [],
  },
  {
    name: 'Plist Modification',
    id: 'T1547.011',
    reference: 'https://attack.mitre.org/techniques/T1547/011',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Pluggable Authentication Modules',
    id: 'T1556.003',
    reference: 'https://attack.mitre.org/techniques/T1556/003',
    tactics: ['credential-access', 'defense-evasion'],
  },
  {
    name: 'Port Knocking',
    id: 'T1205.001',
    reference: 'https://attack.mitre.org/techniques/T1205/001',
    tactics: ['defense-evasion', 'persistence', 'command-and-control'],
  },
  {
    name: 'Port Monitors',
    id: 'T1013',
    reference: 'https://attack.mitre.org/techniques/T1013',
    tactics: [],
  },
  {
    name: 'Port Monitors',
    id: 'T1547.010',
    reference: 'https://attack.mitre.org/techniques/T1547/010',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Portable Executable Injection',
    id: 'T1055.002',
    reference: 'https://attack.mitre.org/techniques/T1055/002',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'PowerShell',
    id: 'T1086',
    reference: 'https://attack.mitre.org/techniques/T1086',
    tactics: [],
  },
  {
    name: 'PowerShell',
    id: 'T1059.001',
    reference: 'https://attack.mitre.org/techniques/T1059/001',
    tactics: ['execution'],
  },
  {
    name: 'PowerShell Profile',
    id: 'T1504',
    reference: 'https://attack.mitre.org/techniques/T1504',
    tactics: [],
  },
  {
    name: 'PowerShell Profile',
    id: 'T1546.013',
    reference: 'https://attack.mitre.org/techniques/T1546/013',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Pre-OS Boot',
    id: 'T1542',
    reference: 'https://attack.mitre.org/techniques/T1542',
    tactics: ['defense-evasion', 'persistence'],
  },
  {
    name: 'Private Keys',
    id: 'T1145',
    reference: 'https://attack.mitre.org/techniques/T1145',
    tactics: [],
  },
  {
    name: 'Private Keys',
    id: 'T1552.004',
    reference: 'https://attack.mitre.org/techniques/T1552/004',
    tactics: ['credential-access'],
  },
  {
    name: 'Proc Filesystem',
    id: 'T1003.007',
    reference: 'https://attack.mitre.org/techniques/T1003/007',
    tactics: ['credential-access'],
  },
  {
    name: 'Proc Memory',
    id: 'T1055.009',
    reference: 'https://attack.mitre.org/techniques/T1055/009',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Process Discovery',
    id: 'T1057',
    reference: 'https://attack.mitre.org/techniques/T1057',
    tactics: ['discovery'],
  },
  {
    name: 'Process Doppelgänging',
    id: 'T1186',
    reference: 'https://attack.mitre.org/techniques/T1186',
    tactics: [],
  },
  {
    name: 'Process Doppelgänging',
    id: 'T1055.013',
    reference: 'https://attack.mitre.org/techniques/T1055/013',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Process Hollowing',
    id: 'T1093',
    reference: 'https://attack.mitre.org/techniques/T1093',
    tactics: [],
  },
  {
    name: 'Process Hollowing',
    id: 'T1055.012',
    reference: 'https://attack.mitre.org/techniques/T1055/012',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Process Injection',
    id: 'T1055',
    reference: 'https://attack.mitre.org/techniques/T1055',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Protocol Impersonation',
    id: 'T1001.003',
    reference: 'https://attack.mitre.org/techniques/T1001/003',
    tactics: ['command-and-control'],
  },
  {
    name: 'Protocol Tunneling',
    id: 'T1572',
    reference: 'https://attack.mitre.org/techniques/T1572',
    tactics: ['command-and-control'],
  },
  {
    name: 'Proxy',
    id: 'T1090',
    reference: 'https://attack.mitre.org/techniques/T1090',
    tactics: ['command-and-control'],
  },
  {
    name: 'Ptrace System Calls',
    id: 'T1055.008',
    reference: 'https://attack.mitre.org/techniques/T1055/008',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'PubPrn',
    id: 'T1216.001',
    reference: 'https://attack.mitre.org/techniques/T1216/001',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Python',
    id: 'T1059.006',
    reference: 'https://attack.mitre.org/techniques/T1059/006',
    tactics: ['execution'],
  },
  {
    name: 'Query Registry',
    id: 'T1012',
    reference: 'https://attack.mitre.org/techniques/T1012',
    tactics: ['discovery'],
  },
  {
    name: 'RDP Hijacking',
    id: 'T1563.002',
    reference: 'https://attack.mitre.org/techniques/T1563/002',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Rc.common',
    id: 'T1163',
    reference: 'https://attack.mitre.org/techniques/T1163',
    tactics: [],
  },
  {
    name: 'Rc.common',
    id: 'T1037.004',
    reference: 'https://attack.mitre.org/techniques/T1037/004',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Re-opened Applications',
    id: 'T1164',
    reference: 'https://attack.mitre.org/techniques/T1164',
    tactics: [],
  },
  {
    name: 'Re-opened Applications',
    id: 'T1547.007',
    reference: 'https://attack.mitre.org/techniques/T1547/007',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Redundant Access',
    id: 'T1108',
    reference: 'https://attack.mitre.org/techniques/T1108',
    tactics: ['defense-evasion', 'persistence'],
  },
  {
    name: 'Reflection Amplification',
    id: 'T1498.002',
    reference: 'https://attack.mitre.org/techniques/T1498/002',
    tactics: ['impact'],
  },
  {
    name: 'Registry Run Keys / Startup Folder',
    id: 'T1060',
    reference: 'https://attack.mitre.org/techniques/T1060',
    tactics: [],
  },
  {
    name: 'Registry Run Keys / Startup Folder',
    id: 'T1547.001',
    reference: 'https://attack.mitre.org/techniques/T1547/001',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Regsvcs/Regasm',
    id: 'T1121',
    reference: 'https://attack.mitre.org/techniques/T1121',
    tactics: [],
  },
  {
    name: 'Regsvcs/Regasm',
    id: 'T1218.009',
    reference: 'https://attack.mitre.org/techniques/T1218/009',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Regsvr32',
    id: 'T1117',
    reference: 'https://attack.mitre.org/techniques/T1117',
    tactics: [],
  },
  {
    name: 'Regsvr32',
    id: 'T1218.010',
    reference: 'https://attack.mitre.org/techniques/T1218/010',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Remote Access Software',
    id: 'T1219',
    reference: 'https://attack.mitre.org/techniques/T1219',
    tactics: ['command-and-control'],
  },
  {
    name: 'Remote Data Staging',
    id: 'T1074.002',
    reference: 'https://attack.mitre.org/techniques/T1074/002',
    tactics: ['collection'],
  },
  {
    name: 'Remote Desktop Protocol',
    id: 'T1076',
    reference: 'https://attack.mitre.org/techniques/T1076',
    tactics: [],
  },
  {
    name: 'Remote Desktop Protocol',
    id: 'T1021.001',
    reference: 'https://attack.mitre.org/techniques/T1021/001',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Remote Email Collection',
    id: 'T1114.002',
    reference: 'https://attack.mitre.org/techniques/T1114/002',
    tactics: ['collection'],
  },
  {
    name: 'Remote Service Session Hijacking',
    id: 'T1563',
    reference: 'https://attack.mitre.org/techniques/T1563',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Remote Services',
    id: 'T1021',
    reference: 'https://attack.mitre.org/techniques/T1021',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Remote System Discovery',
    id: 'T1018',
    reference: 'https://attack.mitre.org/techniques/T1018',
    tactics: ['discovery'],
  },
  {
    name: 'Rename System Utilities',
    id: 'T1036.003',
    reference: 'https://attack.mitre.org/techniques/T1036/003',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Replication Through Removable Media',
    id: 'T1091',
    reference: 'https://attack.mitre.org/techniques/T1091',
    tactics: ['lateral-movement', 'initial-access'],
  },
  {
    name: 'Resource Hijacking',
    id: 'T1496',
    reference: 'https://attack.mitre.org/techniques/T1496',
    tactics: ['impact'],
  },
  {
    name: 'Revert Cloud Instance',
    id: 'T1536',
    reference: 'https://attack.mitre.org/techniques/T1536',
    tactics: [],
  },
  {
    name: 'Revert Cloud Instance',
    id: 'T1578.004',
    reference: 'https://attack.mitre.org/techniques/T1578/004',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Right-to-Left Override',
    id: 'T1036.002',
    reference: 'https://attack.mitre.org/techniques/T1036/002',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Rogue Domain Controller',
    id: 'T1207',
    reference: 'https://attack.mitre.org/techniques/T1207',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Rootkit',
    id: 'T1014',
    reference: 'https://attack.mitre.org/techniques/T1014',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Run Virtual Instance',
    id: 'T1564.006',
    reference: 'https://attack.mitre.org/techniques/T1564/006',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Rundll32',
    id: 'T1085',
    reference: 'https://attack.mitre.org/techniques/T1085',
    tactics: [],
  },
  {
    name: 'Rundll32',
    id: 'T1218.011',
    reference: 'https://attack.mitre.org/techniques/T1218/011',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Runtime Data Manipulation',
    id: 'T1494',
    reference: 'https://attack.mitre.org/techniques/T1494',
    tactics: [],
  },
  {
    name: 'Runtime Data Manipulation',
    id: 'T1565.003',
    reference: 'https://attack.mitre.org/techniques/T1565/003',
    tactics: ['impact'],
  },
  {
    name: 'SID-History Injection',
    id: 'T1178',
    reference: 'https://attack.mitre.org/techniques/T1178',
    tactics: [],
  },
  {
    name: 'SID-History Injection',
    id: 'T1134.005',
    reference: 'https://attack.mitre.org/techniques/T1134/005',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'SIP and Trust Provider Hijacking',
    id: 'T1198',
    reference: 'https://attack.mitre.org/techniques/T1198',
    tactics: [],
  },
  {
    name: 'SIP and Trust Provider Hijacking',
    id: 'T1553.003',
    reference: 'https://attack.mitre.org/techniques/T1553/003',
    tactics: ['defense-evasion'],
  },
  {
    name: 'SMB/Windows Admin Shares',
    id: 'T1021.002',
    reference: 'https://attack.mitre.org/techniques/T1021/002',
    tactics: ['lateral-movement'],
  },
  {
    name: 'SQL Stored Procedures',
    id: 'T1505.001',
    reference: 'https://attack.mitre.org/techniques/T1505/001',
    tactics: ['persistence'],
  },
  {
    name: 'SSH',
    id: 'T1021.004',
    reference: 'https://attack.mitre.org/techniques/T1021/004',
    tactics: ['lateral-movement'],
  },
  {
    name: 'SSH Authorized Keys',
    id: 'T1098.004',
    reference: 'https://attack.mitre.org/techniques/T1098/004',
    tactics: ['persistence'],
  },
  {
    name: 'SSH Hijacking',
    id: 'T1184',
    reference: 'https://attack.mitre.org/techniques/T1184',
    tactics: [],
  },
  {
    name: 'SSH Hijacking',
    id: 'T1563.001',
    reference: 'https://attack.mitre.org/techniques/T1563/001',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Scheduled Task',
    id: 'T1053.005',
    reference: 'https://attack.mitre.org/techniques/T1053/005',
    tactics: ['execution', 'persistence', 'privilege-escalation'],
  },
  {
    name: 'Scheduled Task/Job',
    id: 'T1053',
    reference: 'https://attack.mitre.org/techniques/T1053',
    tactics: ['execution', 'persistence', 'privilege-escalation'],
  },
  {
    name: 'Scheduled Transfer',
    id: 'T1029',
    reference: 'https://attack.mitre.org/techniques/T1029',
    tactics: ['exfiltration'],
  },
  {
    name: 'Screen Capture',
    id: 'T1113',
    reference: 'https://attack.mitre.org/techniques/T1113',
    tactics: ['collection'],
  },
  {
    name: 'Screensaver',
    id: 'T1180',
    reference: 'https://attack.mitre.org/techniques/T1180',
    tactics: [],
  },
  {
    name: 'Screensaver',
    id: 'T1546.002',
    reference: 'https://attack.mitre.org/techniques/T1546/002',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Scripting',
    id: 'T1064',
    reference: 'https://attack.mitre.org/techniques/T1064',
    tactics: ['defense-evasion', 'execution'],
  },
  {
    name: 'Security Account Manager',
    id: 'T1003.002',
    reference: 'https://attack.mitre.org/techniques/T1003/002',
    tactics: ['credential-access'],
  },
  {
    name: 'Security Software Discovery',
    id: 'T1063',
    reference: 'https://attack.mitre.org/techniques/T1063',
    tactics: [],
  },
  {
    name: 'Security Software Discovery',
    id: 'T1518.001',
    reference: 'https://attack.mitre.org/techniques/T1518/001',
    tactics: ['discovery'],
  },
  {
    name: 'Security Support Provider',
    id: 'T1101',
    reference: 'https://attack.mitre.org/techniques/T1101',
    tactics: [],
  },
  {
    name: 'Security Support Provider',
    id: 'T1547.005',
    reference: 'https://attack.mitre.org/techniques/T1547/005',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Securityd Memory',
    id: 'T1167',
    reference: 'https://attack.mitre.org/techniques/T1167',
    tactics: [],
  },
  {
    name: 'Securityd Memory',
    id: 'T1555.002',
    reference: 'https://attack.mitre.org/techniques/T1555/002',
    tactics: ['credential-access'],
  },
  {
    name: 'Server Software Component',
    id: 'T1505',
    reference: 'https://attack.mitre.org/techniques/T1505',
    tactics: ['persistence'],
  },
  {
    name: 'Service Execution',
    id: 'T1035',
    reference: 'https://attack.mitre.org/techniques/T1035',
    tactics: [],
  },
  {
    name: 'Service Execution',
    id: 'T1569.002',
    reference: 'https://attack.mitre.org/techniques/T1569/002',
    tactics: ['execution'],
  },
  {
    name: 'Service Exhaustion Flood',
    id: 'T1499.002',
    reference: 'https://attack.mitre.org/techniques/T1499/002',
    tactics: ['impact'],
  },
  {
    name: 'Service Registry Permissions Weakness',
    id: 'T1058',
    reference: 'https://attack.mitre.org/techniques/T1058',
    tactics: [],
  },
  {
    name: 'Service Stop',
    id: 'T1489',
    reference: 'https://attack.mitre.org/techniques/T1489',
    tactics: ['impact'],
  },
  {
    name: 'Services File Permissions Weakness',
    id: 'T1574.010',
    reference: 'https://attack.mitre.org/techniques/T1574/010',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Services Registry Permissions Weakness',
    id: 'T1574.011',
    reference: 'https://attack.mitre.org/techniques/T1574/011',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Setuid and Setgid',
    id: 'T1166',
    reference: 'https://attack.mitre.org/techniques/T1166',
    tactics: [],
  },
  {
    name: 'Setuid and Setgid',
    id: 'T1548.001',
    reference: 'https://attack.mitre.org/techniques/T1548/001',
    tactics: ['privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Shared Modules',
    id: 'T1129',
    reference: 'https://attack.mitre.org/techniques/T1129',
    tactics: ['execution'],
  },
  {
    name: 'Shared Webroot',
    id: 'T1051',
    reference: 'https://attack.mitre.org/techniques/T1051',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Sharepoint',
    id: 'T1213.002',
    reference: 'https://attack.mitre.org/techniques/T1213/002',
    tactics: ['collection'],
  },
  {
    name: 'Shortcut Modification',
    id: 'T1023',
    reference: 'https://attack.mitre.org/techniques/T1023',
    tactics: [],
  },
  {
    name: 'Shortcut Modification',
    id: 'T1547.009',
    reference: 'https://attack.mitre.org/techniques/T1547/009',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Signed Binary Proxy Execution',
    id: 'T1218',
    reference: 'https://attack.mitre.org/techniques/T1218',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Signed Script Proxy Execution',
    id: 'T1216',
    reference: 'https://attack.mitre.org/techniques/T1216',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Silver Ticket',
    id: 'T1558.002',
    reference: 'https://attack.mitre.org/techniques/T1558/002',
    tactics: ['credential-access'],
  },
  {
    name: 'Software Deployment Tools',
    id: 'T1072',
    reference: 'https://attack.mitre.org/techniques/T1072',
    tactics: ['execution', 'lateral-movement'],
  },
  {
    name: 'Software Discovery',
    id: 'T1518',
    reference: 'https://attack.mitre.org/techniques/T1518',
    tactics: ['discovery'],
  },
  {
    name: 'Software Packing',
    id: 'T1045',
    reference: 'https://attack.mitre.org/techniques/T1045',
    tactics: [],
  },
  {
    name: 'Software Packing',
    id: 'T1027.002',
    reference: 'https://attack.mitre.org/techniques/T1027/002',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Source',
    id: 'T1153',
    reference: 'https://attack.mitre.org/techniques/T1153',
    tactics: ['execution'],
  },
  {
    name: 'Space after Filename',
    id: 'T1151',
    reference: 'https://attack.mitre.org/techniques/T1151',
    tactics: [],
  },
  {
    name: 'Space after Filename',
    id: 'T1036.006',
    reference: 'https://attack.mitre.org/techniques/T1036/006',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Spearphishing Attachment',
    id: 'T1193',
    reference: 'https://attack.mitre.org/techniques/T1193',
    tactics: [],
  },
  {
    name: 'Spearphishing Attachment',
    id: 'T1566.001',
    reference: 'https://attack.mitre.org/techniques/T1566/001',
    tactics: ['initial-access'],
  },
  {
    name: 'Spearphishing Link',
    id: 'T1192',
    reference: 'https://attack.mitre.org/techniques/T1192',
    tactics: [],
  },
  {
    name: 'Spearphishing Link',
    id: 'T1566.002',
    reference: 'https://attack.mitre.org/techniques/T1566/002',
    tactics: ['initial-access'],
  },
  {
    name: 'Spearphishing via Service',
    id: 'T1194',
    reference: 'https://attack.mitre.org/techniques/T1194',
    tactics: [],
  },
  {
    name: 'Spearphishing via Service',
    id: 'T1566.003',
    reference: 'https://attack.mitre.org/techniques/T1566/003',
    tactics: ['initial-access'],
  },
  {
    name: 'Standard Cryptographic Protocol',
    id: 'T1032',
    reference: 'https://attack.mitre.org/techniques/T1032',
    tactics: [],
  },
  {
    name: 'Standard Encoding',
    id: 'T1132.001',
    reference: 'https://attack.mitre.org/techniques/T1132/001',
    tactics: ['command-and-control'],
  },
  {
    name: 'Startup Items',
    id: 'T1165',
    reference: 'https://attack.mitre.org/techniques/T1165',
    tactics: [],
  },
  {
    name: 'Startup Items',
    id: 'T1037.005',
    reference: 'https://attack.mitre.org/techniques/T1037/005',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Steal Application Access Token',
    id: 'T1528',
    reference: 'https://attack.mitre.org/techniques/T1528',
    tactics: ['credential-access'],
  },
  {
    name: 'Steal Web Session Cookie',
    id: 'T1539',
    reference: 'https://attack.mitre.org/techniques/T1539',
    tactics: ['credential-access'],
  },
  {
    name: 'Steal or Forge Kerberos Tickets',
    id: 'T1558',
    reference: 'https://attack.mitre.org/techniques/T1558',
    tactics: ['credential-access'],
  },
  {
    name: 'Steganography',
    id: 'T1027.003',
    reference: 'https://attack.mitre.org/techniques/T1027/003',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Steganography',
    id: 'T1001.002',
    reference: 'https://attack.mitre.org/techniques/T1001/002',
    tactics: ['command-and-control'],
  },
  {
    name: 'Stored Data Manipulation',
    id: 'T1492',
    reference: 'https://attack.mitre.org/techniques/T1492',
    tactics: [],
  },
  {
    name: 'Stored Data Manipulation',
    id: 'T1565.001',
    reference: 'https://attack.mitre.org/techniques/T1565/001',
    tactics: ['impact'],
  },
  {
    name: 'Subvert Trust Controls',
    id: 'T1553',
    reference: 'https://attack.mitre.org/techniques/T1553',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Sudo',
    id: 'T1169',
    reference: 'https://attack.mitre.org/techniques/T1169',
    tactics: [],
  },
  {
    name: 'Sudo Caching',
    id: 'T1206',
    reference: 'https://attack.mitre.org/techniques/T1206',
    tactics: [],
  },
  {
    name: 'Sudo and Sudo Caching',
    id: 'T1548.003',
    reference: 'https://attack.mitre.org/techniques/T1548/003',
    tactics: ['privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'Supply Chain Compromise',
    id: 'T1195',
    reference: 'https://attack.mitre.org/techniques/T1195',
    tactics: ['initial-access'],
  },
  {
    name: 'Symmetric Cryptography',
    id: 'T1573.001',
    reference: 'https://attack.mitre.org/techniques/T1573/001',
    tactics: ['command-and-control'],
  },
  {
    name: 'System Checks',
    id: 'T1497.001',
    reference: 'https://attack.mitre.org/techniques/T1497/001',
    tactics: ['defense-evasion', 'discovery'],
  },
  {
    name: 'System Firmware',
    id: 'T1019',
    reference: 'https://attack.mitre.org/techniques/T1019',
    tactics: [],
  },
  {
    name: 'System Firmware',
    id: 'T1542.001',
    reference: 'https://attack.mitre.org/techniques/T1542/001',
    tactics: ['persistence', 'defense-evasion'],
  },
  {
    name: 'System Information Discovery',
    id: 'T1082',
    reference: 'https://attack.mitre.org/techniques/T1082',
    tactics: ['discovery'],
  },
  {
    name: 'System Network Configuration Discovery',
    id: 'T1016',
    reference: 'https://attack.mitre.org/techniques/T1016',
    tactics: ['discovery'],
  },
  {
    name: 'System Network Connections Discovery',
    id: 'T1049',
    reference: 'https://attack.mitre.org/techniques/T1049',
    tactics: ['discovery'],
  },
  {
    name: 'System Owner/User Discovery',
    id: 'T1033',
    reference: 'https://attack.mitre.org/techniques/T1033',
    tactics: ['discovery'],
  },
  {
    name: 'System Service Discovery',
    id: 'T1007',
    reference: 'https://attack.mitre.org/techniques/T1007',
    tactics: ['discovery'],
  },
  {
    name: 'System Services',
    id: 'T1569',
    reference: 'https://attack.mitre.org/techniques/T1569',
    tactics: ['execution'],
  },
  {
    name: 'System Shutdown/Reboot',
    id: 'T1529',
    reference: 'https://attack.mitre.org/techniques/T1529',
    tactics: ['impact'],
  },
  {
    name: 'System Time Discovery',
    id: 'T1124',
    reference: 'https://attack.mitre.org/techniques/T1124',
    tactics: ['discovery'],
  },
  {
    name: 'Systemd Service',
    id: 'T1501',
    reference: 'https://attack.mitre.org/techniques/T1501',
    tactics: [],
  },
  {
    name: 'Systemd Service',
    id: 'T1543.002',
    reference: 'https://attack.mitre.org/techniques/T1543/002',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Taint Shared Content',
    id: 'T1080',
    reference: 'https://attack.mitre.org/techniques/T1080',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Template Injection',
    id: 'T1221',
    reference: 'https://attack.mitre.org/techniques/T1221',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Thread Execution Hijacking',
    id: 'T1055.003',
    reference: 'https://attack.mitre.org/techniques/T1055/003',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Thread Local Storage',
    id: 'T1055.005',
    reference: 'https://attack.mitre.org/techniques/T1055/005',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Time Based Evasion',
    id: 'T1497.003',
    reference: 'https://attack.mitre.org/techniques/T1497/003',
    tactics: ['defense-evasion', 'discovery'],
  },
  {
    name: 'Time Providers',
    id: 'T1209',
    reference: 'https://attack.mitre.org/techniques/T1209',
    tactics: [],
  },
  {
    name: 'Time Providers',
    id: 'T1547.003',
    reference: 'https://attack.mitre.org/techniques/T1547/003',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Timestomp',
    id: 'T1099',
    reference: 'https://attack.mitre.org/techniques/T1099',
    tactics: [],
  },
  {
    name: 'Timestomp',
    id: 'T1070.006',
    reference: 'https://attack.mitre.org/techniques/T1070/006',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Token Impersonation/Theft',
    id: 'T1134.001',
    reference: 'https://attack.mitre.org/techniques/T1134/001',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Traffic Signaling',
    id: 'T1205',
    reference: 'https://attack.mitre.org/techniques/T1205',
    tactics: ['defense-evasion', 'persistence', 'command-and-control'],
  },
  {
    name: 'Transfer Data to Cloud Account',
    id: 'T1537',
    reference: 'https://attack.mitre.org/techniques/T1537',
    tactics: ['exfiltration'],
  },
  {
    name: 'Transmitted Data Manipulation',
    id: 'T1493',
    reference: 'https://attack.mitre.org/techniques/T1493',
    tactics: [],
  },
  {
    name: 'Transmitted Data Manipulation',
    id: 'T1565.002',
    reference: 'https://attack.mitre.org/techniques/T1565/002',
    tactics: ['impact'],
  },
  {
    name: 'Transport Agent',
    id: 'T1505.002',
    reference: 'https://attack.mitre.org/techniques/T1505/002',
    tactics: ['persistence'],
  },
  {
    name: 'Trap',
    id: 'T1154',
    reference: 'https://attack.mitre.org/techniques/T1154',
    tactics: [],
  },
  {
    name: 'Trap',
    id: 'T1546.005',
    reference: 'https://attack.mitre.org/techniques/T1546/005',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Trusted Developer Utilities Proxy Execution',
    id: 'T1127',
    reference: 'https://attack.mitre.org/techniques/T1127',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Trusted Relationship',
    id: 'T1199',
    reference: 'https://attack.mitre.org/techniques/T1199',
    tactics: ['initial-access'],
  },
  {
    name: 'Two-Factor Authentication Interception',
    id: 'T1111',
    reference: 'https://attack.mitre.org/techniques/T1111',
    tactics: ['credential-access'],
  },
  {
    name: 'Uncommonly Used Port',
    id: 'T1065',
    reference: 'https://attack.mitre.org/techniques/T1065',
    tactics: [],
  },
  {
    name: 'Unix Shell',
    id: 'T1059.004',
    reference: 'https://attack.mitre.org/techniques/T1059/004',
    tactics: ['execution'],
  },
  {
    name: 'Unsecured Credentials',
    id: 'T1552',
    reference: 'https://attack.mitre.org/techniques/T1552',
    tactics: ['credential-access'],
  },
  {
    name: 'Unused/Unsupported Cloud Regions',
    id: 'T1535',
    reference: 'https://attack.mitre.org/techniques/T1535',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Use Alternate Authentication Material',
    id: 'T1550',
    reference: 'https://attack.mitre.org/techniques/T1550',
    tactics: ['defense-evasion', 'lateral-movement'],
  },
  {
    name: 'User Activity Based Checks',
    id: 'T1497.002',
    reference: 'https://attack.mitre.org/techniques/T1497/002',
    tactics: ['defense-evasion', 'discovery'],
  },
  {
    name: 'User Execution',
    id: 'T1204',
    reference: 'https://attack.mitre.org/techniques/T1204',
    tactics: ['execution'],
  },
  {
    name: 'VDSO Hijacking',
    id: 'T1055.014',
    reference: 'https://attack.mitre.org/techniques/T1055/014',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'VNC',
    id: 'T1021.005',
    reference: 'https://attack.mitre.org/techniques/T1021/005',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Valid Accounts',
    id: 'T1078',
    reference: 'https://attack.mitre.org/techniques/T1078',
    tactics: ['defense-evasion', 'persistence', 'privilege-escalation', 'initial-access'],
  },
  {
    name: 'Video Capture',
    id: 'T1125',
    reference: 'https://attack.mitre.org/techniques/T1125',
    tactics: ['collection'],
  },
  {
    name: 'Virtualization/Sandbox Evasion',
    id: 'T1497',
    reference: 'https://attack.mitre.org/techniques/T1497',
    tactics: ['defense-evasion', 'discovery'],
  },
  {
    name: 'Visual Basic',
    id: 'T1059.005',
    reference: 'https://attack.mitre.org/techniques/T1059/005',
    tactics: ['execution'],
  },
  {
    name: 'Web Portal Capture',
    id: 'T1056.003',
    reference: 'https://attack.mitre.org/techniques/T1056/003',
    tactics: ['collection', 'credential-access'],
  },
  {
    name: 'Web Protocols',
    id: 'T1071.001',
    reference: 'https://attack.mitre.org/techniques/T1071/001',
    tactics: ['command-and-control'],
  },
  {
    name: 'Web Service',
    id: 'T1102',
    reference: 'https://attack.mitre.org/techniques/T1102',
    tactics: ['command-and-control'],
  },
  {
    name: 'Web Session Cookie',
    id: 'T1506',
    reference: 'https://attack.mitre.org/techniques/T1506',
    tactics: [],
  },
  {
    name: 'Web Session Cookie',
    id: 'T1550.004',
    reference: 'https://attack.mitre.org/techniques/T1550/004',
    tactics: ['defense-evasion', 'lateral-movement'],
  },
  {
    name: 'Web Shell',
    id: 'T1100',
    reference: 'https://attack.mitre.org/techniques/T1100',
    tactics: [],
  },
  {
    name: 'Web Shell',
    id: 'T1505.003',
    reference: 'https://attack.mitre.org/techniques/T1505/003',
    tactics: ['persistence'],
  },
  {
    name: 'Windows Admin Shares',
    id: 'T1077',
    reference: 'https://attack.mitre.org/techniques/T1077',
    tactics: [],
  },
  {
    name: 'Windows Command Shell',
    id: 'T1059.003',
    reference: 'https://attack.mitre.org/techniques/T1059/003',
    tactics: ['execution'],
  },
  {
    name: 'Windows File and Directory Permissions Modification',
    id: 'T1222.001',
    reference: 'https://attack.mitre.org/techniques/T1222/001',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Windows Management Instrumentation',
    id: 'T1047',
    reference: 'https://attack.mitre.org/techniques/T1047',
    tactics: ['execution'],
  },
  {
    name: 'Windows Management Instrumentation Event Subscription',
    id: 'T1084',
    reference: 'https://attack.mitre.org/techniques/T1084',
    tactics: [],
  },
  {
    name: 'Windows Management Instrumentation Event Subscription',
    id: 'T1546.003',
    reference: 'https://attack.mitre.org/techniques/T1546/003',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Windows Remote Management',
    id: 'T1028',
    reference: 'https://attack.mitre.org/techniques/T1028',
    tactics: [],
  },
  {
    name: 'Windows Remote Management',
    id: 'T1021.006',
    reference: 'https://attack.mitre.org/techniques/T1021/006',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Windows Service',
    id: 'T1543.003',
    reference: 'https://attack.mitre.org/techniques/T1543/003',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Winlogon Helper DLL',
    id: 'T1004',
    reference: 'https://attack.mitre.org/techniques/T1004',
    tactics: [],
  },
  {
    name: 'Winlogon Helper DLL',
    id: 'T1547.004',
    reference: 'https://attack.mitre.org/techniques/T1547/004',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'XSL Script Processing',
    id: 'T1220',
    reference: 'https://attack.mitre.org/techniques/T1220',
    tactics: ['defense-evasion'],
  },
];

export const techniquesOptions: MitreTechniquesOptions[] = [
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bashProfileAndBashrcDescription',
      { defaultMessage: '.bash_profile and .bashrc (T1156)' }
    ),
    id: 'T1156',
    name: '.bash_profile and .bashrc',
    reference: 'https://attack.mitre.org/techniques/T1156',
    tactics: '',
    value: 'bashProfileAndBashrc',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bashProfileAndBashrcDescription',
      { defaultMessage: '.bash_profile and .bashrc (T1546.004)' }
    ),
    id: 'T1546.004',
    name: '.bash_profile and .bashrc',
    reference: 'https://attack.mitre.org/techniques/T1546/004',
    tactics: 'privilege-escalation,persistence',
    value: 'bashProfileAndBashrc',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.etcPasswdAndEtcShadowDescription',
      { defaultMessage: '/etc/passwd and /etc/shadow (T1003.008)' }
    ),
    id: 'T1003.008',
    name: '/etc/passwd and /etc/shadow',
    reference: 'https://attack.mitre.org/techniques/T1003/008',
    tactics: 'credential-access',
    value: 'etcPasswdAndEtcShadow',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.abuseElevationControlMechanismDescription',
      { defaultMessage: 'Abuse Elevation Control Mechanism (T1548)' }
    ),
    id: 'T1548',
    name: 'Abuse Elevation Control Mechanism',
    reference: 'https://attack.mitre.org/techniques/T1548',
    tactics: 'privilege-escalation,defense-evasion',
    value: 'abuseElevationControlMechanism',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.accessTokenManipulationDescription',
      { defaultMessage: 'Access Token Manipulation (T1134)' }
    ),
    id: 'T1134',
    name: 'Access Token Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1134',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'accessTokenManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.accessibilityFeaturesDescription',
      { defaultMessage: 'Accessibility Features (T1015)' }
    ),
    id: 'T1015',
    name: 'Accessibility Features',
    reference: 'https://attack.mitre.org/techniques/T1015',
    tactics: '',
    value: 'accessibilityFeatures',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.accessibilityFeaturesDescription',
      { defaultMessage: 'Accessibility Features (T1546.008)' }
    ),
    id: 'T1546.008',
    name: 'Accessibility Features',
    reference: 'https://attack.mitre.org/techniques/T1546/008',
    tactics: 'privilege-escalation,persistence',
    value: 'accessibilityFeatures',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.accountAccessRemovalDescription',
      { defaultMessage: 'Account Access Removal (T1531)' }
    ),
    id: 'T1531',
    name: 'Account Access Removal',
    reference: 'https://attack.mitre.org/techniques/T1531',
    tactics: 'impact',
    value: 'accountAccessRemoval',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.accountDiscoveryDescription',
      { defaultMessage: 'Account Discovery (T1087)' }
    ),
    id: 'T1087',
    name: 'Account Discovery',
    reference: 'https://attack.mitre.org/techniques/T1087',
    tactics: 'discovery',
    value: 'accountDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.accountManipulationDescription',
      { defaultMessage: 'Account Manipulation (T1098)' }
    ),
    id: 'T1098',
    name: 'Account Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1098',
    tactics: 'persistence',
    value: 'accountManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.addOffice365GlobalAdministratorRoleDescription',
      { defaultMessage: 'Add Office 365 Global Administrator Role (T1098.003)' }
    ),
    id: 'T1098.003',
    name: 'Add Office 365 Global Administrator Role',
    reference: 'https://attack.mitre.org/techniques/T1098/003',
    tactics: 'persistence',
    value: 'addOffice365GlobalAdministratorRole',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.addInsDescription',
      { defaultMessage: 'Add-ins (T1137.006)' }
    ),
    id: 'T1137.006',
    name: 'Add-ins',
    reference: 'https://attack.mitre.org/techniques/T1137/006',
    tactics: 'persistence',
    value: 'addIns',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.additionalAzureServicePrincipalCredentialsDescription',
      { defaultMessage: 'Additional Azure Service Principal Credentials (T1098.001)' }
    ),
    id: 'T1098.001',
    name: 'Additional Azure Service Principal Credentials',
    reference: 'https://attack.mitre.org/techniques/T1098/001',
    tactics: 'persistence',
    value: 'additionalAzureServicePrincipalCredentials',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.appCertDlLsDescription',
      { defaultMessage: 'AppCert DLLs (T1182)' }
    ),
    id: 'T1182',
    name: 'AppCert DLLs',
    reference: 'https://attack.mitre.org/techniques/T1182',
    tactics: '',
    value: 'appCertDlLs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.appCertDlLsDescription',
      { defaultMessage: 'AppCert DLLs (T1546.009)' }
    ),
    id: 'T1546.009',
    name: 'AppCert DLLs',
    reference: 'https://attack.mitre.org/techniques/T1546/009',
    tactics: 'privilege-escalation,persistence',
    value: 'appCertDlLs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.appInitDlLsDescription',
      { defaultMessage: 'AppInit DLLs (T1103)' }
    ),
    id: 'T1103',
    name: 'AppInit DLLs',
    reference: 'https://attack.mitre.org/techniques/T1103',
    tactics: '',
    value: 'appInitDlLs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.appInitDlLsDescription',
      { defaultMessage: 'AppInit DLLs (T1546.010)' }
    ),
    id: 'T1546.010',
    name: 'AppInit DLLs',
    reference: 'https://attack.mitre.org/techniques/T1546/010',
    tactics: 'privilege-escalation,persistence',
    value: 'appInitDlLs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.appleScriptDescription',
      { defaultMessage: 'AppleScript (T1155)' }
    ),
    id: 'T1155',
    name: 'AppleScript',
    reference: 'https://attack.mitre.org/techniques/T1155',
    tactics: '',
    value: 'appleScript',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.appleScriptDescription',
      { defaultMessage: 'AppleScript (T1059.002)' }
    ),
    id: 'T1059.002',
    name: 'AppleScript',
    reference: 'https://attack.mitre.org/techniques/T1059/002',
    tactics: 'execution',
    value: 'appleScript',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.applicationAccessTokenDescription',
      { defaultMessage: 'Application Access Token (T1527)' }
    ),
    id: 'T1527',
    name: 'Application Access Token',
    reference: 'https://attack.mitre.org/techniques/T1527',
    tactics: '',
    value: 'applicationAccessToken',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.applicationAccessTokenDescription',
      { defaultMessage: 'Application Access Token (T1550.001)' }
    ),
    id: 'T1550.001',
    name: 'Application Access Token',
    reference: 'https://attack.mitre.org/techniques/T1550/001',
    tactics: 'defense-evasion,lateral-movement',
    value: 'applicationAccessToken',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.applicationDeploymentSoftwareDescription',
      { defaultMessage: 'Application Deployment Software (T1017)' }
    ),
    id: 'T1017',
    name: 'Application Deployment Software',
    reference: 'https://attack.mitre.org/techniques/T1017',
    tactics: '',
    value: 'applicationDeploymentSoftware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.applicationExhaustionFloodDescription',
      { defaultMessage: 'Application Exhaustion Flood (T1499.003)' }
    ),
    id: 'T1499.003',
    name: 'Application Exhaustion Flood',
    reference: 'https://attack.mitre.org/techniques/T1499/003',
    tactics: 'impact',
    value: 'applicationExhaustionFlood',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.applicationLayerProtocolDescription',
      { defaultMessage: 'Application Layer Protocol (T1071)' }
    ),
    id: 'T1071',
    name: 'Application Layer Protocol',
    reference: 'https://attack.mitre.org/techniques/T1071',
    tactics: 'command-and-control',
    value: 'applicationLayerProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.applicationShimmingDescription',
      { defaultMessage: 'Application Shimming (T1138)' }
    ),
    id: 'T1138',
    name: 'Application Shimming',
    reference: 'https://attack.mitre.org/techniques/T1138',
    tactics: '',
    value: 'applicationShimming',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.applicationShimmingDescription',
      { defaultMessage: 'Application Shimming (T1546.011)' }
    ),
    id: 'T1546.011',
    name: 'Application Shimming',
    reference: 'https://attack.mitre.org/techniques/T1546/011',
    tactics: 'privilege-escalation,persistence',
    value: 'applicationShimming',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.applicationWindowDiscoveryDescription',
      { defaultMessage: 'Application Window Discovery (T1010)' }
    ),
    id: 'T1010',
    name: 'Application Window Discovery',
    reference: 'https://attack.mitre.org/techniques/T1010',
    tactics: 'discovery',
    value: 'applicationWindowDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.applicationOrSystemExploitationDescription',
      { defaultMessage: 'Application or System Exploitation (T1499.004)' }
    ),
    id: 'T1499.004',
    name: 'Application or System Exploitation',
    reference: 'https://attack.mitre.org/techniques/T1499/004',
    tactics: 'impact',
    value: 'applicationOrSystemExploitation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.archiveCollectedDataDescription',
      { defaultMessage: 'Archive Collected Data (T1560)' }
    ),
    id: 'T1560',
    name: 'Archive Collected Data',
    reference: 'https://attack.mitre.org/techniques/T1560',
    tactics: 'collection',
    value: 'archiveCollectedData',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.archiveViaCustomMethodDescription',
      { defaultMessage: 'Archive via Custom Method (T1560.003)' }
    ),
    id: 'T1560.003',
    name: 'Archive via Custom Method',
    reference: 'https://attack.mitre.org/techniques/T1560/003',
    tactics: 'collection',
    value: 'archiveViaCustomMethod',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.archiveViaLibraryDescription',
      { defaultMessage: 'Archive via Library (T1560.002)' }
    ),
    id: 'T1560.002',
    name: 'Archive via Library',
    reference: 'https://attack.mitre.org/techniques/T1560/002',
    tactics: 'collection',
    value: 'archiveViaLibrary',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.archiveViaUtilityDescription',
      { defaultMessage: 'Archive via Utility (T1560.001)' }
    ),
    id: 'T1560.001',
    name: 'Archive via Utility',
    reference: 'https://attack.mitre.org/techniques/T1560/001',
    tactics: 'collection',
    value: 'archiveViaUtility',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.asymmetricCryptographyDescription',
      { defaultMessage: 'Asymmetric Cryptography (T1573.002)' }
    ),
    id: 'T1573.002',
    name: 'Asymmetric Cryptography',
    reference: 'https://attack.mitre.org/techniques/T1573/002',
    tactics: 'command-and-control',
    value: 'asymmetricCryptography',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.asynchronousProcedureCallDescription',
      { defaultMessage: 'Asynchronous Procedure Call (T1055.004)' }
    ),
    id: 'T1055.004',
    name: 'Asynchronous Procedure Call',
    reference: 'https://attack.mitre.org/techniques/T1055/004',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'asynchronousProcedureCall',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.atLinuxDescription',
      { defaultMessage: 'At (Linux) (T1053.001)' }
    ),
    id: 'T1053.001',
    name: 'At (Linux)',
    reference: 'https://attack.mitre.org/techniques/T1053/001',
    tactics: 'execution,persistence,privilege-escalation',
    value: 'atLinux',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.atWindowsDescription',
      { defaultMessage: 'At (Windows) (T1053.002)' }
    ),
    id: 'T1053.002',
    name: 'At (Windows)',
    reference: 'https://attack.mitre.org/techniques/T1053/002',
    tactics: 'execution,persistence,privilege-escalation',
    value: 'atWindows',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.audioCaptureDescription',
      { defaultMessage: 'Audio Capture (T1123)' }
    ),
    id: 'T1123',
    name: 'Audio Capture',
    reference: 'https://attack.mitre.org/techniques/T1123',
    tactics: 'collection',
    value: 'audioCapture',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.authenticationPackageDescription',
      { defaultMessage: 'Authentication Package (T1131)' }
    ),
    id: 'T1131',
    name: 'Authentication Package',
    reference: 'https://attack.mitre.org/techniques/T1131',
    tactics: '',
    value: 'authenticationPackage',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.authenticationPackageDescription',
      { defaultMessage: 'Authentication Package (T1547.002)' }
    ),
    id: 'T1547.002',
    name: 'Authentication Package',
    reference: 'https://attack.mitre.org/techniques/T1547/002',
    tactics: 'persistence,privilege-escalation',
    value: 'authenticationPackage',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.automatedCollectionDescription',
      { defaultMessage: 'Automated Collection (T1119)' }
    ),
    id: 'T1119',
    name: 'Automated Collection',
    reference: 'https://attack.mitre.org/techniques/T1119',
    tactics: 'collection',
    value: 'automatedCollection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.automatedExfiltrationDescription',
      { defaultMessage: 'Automated Exfiltration (T1020)' }
    ),
    id: 'T1020',
    name: 'Automated Exfiltration',
    reference: 'https://attack.mitre.org/techniques/T1020',
    tactics: 'exfiltration',
    value: 'automatedExfiltration',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bitsJobsDescription',
      { defaultMessage: 'BITS Jobs (T1197)' }
    ),
    id: 'T1197',
    name: 'BITS Jobs',
    reference: 'https://attack.mitre.org/techniques/T1197',
    tactics: 'defense-evasion,persistence',
    value: 'bitsJobs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bashHistoryDescription',
      { defaultMessage: 'Bash History (T1139)' }
    ),
    id: 'T1139',
    name: 'Bash History',
    reference: 'https://attack.mitre.org/techniques/T1139',
    tactics: '',
    value: 'bashHistory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bashHistoryDescription',
      { defaultMessage: 'Bash History (T1552.003)' }
    ),
    id: 'T1552.003',
    name: 'Bash History',
    reference: 'https://attack.mitre.org/techniques/T1552/003',
    tactics: 'credential-access',
    value: 'bashHistory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bidirectionalCommunicationDescription',
      { defaultMessage: 'Bidirectional Communication (T1102.002)' }
    ),
    id: 'T1102.002',
    name: 'Bidirectional Communication',
    reference: 'https://attack.mitre.org/techniques/T1102/002',
    tactics: 'command-and-control',
    value: 'bidirectionalCommunication',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.binaryPaddingDescription',
      { defaultMessage: 'Binary Padding (T1009)' }
    ),
    id: 'T1009',
    name: 'Binary Padding',
    reference: 'https://attack.mitre.org/techniques/T1009',
    tactics: '',
    value: 'binaryPadding',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.binaryPaddingDescription',
      { defaultMessage: 'Binary Padding (T1027.001)' }
    ),
    id: 'T1027.001',
    name: 'Binary Padding',
    reference: 'https://attack.mitre.org/techniques/T1027/001',
    tactics: 'defense-evasion',
    value: 'binaryPadding',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bootOrLogonAutostartExecutionDescription',
      { defaultMessage: 'Boot or Logon Autostart Execution (T1547)' }
    ),
    id: 'T1547',
    name: 'Boot or Logon Autostart Execution',
    reference: 'https://attack.mitre.org/techniques/T1547',
    tactics: 'persistence,privilege-escalation',
    value: 'bootOrLogonAutostartExecution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bootOrLogonInitializationScriptsDescription',
      { defaultMessage: 'Boot or Logon Initialization Scripts (T1037)' }
    ),
    id: 'T1037',
    name: 'Boot or Logon Initialization Scripts',
    reference: 'https://attack.mitre.org/techniques/T1037',
    tactics: 'persistence,privilege-escalation',
    value: 'bootOrLogonInitializationScripts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bootkitDescription',
      { defaultMessage: 'Bootkit (T1067)' }
    ),
    id: 'T1067',
    name: 'Bootkit',
    reference: 'https://attack.mitre.org/techniques/T1067',
    tactics: '',
    value: 'bootkit',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bootkitDescription',
      { defaultMessage: 'Bootkit (T1542.003)' }
    ),
    id: 'T1542.003',
    name: 'Bootkit',
    reference: 'https://attack.mitre.org/techniques/T1542/003',
    tactics: 'persistence,defense-evasion',
    value: 'bootkit',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.browserBookmarkDiscoveryDescription',
      { defaultMessage: 'Browser Bookmark Discovery (T1217)' }
    ),
    id: 'T1217',
    name: 'Browser Bookmark Discovery',
    reference: 'https://attack.mitre.org/techniques/T1217',
    tactics: 'discovery',
    value: 'browserBookmarkDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.browserExtensionsDescription',
      { defaultMessage: 'Browser Extensions (T1176)' }
    ),
    id: 'T1176',
    name: 'Browser Extensions',
    reference: 'https://attack.mitre.org/techniques/T1176',
    tactics: 'persistence',
    value: 'browserExtensions',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bruteForceDescription',
      { defaultMessage: 'Brute Force (T1110)' }
    ),
    id: 'T1110',
    name: 'Brute Force',
    reference: 'https://attack.mitre.org/techniques/T1110',
    tactics: 'credential-access',
    value: 'bruteForce',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bypassUserAccessControlDescription',
      { defaultMessage: 'Bypass User Access Control (T1548.002)' }
    ),
    id: 'T1548.002',
    name: 'Bypass User Access Control',
    reference: 'https://attack.mitre.org/techniques/T1548/002',
    tactics: 'privilege-escalation,defense-evasion',
    value: 'bypassUserAccessControl',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bypassUserAccountControlDescription',
      { defaultMessage: 'Bypass User Account Control (T1088)' }
    ),
    id: 'T1088',
    name: 'Bypass User Account Control',
    reference: 'https://attack.mitre.org/techniques/T1088',
    tactics: '',
    value: 'bypassUserAccountControl',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cmstpDescription',
      { defaultMessage: 'CMSTP (T1191)' }
    ),
    id: 'T1191',
    name: 'CMSTP',
    reference: 'https://attack.mitre.org/techniques/T1191',
    tactics: '',
    value: 'cmstp',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cmstpDescription',
      { defaultMessage: 'CMSTP (T1218.003)' }
    ),
    id: 'T1218.003',
    name: 'CMSTP',
    reference: 'https://attack.mitre.org/techniques/T1218/003',
    tactics: 'defense-evasion',
    value: 'cmstp',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.corProfilerDescription',
      { defaultMessage: 'COR_PROFILER (T1574.012)' }
    ),
    id: 'T1574.012',
    name: 'COR_PROFILER',
    reference: 'https://attack.mitre.org/techniques/T1574/012',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    value: 'corProfiler',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cachedDomainCredentialsDescription',
      { defaultMessage: 'Cached Domain Credentials (T1003.005)' }
    ),
    id: 'T1003.005',
    name: 'Cached Domain Credentials',
    reference: 'https://attack.mitre.org/techniques/T1003/005',
    tactics: 'credential-access',
    value: 'cachedDomainCredentials',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.changeDefaultFileAssociationDescription',
      { defaultMessage: 'Change Default File Association (T1042)' }
    ),
    id: 'T1042',
    name: 'Change Default File Association',
    reference: 'https://attack.mitre.org/techniques/T1042',
    tactics: '',
    value: 'changeDefaultFileAssociation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.changeDefaultFileAssociationDescription',
      { defaultMessage: 'Change Default File Association (T1546.001)' }
    ),
    id: 'T1546.001',
    name: 'Change Default File Association',
    reference: 'https://attack.mitre.org/techniques/T1546/001',
    tactics: 'privilege-escalation,persistence',
    value: 'changeDefaultFileAssociation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.clearCommandHistoryDescription',
      { defaultMessage: 'Clear Command History (T1146)' }
    ),
    id: 'T1146',
    name: 'Clear Command History',
    reference: 'https://attack.mitre.org/techniques/T1146',
    tactics: '',
    value: 'clearCommandHistory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.clearCommandHistoryDescription',
      { defaultMessage: 'Clear Command History (T1070.003)' }
    ),
    id: 'T1070.003',
    name: 'Clear Command History',
    reference: 'https://attack.mitre.org/techniques/T1070/003',
    tactics: 'defense-evasion',
    value: 'clearCommandHistory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.clearLinuxOrMacSystemLogsDescription',
      { defaultMessage: 'Clear Linux or Mac System Logs (T1070.002)' }
    ),
    id: 'T1070.002',
    name: 'Clear Linux or Mac System Logs',
    reference: 'https://attack.mitre.org/techniques/T1070/002',
    tactics: 'defense-evasion',
    value: 'clearLinuxOrMacSystemLogs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.clearWindowsEventLogsDescription',
      { defaultMessage: 'Clear Windows Event Logs (T1070.001)' }
    ),
    id: 'T1070.001',
    name: 'Clear Windows Event Logs',
    reference: 'https://attack.mitre.org/techniques/T1070/001',
    tactics: 'defense-evasion',
    value: 'clearWindowsEventLogs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.clipboardDataDescription',
      { defaultMessage: 'Clipboard Data (T1115)' }
    ),
    id: 'T1115',
    name: 'Clipboard Data',
    reference: 'https://attack.mitre.org/techniques/T1115',
    tactics: 'collection',
    value: 'clipboardData',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cloudAccountDescription',
      { defaultMessage: 'Cloud Account (T1136.003)' }
    ),
    id: 'T1136.003',
    name: 'Cloud Account',
    reference: 'https://attack.mitre.org/techniques/T1136/003',
    tactics: 'persistence',
    value: 'cloudAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cloudAccountDescription',
      { defaultMessage: 'Cloud Account (T1087.004)' }
    ),
    id: 'T1087.004',
    name: 'Cloud Account',
    reference: 'https://attack.mitre.org/techniques/T1087/004',
    tactics: 'discovery',
    value: 'cloudAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cloudAccountsDescription',
      { defaultMessage: 'Cloud Accounts (T1078.004)' }
    ),
    id: 'T1078.004',
    name: 'Cloud Accounts',
    reference: 'https://attack.mitre.org/techniques/T1078/004',
    tactics: 'defense-evasion,persistence,privilege-escalation,initial-access',
    value: 'cloudAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cloudGroupsDescription',
      { defaultMessage: 'Cloud Groups (T1069.003)' }
    ),
    id: 'T1069.003',
    name: 'Cloud Groups',
    reference: 'https://attack.mitre.org/techniques/T1069/003',
    tactics: 'discovery',
    value: 'cloudGroups',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cloudInstanceMetadataApiDescription',
      { defaultMessage: 'Cloud Instance Metadata API (T1522)' }
    ),
    id: 'T1522',
    name: 'Cloud Instance Metadata API',
    reference: 'https://attack.mitre.org/techniques/T1522',
    tactics: '',
    value: 'cloudInstanceMetadataApi',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cloudInstanceMetadataApiDescription',
      { defaultMessage: 'Cloud Instance Metadata API (T1552.005)' }
    ),
    id: 'T1552.005',
    name: 'Cloud Instance Metadata API',
    reference: 'https://attack.mitre.org/techniques/T1552/005',
    tactics: 'credential-access',
    value: 'cloudInstanceMetadataApi',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cloudServiceDashboardDescription',
      { defaultMessage: 'Cloud Service Dashboard (T1538)' }
    ),
    id: 'T1538',
    name: 'Cloud Service Dashboard',
    reference: 'https://attack.mitre.org/techniques/T1538',
    tactics: 'discovery',
    value: 'cloudServiceDashboard',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cloudServiceDiscoveryDescription',
      { defaultMessage: 'Cloud Service Discovery (T1526)' }
    ),
    id: 'T1526',
    name: 'Cloud Service Discovery',
    reference: 'https://attack.mitre.org/techniques/T1526',
    tactics: 'discovery',
    value: 'cloudServiceDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.codeSigningDescription',
      { defaultMessage: 'Code Signing (T1116)' }
    ),
    id: 'T1116',
    name: 'Code Signing',
    reference: 'https://attack.mitre.org/techniques/T1116',
    tactics: '',
    value: 'codeSigning',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.codeSigningDescription',
      { defaultMessage: 'Code Signing (T1553.002)' }
    ),
    id: 'T1553.002',
    name: 'Code Signing',
    reference: 'https://attack.mitre.org/techniques/T1553/002',
    tactics: 'defense-evasion',
    value: 'codeSigning',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.commandAndScriptingInterpreterDescription',
      { defaultMessage: 'Command and Scripting Interpreter (T1059)' }
    ),
    id: 'T1059',
    name: 'Command and Scripting Interpreter',
    reference: 'https://attack.mitre.org/techniques/T1059',
    tactics: 'execution',
    value: 'commandAndScriptingInterpreter',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.commonlyUsedPortDescription',
      { defaultMessage: 'Commonly Used Port (T1043)' }
    ),
    id: 'T1043',
    name: 'Commonly Used Port',
    reference: 'https://attack.mitre.org/techniques/T1043',
    tactics: 'command-and-control',
    value: 'commonlyUsedPort',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.communicationThroughRemovableMediaDescription',
      { defaultMessage: 'Communication Through Removable Media (T1092)' }
    ),
    id: 'T1092',
    name: 'Communication Through Removable Media',
    reference: 'https://attack.mitre.org/techniques/T1092',
    tactics: 'command-and-control',
    value: 'communicationThroughRemovableMedia',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.compileAfterDeliveryDescription',
      { defaultMessage: 'Compile After Delivery (T1500)' }
    ),
    id: 'T1500',
    name: 'Compile After Delivery',
    reference: 'https://attack.mitre.org/techniques/T1500',
    tactics: '',
    value: 'compileAfterDelivery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.compileAfterDeliveryDescription',
      { defaultMessage: 'Compile After Delivery (T1027.004)' }
    ),
    id: 'T1027.004',
    name: 'Compile After Delivery',
    reference: 'https://attack.mitre.org/techniques/T1027/004',
    tactics: 'defense-evasion',
    value: 'compileAfterDelivery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.compiledHtmlFileDescription',
      { defaultMessage: 'Compiled HTML File (T1223)' }
    ),
    id: 'T1223',
    name: 'Compiled HTML File',
    reference: 'https://attack.mitre.org/techniques/T1223',
    tactics: '',
    value: 'compiledHtmlFile',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.compiledHtmlFileDescription',
      { defaultMessage: 'Compiled HTML File (T1218.001)' }
    ),
    id: 'T1218.001',
    name: 'Compiled HTML File',
    reference: 'https://attack.mitre.org/techniques/T1218/001',
    tactics: 'defense-evasion',
    value: 'compiledHtmlFile',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.componentFirmwareDescription',
      { defaultMessage: 'Component Firmware (T1109)' }
    ),
    id: 'T1109',
    name: 'Component Firmware',
    reference: 'https://attack.mitre.org/techniques/T1109',
    tactics: '',
    value: 'componentFirmware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.componentFirmwareDescription',
      { defaultMessage: 'Component Firmware (T1542.002)' }
    ),
    id: 'T1542.002',
    name: 'Component Firmware',
    reference: 'https://attack.mitre.org/techniques/T1542/002',
    tactics: 'persistence,defense-evasion',
    value: 'componentFirmware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.componentObjectModelDescription',
      { defaultMessage: 'Component Object Model (T1559.001)' }
    ),
    id: 'T1559.001',
    name: 'Component Object Model',
    reference: 'https://attack.mitre.org/techniques/T1559/001',
    tactics: 'execution',
    value: 'componentObjectModel',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.componentObjectModelHijackingDescription',
      { defaultMessage: 'Component Object Model Hijacking (T1122)' }
    ),
    id: 'T1122',
    name: 'Component Object Model Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1122',
    tactics: '',
    value: 'componentObjectModelHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.componentObjectModelHijackingDescription',
      { defaultMessage: 'Component Object Model Hijacking (T1546.015)' }
    ),
    id: 'T1546.015',
    name: 'Component Object Model Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1546/015',
    tactics: 'privilege-escalation,persistence',
    value: 'componentObjectModelHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.componentObjectModelAndDistributedComDescription',
      { defaultMessage: 'Component Object Model and Distributed COM (T1175)' }
    ),
    id: 'T1175',
    name: 'Component Object Model and Distributed COM',
    reference: 'https://attack.mitre.org/techniques/T1175',
    tactics: 'lateral-movement,execution',
    value: 'componentObjectModelAndDistributedCom',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.compromiseClientSoftwareBinaryDescription',
      { defaultMessage: 'Compromise Client Software Binary (T1554)' }
    ),
    id: 'T1554',
    name: 'Compromise Client Software Binary',
    reference: 'https://attack.mitre.org/techniques/T1554',
    tactics: 'persistence',
    value: 'compromiseClientSoftwareBinary',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.compromiseHardwareSupplyChainDescription',
      { defaultMessage: 'Compromise Hardware Supply Chain (T1195.003)' }
    ),
    id: 'T1195.003',
    name: 'Compromise Hardware Supply Chain',
    reference: 'https://attack.mitre.org/techniques/T1195/003',
    tactics: 'initial-access',
    value: 'compromiseHardwareSupplyChain',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.compromiseSoftwareDependenciesAndDevelopmentToolsDescription',
      { defaultMessage: 'Compromise Software Dependencies and Development Tools (T1195.001)' }
    ),
    id: 'T1195.001',
    name: 'Compromise Software Dependencies and Development Tools',
    reference: 'https://attack.mitre.org/techniques/T1195/001',
    tactics: 'initial-access',
    value: 'compromiseSoftwareDependenciesAndDevelopmentTools',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.compromiseSoftwareSupplyChainDescription',
      { defaultMessage: 'Compromise Software Supply Chain (T1195.002)' }
    ),
    id: 'T1195.002',
    name: 'Compromise Software Supply Chain',
    reference: 'https://attack.mitre.org/techniques/T1195/002',
    tactics: 'initial-access',
    value: 'compromiseSoftwareSupplyChain',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.confluenceDescription',
      { defaultMessage: 'Confluence (T1213.001)' }
    ),
    id: 'T1213.001',
    name: 'Confluence',
    reference: 'https://attack.mitre.org/techniques/T1213/001',
    tactics: 'collection',
    value: 'confluence',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.controlPanelDescription',
      { defaultMessage: 'Control Panel (T1218.002)' }
    ),
    id: 'T1218.002',
    name: 'Control Panel',
    reference: 'https://attack.mitre.org/techniques/T1218/002',
    tactics: 'defense-evasion',
    value: 'controlPanel',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.controlPanelItemsDescription',
      { defaultMessage: 'Control Panel Items (T1196)' }
    ),
    id: 'T1196',
    name: 'Control Panel Items',
    reference: 'https://attack.mitre.org/techniques/T1196',
    tactics: '',
    value: 'controlPanelItems',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.createAccountDescription',
      { defaultMessage: 'Create Account (T1136)' }
    ),
    id: 'T1136',
    name: 'Create Account',
    reference: 'https://attack.mitre.org/techniques/T1136',
    tactics: 'persistence',
    value: 'createAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.createCloudInstanceDescription',
      { defaultMessage: 'Create Cloud Instance (T1578.002)' }
    ),
    id: 'T1578.002',
    name: 'Create Cloud Instance',
    reference: 'https://attack.mitre.org/techniques/T1578/002',
    tactics: 'defense-evasion',
    value: 'createCloudInstance',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.createProcessWithTokenDescription',
      { defaultMessage: 'Create Process with Token (T1134.002)' }
    ),
    id: 'T1134.002',
    name: 'Create Process with Token',
    reference: 'https://attack.mitre.org/techniques/T1134/002',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'createProcessWithToken',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.createSnapshotDescription',
      { defaultMessage: 'Create Snapshot (T1578.001)' }
    ),
    id: 'T1578.001',
    name: 'Create Snapshot',
    reference: 'https://attack.mitre.org/techniques/T1578/001',
    tactics: 'defense-evasion',
    value: 'createSnapshot',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.createOrModifySystemProcessDescription',
      { defaultMessage: 'Create or Modify System Process (T1543)' }
    ),
    id: 'T1543',
    name: 'Create or Modify System Process',
    reference: 'https://attack.mitre.org/techniques/T1543',
    tactics: 'persistence,privilege-escalation',
    value: 'createOrModifySystemProcess',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.credentialApiHookingDescription',
      { defaultMessage: 'Credential API Hooking (T1056.004)' }
    ),
    id: 'T1056.004',
    name: 'Credential API Hooking',
    reference: 'https://attack.mitre.org/techniques/T1056/004',
    tactics: 'collection,credential-access',
    value: 'credentialApiHooking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.credentialStuffingDescription',
      { defaultMessage: 'Credential Stuffing (T1110.004)' }
    ),
    id: 'T1110.004',
    name: 'Credential Stuffing',
    reference: 'https://attack.mitre.org/techniques/T1110/004',
    tactics: 'credential-access',
    value: 'credentialStuffing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.credentialsInFilesDescription',
      { defaultMessage: 'Credentials In Files (T1552.001)' }
    ),
    id: 'T1552.001',
    name: 'Credentials In Files',
    reference: 'https://attack.mitre.org/techniques/T1552/001',
    tactics: 'credential-access',
    value: 'credentialsInFiles',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.credentialsFromPasswordStoresDescription',
      { defaultMessage: 'Credentials from Password Stores (T1555)' }
    ),
    id: 'T1555',
    name: 'Credentials from Password Stores',
    reference: 'https://attack.mitre.org/techniques/T1555',
    tactics: 'credential-access',
    value: 'credentialsFromPasswordStores',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.credentialsFromWebBrowsersDescription',
      { defaultMessage: 'Credentials from Web Browsers (T1503)' }
    ),
    id: 'T1503',
    name: 'Credentials from Web Browsers',
    reference: 'https://attack.mitre.org/techniques/T1503',
    tactics: '',
    value: 'credentialsFromWebBrowsers',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.credentialsFromWebBrowsersDescription',
      { defaultMessage: 'Credentials from Web Browsers (T1555.003)' }
    ),
    id: 'T1555.003',
    name: 'Credentials from Web Browsers',
    reference: 'https://attack.mitre.org/techniques/T1555/003',
    tactics: 'credential-access',
    value: 'credentialsFromWebBrowsers',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.credentialsInFilesDescription',
      { defaultMessage: 'Credentials in Files (T1081)' }
    ),
    id: 'T1081',
    name: 'Credentials in Files',
    reference: 'https://attack.mitre.org/techniques/T1081',
    tactics: '',
    value: 'credentialsInFiles',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.credentialsInRegistryDescription',
      { defaultMessage: 'Credentials in Registry (T1214)' }
    ),
    id: 'T1214',
    name: 'Credentials in Registry',
    reference: 'https://attack.mitre.org/techniques/T1214',
    tactics: '',
    value: 'credentialsInRegistry',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.credentialsInRegistryDescription',
      { defaultMessage: 'Credentials in Registry (T1552.002)' }
    ),
    id: 'T1552.002',
    name: 'Credentials in Registry',
    reference: 'https://attack.mitre.org/techniques/T1552/002',
    tactics: 'credential-access',
    value: 'credentialsInRegistry',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cronDescription',
      { defaultMessage: 'Cron (T1053.003)' }
    ),
    id: 'T1053.003',
    name: 'Cron',
    reference: 'https://attack.mitre.org/techniques/T1053/003',
    tactics: 'execution,persistence,privilege-escalation',
    value: 'cron',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.customCommandAndControlProtocolDescription',
      { defaultMessage: 'Custom Command and Control Protocol (T1094)' }
    ),
    id: 'T1094',
    name: 'Custom Command and Control Protocol',
    reference: 'https://attack.mitre.org/techniques/T1094',
    tactics: '',
    value: 'customCommandAndControlProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.customCryptographicProtocolDescription',
      { defaultMessage: 'Custom Cryptographic Protocol (T1024)' }
    ),
    id: 'T1024',
    name: 'Custom Cryptographic Protocol',
    reference: 'https://attack.mitre.org/techniques/T1024',
    tactics: '',
    value: 'customCryptographicProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dcSyncDescription',
      { defaultMessage: 'DCSync (T1003.006)' }
    ),
    id: 'T1003.006',
    name: 'DCSync',
    reference: 'https://attack.mitre.org/techniques/T1003/006',
    tactics: 'credential-access',
    value: 'dcSync',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dllSearchOrderHijackingDescription',
      { defaultMessage: 'DLL Search Order Hijacking (T1038)' }
    ),
    id: 'T1038',
    name: 'DLL Search Order Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1038',
    tactics: '',
    value: 'dllSearchOrderHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dllSearchOrderHijackingDescription',
      { defaultMessage: 'DLL Search Order Hijacking (T1574.001)' }
    ),
    id: 'T1574.001',
    name: 'DLL Search Order Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1574/001',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    value: 'dllSearchOrderHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dllSideLoadingDescription',
      { defaultMessage: 'DLL Side-Loading (T1073)' }
    ),
    id: 'T1073',
    name: 'DLL Side-Loading',
    reference: 'https://attack.mitre.org/techniques/T1073',
    tactics: '',
    value: 'dllSideLoading',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dllSideLoadingDescription',
      { defaultMessage: 'DLL Side-Loading (T1574.002)' }
    ),
    id: 'T1574.002',
    name: 'DLL Side-Loading',
    reference: 'https://attack.mitre.org/techniques/T1574/002',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    value: 'dllSideLoading',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dnsDescription',
      { defaultMessage: 'DNS (T1071.004)' }
    ),
    id: 'T1071.004',
    name: 'DNS',
    reference: 'https://attack.mitre.org/techniques/T1071/004',
    tactics: 'command-and-control',
    value: 'dns',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dnsCalculationDescription',
      { defaultMessage: 'DNS Calculation (T1568.003)' }
    ),
    id: 'T1568.003',
    name: 'DNS Calculation',
    reference: 'https://attack.mitre.org/techniques/T1568/003',
    tactics: 'command-and-control',
    value: 'dnsCalculation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataCompressedDescription',
      { defaultMessage: 'Data Compressed (T1002)' }
    ),
    id: 'T1002',
    name: 'Data Compressed',
    reference: 'https://attack.mitre.org/techniques/T1002',
    tactics: '',
    value: 'dataCompressed',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataDestructionDescription',
      { defaultMessage: 'Data Destruction (T1485)' }
    ),
    id: 'T1485',
    name: 'Data Destruction',
    reference: 'https://attack.mitre.org/techniques/T1485',
    tactics: 'impact',
    value: 'dataDestruction',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataEncodingDescription',
      { defaultMessage: 'Data Encoding (T1132)' }
    ),
    id: 'T1132',
    name: 'Data Encoding',
    reference: 'https://attack.mitre.org/techniques/T1132',
    tactics: 'command-and-control',
    value: 'dataEncoding',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataEncryptedDescription',
      { defaultMessage: 'Data Encrypted (T1022)' }
    ),
    id: 'T1022',
    name: 'Data Encrypted',
    reference: 'https://attack.mitre.org/techniques/T1022',
    tactics: '',
    value: 'dataEncrypted',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataEncryptedForImpactDescription',
      { defaultMessage: 'Data Encrypted for Impact (T1486)' }
    ),
    id: 'T1486',
    name: 'Data Encrypted for Impact',
    reference: 'https://attack.mitre.org/techniques/T1486',
    tactics: 'impact',
    value: 'dataEncryptedForImpact',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataManipulationDescription',
      { defaultMessage: 'Data Manipulation (T1565)' }
    ),
    id: 'T1565',
    name: 'Data Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1565',
    tactics: 'impact',
    value: 'dataManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataObfuscationDescription',
      { defaultMessage: 'Data Obfuscation (T1001)' }
    ),
    id: 'T1001',
    name: 'Data Obfuscation',
    reference: 'https://attack.mitre.org/techniques/T1001',
    tactics: 'command-and-control',
    value: 'dataObfuscation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataStagedDescription',
      { defaultMessage: 'Data Staged (T1074)' }
    ),
    id: 'T1074',
    name: 'Data Staged',
    reference: 'https://attack.mitre.org/techniques/T1074',
    tactics: 'collection',
    value: 'dataStaged',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataTransferSizeLimitsDescription',
      { defaultMessage: 'Data Transfer Size Limits (T1030)' }
    ),
    id: 'T1030',
    name: 'Data Transfer Size Limits',
    reference: 'https://attack.mitre.org/techniques/T1030',
    tactics: 'exfiltration',
    value: 'dataTransferSizeLimits',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataFromCloudStorageObjectDescription',
      { defaultMessage: 'Data from Cloud Storage Object (T1530)' }
    ),
    id: 'T1530',
    name: 'Data from Cloud Storage Object',
    reference: 'https://attack.mitre.org/techniques/T1530',
    tactics: 'collection',
    value: 'dataFromCloudStorageObject',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataFromInformationRepositoriesDescription',
      { defaultMessage: 'Data from Information Repositories (T1213)' }
    ),
    id: 'T1213',
    name: 'Data from Information Repositories',
    reference: 'https://attack.mitre.org/techniques/T1213',
    tactics: 'collection',
    value: 'dataFromInformationRepositories',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataFromLocalSystemDescription',
      { defaultMessage: 'Data from Local System (T1005)' }
    ),
    id: 'T1005',
    name: 'Data from Local System',
    reference: 'https://attack.mitre.org/techniques/T1005',
    tactics: 'collection',
    value: 'dataFromLocalSystem',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataFromNetworkSharedDriveDescription',
      { defaultMessage: 'Data from Network Shared Drive (T1039)' }
    ),
    id: 'T1039',
    name: 'Data from Network Shared Drive',
    reference: 'https://attack.mitre.org/techniques/T1039',
    tactics: 'collection',
    value: 'dataFromNetworkSharedDrive',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataFromRemovableMediaDescription',
      { defaultMessage: 'Data from Removable Media (T1025)' }
    ),
    id: 'T1025',
    name: 'Data from Removable Media',
    reference: 'https://attack.mitre.org/techniques/T1025',
    tactics: 'collection',
    value: 'dataFromRemovableMedia',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.deadDropResolverDescription',
      { defaultMessage: 'Dead Drop Resolver (T1102.001)' }
    ),
    id: 'T1102.001',
    name: 'Dead Drop Resolver',
    reference: 'https://attack.mitre.org/techniques/T1102/001',
    tactics: 'command-and-control',
    value: 'deadDropResolver',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.defacementDescription',
      { defaultMessage: 'Defacement (T1491)' }
    ),
    id: 'T1491',
    name: 'Defacement',
    reference: 'https://attack.mitre.org/techniques/T1491',
    tactics: 'impact',
    value: 'defacement',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.defaultAccountsDescription',
      { defaultMessage: 'Default Accounts (T1078.001)' }
    ),
    id: 'T1078.001',
    name: 'Default Accounts',
    reference: 'https://attack.mitre.org/techniques/T1078/001',
    tactics: 'defense-evasion,persistence,privilege-escalation,initial-access',
    value: 'defaultAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.deleteCloudInstanceDescription',
      { defaultMessage: 'Delete Cloud Instance (T1578.003)' }
    ),
    id: 'T1578.003',
    name: 'Delete Cloud Instance',
    reference: 'https://attack.mitre.org/techniques/T1578/003',
    tactics: 'defense-evasion',
    value: 'deleteCloudInstance',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.deobfuscateDecodeFilesOrInformationDescription',
      { defaultMessage: 'Deobfuscate/Decode Files or Information (T1140)' }
    ),
    id: 'T1140',
    name: 'Deobfuscate/Decode Files or Information',
    reference: 'https://attack.mitre.org/techniques/T1140',
    tactics: 'defense-evasion',
    value: 'deobfuscateDecodeFilesOrInformation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.directNetworkFloodDescription',
      { defaultMessage: 'Direct Network Flood (T1498.001)' }
    ),
    id: 'T1498.001',
    name: 'Direct Network Flood',
    reference: 'https://attack.mitre.org/techniques/T1498/001',
    tactics: 'impact',
    value: 'directNetworkFlood',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.directVolumeAccessDescription',
      { defaultMessage: 'Direct Volume Access (T1006)' }
    ),
    id: 'T1006',
    name: 'Direct Volume Access',
    reference: 'https://attack.mitre.org/techniques/T1006',
    tactics: 'defense-evasion',
    value: 'directVolumeAccess',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.disableWindowsEventLoggingDescription',
      { defaultMessage: 'Disable Windows Event Logging (T1562.002)' }
    ),
    id: 'T1562.002',
    name: 'Disable Windows Event Logging',
    reference: 'https://attack.mitre.org/techniques/T1562/002',
    tactics: 'defense-evasion',
    value: 'disableWindowsEventLogging',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.disableOrModifyCloudFirewallDescription',
      { defaultMessage: 'Disable or Modify Cloud Firewall (T1562.007)' }
    ),
    id: 'T1562.007',
    name: 'Disable or Modify Cloud Firewall',
    reference: 'https://attack.mitre.org/techniques/T1562/007',
    tactics: 'defense-evasion',
    value: 'disableOrModifyCloudFirewall',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.disableOrModifySystemFirewallDescription',
      { defaultMessage: 'Disable or Modify System Firewall (T1562.004)' }
    ),
    id: 'T1562.004',
    name: 'Disable or Modify System Firewall',
    reference: 'https://attack.mitre.org/techniques/T1562/004',
    tactics: 'defense-evasion',
    value: 'disableOrModifySystemFirewall',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.disableOrModifyToolsDescription',
      { defaultMessage: 'Disable or Modify Tools (T1562.001)' }
    ),
    id: 'T1562.001',
    name: 'Disable or Modify Tools',
    reference: 'https://attack.mitre.org/techniques/T1562/001',
    tactics: 'defense-evasion',
    value: 'disableOrModifyTools',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.disablingSecurityToolsDescription',
      { defaultMessage: 'Disabling Security Tools (T1089)' }
    ),
    id: 'T1089',
    name: 'Disabling Security Tools',
    reference: 'https://attack.mitre.org/techniques/T1089',
    tactics: '',
    value: 'disablingSecurityTools',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.diskContentWipeDescription',
      { defaultMessage: 'Disk Content Wipe (T1488)' }
    ),
    id: 'T1488',
    name: 'Disk Content Wipe',
    reference: 'https://attack.mitre.org/techniques/T1488',
    tactics: '',
    value: 'diskContentWipe',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.diskContentWipeDescription',
      { defaultMessage: 'Disk Content Wipe (T1561.001)' }
    ),
    id: 'T1561.001',
    name: 'Disk Content Wipe',
    reference: 'https://attack.mitre.org/techniques/T1561/001',
    tactics: 'impact',
    value: 'diskContentWipe',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.diskStructureWipeDescription',
      { defaultMessage: 'Disk Structure Wipe (T1487)' }
    ),
    id: 'T1487',
    name: 'Disk Structure Wipe',
    reference: 'https://attack.mitre.org/techniques/T1487',
    tactics: '',
    value: 'diskStructureWipe',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.diskStructureWipeDescription',
      { defaultMessage: 'Disk Structure Wipe (T1561.002)' }
    ),
    id: 'T1561.002',
    name: 'Disk Structure Wipe',
    reference: 'https://attack.mitre.org/techniques/T1561/002',
    tactics: 'impact',
    value: 'diskStructureWipe',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.diskWipeDescription',
      { defaultMessage: 'Disk Wipe (T1561)' }
    ),
    id: 'T1561',
    name: 'Disk Wipe',
    reference: 'https://attack.mitre.org/techniques/T1561',
    tactics: 'impact',
    value: 'diskWipe',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.distributedComponentObjectModelDescription',
      { defaultMessage: 'Distributed Component Object Model (T1021.003)' }
    ),
    id: 'T1021.003',
    name: 'Distributed Component Object Model',
    reference: 'https://attack.mitre.org/techniques/T1021/003',
    tactics: 'lateral-movement',
    value: 'distributedComponentObjectModel',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.domainAccountDescription',
      { defaultMessage: 'Domain Account (T1136.002)' }
    ),
    id: 'T1136.002',
    name: 'Domain Account',
    reference: 'https://attack.mitre.org/techniques/T1136/002',
    tactics: 'persistence',
    value: 'domainAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.domainAccountDescription',
      { defaultMessage: 'Domain Account (T1087.002)' }
    ),
    id: 'T1087.002',
    name: 'Domain Account',
    reference: 'https://attack.mitre.org/techniques/T1087/002',
    tactics: 'discovery',
    value: 'domainAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.domainAccountsDescription',
      { defaultMessage: 'Domain Accounts (T1078.002)' }
    ),
    id: 'T1078.002',
    name: 'Domain Accounts',
    reference: 'https://attack.mitre.org/techniques/T1078/002',
    tactics: 'defense-evasion,persistence,privilege-escalation,initial-access',
    value: 'domainAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.domainControllerAuthenticationDescription',
      { defaultMessage: 'Domain Controller Authentication (T1556.001)' }
    ),
    id: 'T1556.001',
    name: 'Domain Controller Authentication',
    reference: 'https://attack.mitre.org/techniques/T1556/001',
    tactics: 'credential-access,defense-evasion',
    value: 'domainControllerAuthentication',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.domainFrontingDescription',
      { defaultMessage: 'Domain Fronting (T1172)' }
    ),
    id: 'T1172',
    name: 'Domain Fronting',
    reference: 'https://attack.mitre.org/techniques/T1172',
    tactics: '',
    value: 'domainFronting',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.domainFrontingDescription',
      { defaultMessage: 'Domain Fronting (T1090.004)' }
    ),
    id: 'T1090.004',
    name: 'Domain Fronting',
    reference: 'https://attack.mitre.org/techniques/T1090/004',
    tactics: 'command-and-control',
    value: 'domainFronting',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.domainGenerationAlgorithmsDescription',
      { defaultMessage: 'Domain Generation Algorithms (T1483)' }
    ),
    id: 'T1483',
    name: 'Domain Generation Algorithms',
    reference: 'https://attack.mitre.org/techniques/T1483',
    tactics: '',
    value: 'domainGenerationAlgorithms',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.domainGenerationAlgorithmsDescription',
      { defaultMessage: 'Domain Generation Algorithms (T1568.002)' }
    ),
    id: 'T1568.002',
    name: 'Domain Generation Algorithms',
    reference: 'https://attack.mitre.org/techniques/T1568/002',
    tactics: 'command-and-control',
    value: 'domainGenerationAlgorithms',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.domainGroupsDescription',
      { defaultMessage: 'Domain Groups (T1069.002)' }
    ),
    id: 'T1069.002',
    name: 'Domain Groups',
    reference: 'https://attack.mitre.org/techniques/T1069/002',
    tactics: 'discovery',
    value: 'domainGroups',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.domainTrustDiscoveryDescription',
      { defaultMessage: 'Domain Trust Discovery (T1482)' }
    ),
    id: 'T1482',
    name: 'Domain Trust Discovery',
    reference: 'https://attack.mitre.org/techniques/T1482',
    tactics: 'discovery',
    value: 'domainTrustDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.driveByCompromiseDescription',
      { defaultMessage: 'Drive-by Compromise (T1189)' }
    ),
    id: 'T1189',
    name: 'Drive-by Compromise',
    reference: 'https://attack.mitre.org/techniques/T1189',
    tactics: 'initial-access',
    value: 'driveByCompromise',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dylibHijackingDescription',
      { defaultMessage: 'Dylib Hijacking (T1157)' }
    ),
    id: 'T1157',
    name: 'Dylib Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1157',
    tactics: '',
    value: 'dylibHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dylibHijackingDescription',
      { defaultMessage: 'Dylib Hijacking (T1574.004)' }
    ),
    id: 'T1574.004',
    name: 'Dylib Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1574/004',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    value: 'dylibHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dynamicDataExchangeDescription',
      { defaultMessage: 'Dynamic Data Exchange (T1173)' }
    ),
    id: 'T1173',
    name: 'Dynamic Data Exchange',
    reference: 'https://attack.mitre.org/techniques/T1173',
    tactics: '',
    value: 'dynamicDataExchange',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dynamicDataExchangeDescription',
      { defaultMessage: 'Dynamic Data Exchange (T1559.002)' }
    ),
    id: 'T1559.002',
    name: 'Dynamic Data Exchange',
    reference: 'https://attack.mitre.org/techniques/T1559/002',
    tactics: 'execution',
    value: 'dynamicDataExchange',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dynamicResolutionDescription',
      { defaultMessage: 'Dynamic Resolution (T1568)' }
    ),
    id: 'T1568',
    name: 'Dynamic Resolution',
    reference: 'https://attack.mitre.org/techniques/T1568',
    tactics: 'command-and-control',
    value: 'dynamicResolution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dynamicLinkLibraryInjectionDescription',
      { defaultMessage: 'Dynamic-link Library Injection (T1055.001)' }
    ),
    id: 'T1055.001',
    name: 'Dynamic-link Library Injection',
    reference: 'https://attack.mitre.org/techniques/T1055/001',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'dynamicLinkLibraryInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.elevatedExecutionWithPromptDescription',
      { defaultMessage: 'Elevated Execution with Prompt (T1514)' }
    ),
    id: 'T1514',
    name: 'Elevated Execution with Prompt',
    reference: 'https://attack.mitre.org/techniques/T1514',
    tactics: '',
    value: 'elevatedExecutionWithPrompt',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.elevatedExecutionWithPromptDescription',
      { defaultMessage: 'Elevated Execution with Prompt (T1548.004)' }
    ),
    id: 'T1548.004',
    name: 'Elevated Execution with Prompt',
    reference: 'https://attack.mitre.org/techniques/T1548/004',
    tactics: 'privilege-escalation,defense-evasion',
    value: 'elevatedExecutionWithPrompt',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.emailAccountDescription',
      { defaultMessage: 'Email Account (T1087.003)' }
    ),
    id: 'T1087.003',
    name: 'Email Account',
    reference: 'https://attack.mitre.org/techniques/T1087/003',
    tactics: 'discovery',
    value: 'emailAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.emailCollectionDescription',
      { defaultMessage: 'Email Collection (T1114)' }
    ),
    id: 'T1114',
    name: 'Email Collection',
    reference: 'https://attack.mitre.org/techniques/T1114',
    tactics: 'collection',
    value: 'emailCollection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.emailForwardingRuleDescription',
      { defaultMessage: 'Email Forwarding Rule (T1114.003)' }
    ),
    id: 'T1114.003',
    name: 'Email Forwarding Rule',
    reference: 'https://attack.mitre.org/techniques/T1114/003',
    tactics: 'collection',
    value: 'emailForwardingRule',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.emondDescription',
      { defaultMessage: 'Emond (T1519)' }
    ),
    id: 'T1519',
    name: 'Emond',
    reference: 'https://attack.mitre.org/techniques/T1519',
    tactics: '',
    value: 'emond',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.emondDescription',
      { defaultMessage: 'Emond (T1546.014)' }
    ),
    id: 'T1546.014',
    name: 'Emond',
    reference: 'https://attack.mitre.org/techniques/T1546/014',
    tactics: 'privilege-escalation,persistence',
    value: 'emond',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.encryptedChannelDescription',
      { defaultMessage: 'Encrypted Channel (T1573)' }
    ),
    id: 'T1573',
    name: 'Encrypted Channel',
    reference: 'https://attack.mitre.org/techniques/T1573',
    tactics: 'command-and-control',
    value: 'encryptedChannel',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.endpointDenialOfServiceDescription',
      { defaultMessage: 'Endpoint Denial of Service (T1499)' }
    ),
    id: 'T1499',
    name: 'Endpoint Denial of Service',
    reference: 'https://attack.mitre.org/techniques/T1499',
    tactics: 'impact',
    value: 'endpointDenialOfService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.environmentalKeyingDescription',
      { defaultMessage: 'Environmental Keying (T1480.001)' }
    ),
    id: 'T1480.001',
    name: 'Environmental Keying',
    reference: 'https://attack.mitre.org/techniques/T1480/001',
    tactics: 'defense-evasion',
    value: 'environmentalKeying',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.eventTriggeredExecutionDescription',
      { defaultMessage: 'Event Triggered Execution (T1546)' }
    ),
    id: 'T1546',
    name: 'Event Triggered Execution',
    reference: 'https://attack.mitre.org/techniques/T1546',
    tactics: 'privilege-escalation,persistence',
    value: 'eventTriggeredExecution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exchangeEmailDelegatePermissionsDescription',
      { defaultMessage: 'Exchange Email Delegate Permissions (T1098.002)' }
    ),
    id: 'T1098.002',
    name: 'Exchange Email Delegate Permissions',
    reference: 'https://attack.mitre.org/techniques/T1098/002',
    tactics: 'persistence',
    value: 'exchangeEmailDelegatePermissions',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.executableInstallerFilePermissionsWeaknessDescription',
      { defaultMessage: 'Executable Installer File Permissions Weakness (T1574.005)' }
    ),
    id: 'T1574.005',
    name: 'Executable Installer File Permissions Weakness',
    reference: 'https://attack.mitre.org/techniques/T1574/005',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    value: 'executableInstallerFilePermissionsWeakness',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.executionGuardrailsDescription',
      { defaultMessage: 'Execution Guardrails (T1480)' }
    ),
    id: 'T1480',
    name: 'Execution Guardrails',
    reference: 'https://attack.mitre.org/techniques/T1480',
    tactics: 'defense-evasion',
    value: 'executionGuardrails',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationOverAlternativeProtocolDescription',
      { defaultMessage: 'Exfiltration Over Alternative Protocol (T1048)' }
    ),
    id: 'T1048',
    name: 'Exfiltration Over Alternative Protocol',
    reference: 'https://attack.mitre.org/techniques/T1048',
    tactics: 'exfiltration',
    value: 'exfiltrationOverAlternativeProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationOverAsymmetricEncryptedNonC2ProtocolDescription',
      { defaultMessage: 'Exfiltration Over Asymmetric Encrypted Non-C2 Protocol (T1048.002)' }
    ),
    id: 'T1048.002',
    name: 'Exfiltration Over Asymmetric Encrypted Non-C2 Protocol',
    reference: 'https://attack.mitre.org/techniques/T1048/002',
    tactics: 'exfiltration',
    value: 'exfiltrationOverAsymmetricEncryptedNonC2Protocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationOverBluetoothDescription',
      { defaultMessage: 'Exfiltration Over Bluetooth (T1011.001)' }
    ),
    id: 'T1011.001',
    name: 'Exfiltration Over Bluetooth',
    reference: 'https://attack.mitre.org/techniques/T1011/001',
    tactics: 'exfiltration',
    value: 'exfiltrationOverBluetooth',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationOverC2ChannelDescription',
      { defaultMessage: 'Exfiltration Over C2 Channel (T1041)' }
    ),
    id: 'T1041',
    name: 'Exfiltration Over C2 Channel',
    reference: 'https://attack.mitre.org/techniques/T1041',
    tactics: 'exfiltration',
    value: 'exfiltrationOverC2Channel',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationOverOtherNetworkMediumDescription',
      { defaultMessage: 'Exfiltration Over Other Network Medium (T1011)' }
    ),
    id: 'T1011',
    name: 'Exfiltration Over Other Network Medium',
    reference: 'https://attack.mitre.org/techniques/T1011',
    tactics: 'exfiltration',
    value: 'exfiltrationOverOtherNetworkMedium',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationOverPhysicalMediumDescription',
      { defaultMessage: 'Exfiltration Over Physical Medium (T1052)' }
    ),
    id: 'T1052',
    name: 'Exfiltration Over Physical Medium',
    reference: 'https://attack.mitre.org/techniques/T1052',
    tactics: 'exfiltration',
    value: 'exfiltrationOverPhysicalMedium',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationOverSymmetricEncryptedNonC2ProtocolDescription',
      { defaultMessage: 'Exfiltration Over Symmetric Encrypted Non-C2 Protocol (T1048.001)' }
    ),
    id: 'T1048.001',
    name: 'Exfiltration Over Symmetric Encrypted Non-C2 Protocol',
    reference: 'https://attack.mitre.org/techniques/T1048/001',
    tactics: 'exfiltration',
    value: 'exfiltrationOverSymmetricEncryptedNonC2Protocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationOverUnencryptedObfuscatedNonC2ProtocolDescription',
      { defaultMessage: 'Exfiltration Over Unencrypted/Obfuscated Non-C2 Protocol (T1048.003)' }
    ),
    id: 'T1048.003',
    name: 'Exfiltration Over Unencrypted/Obfuscated Non-C2 Protocol',
    reference: 'https://attack.mitre.org/techniques/T1048/003',
    tactics: 'exfiltration',
    value: 'exfiltrationOverUnencryptedObfuscatedNonC2Protocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationOverWebServiceDescription',
      { defaultMessage: 'Exfiltration Over Web Service (T1567)' }
    ),
    id: 'T1567',
    name: 'Exfiltration Over Web Service',
    reference: 'https://attack.mitre.org/techniques/T1567',
    tactics: 'exfiltration',
    value: 'exfiltrationOverWebService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationOverUsbDescription',
      { defaultMessage: 'Exfiltration over USB (T1052.001)' }
    ),
    id: 'T1052.001',
    name: 'Exfiltration over USB',
    reference: 'https://attack.mitre.org/techniques/T1052/001',
    tactics: 'exfiltration',
    value: 'exfiltrationOverUsb',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationToCloudStorageDescription',
      { defaultMessage: 'Exfiltration to Cloud Storage (T1567.002)' }
    ),
    id: 'T1567.002',
    name: 'Exfiltration to Cloud Storage',
    reference: 'https://attack.mitre.org/techniques/T1567/002',
    tactics: 'exfiltration',
    value: 'exfiltrationToCloudStorage',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationToCodeRepositoryDescription',
      { defaultMessage: 'Exfiltration to Code Repository (T1567.001)' }
    ),
    id: 'T1567.001',
    name: 'Exfiltration to Code Repository',
    reference: 'https://attack.mitre.org/techniques/T1567/001',
    tactics: 'exfiltration',
    value: 'exfiltrationToCodeRepository',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exploitPublicFacingApplicationDescription',
      { defaultMessage: 'Exploit Public-Facing Application (T1190)' }
    ),
    id: 'T1190',
    name: 'Exploit Public-Facing Application',
    reference: 'https://attack.mitre.org/techniques/T1190',
    tactics: 'initial-access',
    value: 'exploitPublicFacingApplication',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exploitationForClientExecutionDescription',
      { defaultMessage: 'Exploitation for Client Execution (T1203)' }
    ),
    id: 'T1203',
    name: 'Exploitation for Client Execution',
    reference: 'https://attack.mitre.org/techniques/T1203',
    tactics: 'execution',
    value: 'exploitationForClientExecution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exploitationForCredentialAccessDescription',
      { defaultMessage: 'Exploitation for Credential Access (T1212)' }
    ),
    id: 'T1212',
    name: 'Exploitation for Credential Access',
    reference: 'https://attack.mitre.org/techniques/T1212',
    tactics: 'credential-access',
    value: 'exploitationForCredentialAccess',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exploitationForDefenseEvasionDescription',
      { defaultMessage: 'Exploitation for Defense Evasion (T1211)' }
    ),
    id: 'T1211',
    name: 'Exploitation for Defense Evasion',
    reference: 'https://attack.mitre.org/techniques/T1211',
    tactics: 'defense-evasion',
    value: 'exploitationForDefenseEvasion',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exploitationForPrivilegeEscalationDescription',
      { defaultMessage: 'Exploitation for Privilege Escalation (T1068)' }
    ),
    id: 'T1068',
    name: 'Exploitation for Privilege Escalation',
    reference: 'https://attack.mitre.org/techniques/T1068',
    tactics: 'privilege-escalation',
    value: 'exploitationForPrivilegeEscalation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exploitationOfRemoteServicesDescription',
      { defaultMessage: 'Exploitation of Remote Services (T1210)' }
    ),
    id: 'T1210',
    name: 'Exploitation of Remote Services',
    reference: 'https://attack.mitre.org/techniques/T1210',
    tactics: 'lateral-movement',
    value: 'exploitationOfRemoteServices',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.externalDefacementDescription',
      { defaultMessage: 'External Defacement (T1491.002)' }
    ),
    id: 'T1491.002',
    name: 'External Defacement',
    reference: 'https://attack.mitre.org/techniques/T1491/002',
    tactics: 'impact',
    value: 'externalDefacement',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.externalProxyDescription',
      { defaultMessage: 'External Proxy (T1090.002)' }
    ),
    id: 'T1090.002',
    name: 'External Proxy',
    reference: 'https://attack.mitre.org/techniques/T1090/002',
    tactics: 'command-and-control',
    value: 'externalProxy',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.externalRemoteServicesDescription',
      { defaultMessage: 'External Remote Services (T1133)' }
    ),
    id: 'T1133',
    name: 'External Remote Services',
    reference: 'https://attack.mitre.org/techniques/T1133',
    tactics: 'persistence,initial-access',
    value: 'externalRemoteServices',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.extraWindowMemoryInjectionDescription',
      { defaultMessage: 'Extra Window Memory Injection (T1181)' }
    ),
    id: 'T1181',
    name: 'Extra Window Memory Injection',
    reference: 'https://attack.mitre.org/techniques/T1181',
    tactics: '',
    value: 'extraWindowMemoryInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.extraWindowMemoryInjectionDescription',
      { defaultMessage: 'Extra Window Memory Injection (T1055.011)' }
    ),
    id: 'T1055.011',
    name: 'Extra Window Memory Injection',
    reference: 'https://attack.mitre.org/techniques/T1055/011',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'extraWindowMemoryInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.fallbackChannelsDescription',
      { defaultMessage: 'Fallback Channels (T1008)' }
    ),
    id: 'T1008',
    name: 'Fallback Channels',
    reference: 'https://attack.mitre.org/techniques/T1008',
    tactics: 'command-and-control',
    value: 'fallbackChannels',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.fastFluxDnsDescription',
      { defaultMessage: 'Fast Flux DNS (T1568.001)' }
    ),
    id: 'T1568.001',
    name: 'Fast Flux DNS',
    reference: 'https://attack.mitre.org/techniques/T1568/001',
    tactics: 'command-and-control',
    value: 'fastFluxDns',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.fileDeletionDescription',
      { defaultMessage: 'File Deletion (T1107)' }
    ),
    id: 'T1107',
    name: 'File Deletion',
    reference: 'https://attack.mitre.org/techniques/T1107',
    tactics: '',
    value: 'fileDeletion',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.fileDeletionDescription',
      { defaultMessage: 'File Deletion (T1070.004)' }
    ),
    id: 'T1070.004',
    name: 'File Deletion',
    reference: 'https://attack.mitre.org/techniques/T1070/004',
    tactics: 'defense-evasion',
    value: 'fileDeletion',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.fileSystemPermissionsWeaknessDescription',
      { defaultMessage: 'File System Permissions Weakness (T1044)' }
    ),
    id: 'T1044',
    name: 'File System Permissions Weakness',
    reference: 'https://attack.mitre.org/techniques/T1044',
    tactics: '',
    value: 'fileSystemPermissionsWeakness',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.fileTransferProtocolsDescription',
      { defaultMessage: 'File Transfer Protocols (T1071.002)' }
    ),
    id: 'T1071.002',
    name: 'File Transfer Protocols',
    reference: 'https://attack.mitre.org/techniques/T1071/002',
    tactics: 'command-and-control',
    value: 'fileTransferProtocols',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.fileAndDirectoryDiscoveryDescription',
      { defaultMessage: 'File and Directory Discovery (T1083)' }
    ),
    id: 'T1083',
    name: 'File and Directory Discovery',
    reference: 'https://attack.mitre.org/techniques/T1083',
    tactics: 'discovery',
    value: 'fileAndDirectoryDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.fileAndDirectoryPermissionsModificationDescription',
      { defaultMessage: 'File and Directory Permissions Modification (T1222)' }
    ),
    id: 'T1222',
    name: 'File and Directory Permissions Modification',
    reference: 'https://attack.mitre.org/techniques/T1222',
    tactics: 'defense-evasion',
    value: 'fileAndDirectoryPermissionsModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.firmwareCorruptionDescription',
      { defaultMessage: 'Firmware Corruption (T1495)' }
    ),
    id: 'T1495',
    name: 'Firmware Corruption',
    reference: 'https://attack.mitre.org/techniques/T1495',
    tactics: 'impact',
    value: 'firmwareCorruption',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.forcedAuthenticationDescription',
      { defaultMessage: 'Forced Authentication (T1187)' }
    ),
    id: 'T1187',
    name: 'Forced Authentication',
    reference: 'https://attack.mitre.org/techniques/T1187',
    tactics: 'credential-access',
    value: 'forcedAuthentication',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.guiInputCaptureDescription',
      { defaultMessage: 'GUI Input Capture (T1056.002)' }
    ),
    id: 'T1056.002',
    name: 'GUI Input Capture',
    reference: 'https://attack.mitre.org/techniques/T1056/002',
    tactics: 'collection,credential-access',
    value: 'guiInputCapture',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.gatekeeperBypassDescription',
      { defaultMessage: 'Gatekeeper Bypass (T1144)' }
    ),
    id: 'T1144',
    name: 'Gatekeeper Bypass',
    reference: 'https://attack.mitre.org/techniques/T1144',
    tactics: '',
    value: 'gatekeeperBypass',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.gatekeeperBypassDescription',
      { defaultMessage: 'Gatekeeper Bypass (T1553.001)' }
    ),
    id: 'T1553.001',
    name: 'Gatekeeper Bypass',
    reference: 'https://attack.mitre.org/techniques/T1553/001',
    tactics: 'defense-evasion',
    value: 'gatekeeperBypass',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.goldenTicketDescription',
      { defaultMessage: 'Golden Ticket (T1558.001)' }
    ),
    id: 'T1558.001',
    name: 'Golden Ticket',
    reference: 'https://attack.mitre.org/techniques/T1558/001',
    tactics: 'credential-access',
    value: 'goldenTicket',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.graphicalUserInterfaceDescription',
      { defaultMessage: 'Graphical User Interface (T1061)' }
    ),
    id: 'T1061',
    name: 'Graphical User Interface',
    reference: 'https://attack.mitre.org/techniques/T1061',
    tactics: 'execution',
    value: 'graphicalUserInterface',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.groupPolicyModificationDescription',
      { defaultMessage: 'Group Policy Modification (T1484)' }
    ),
    id: 'T1484',
    name: 'Group Policy Modification',
    reference: 'https://attack.mitre.org/techniques/T1484',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'groupPolicyModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.groupPolicyPreferencesDescription',
      { defaultMessage: 'Group Policy Preferences (T1552.006)' }
    ),
    id: 'T1552.006',
    name: 'Group Policy Preferences',
    reference: 'https://attack.mitre.org/techniques/T1552/006',
    tactics: 'credential-access',
    value: 'groupPolicyPreferences',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.histcontrolDescription',
      { defaultMessage: 'HISTCONTROL (T1148)' }
    ),
    id: 'T1148',
    name: 'HISTCONTROL',
    reference: 'https://attack.mitre.org/techniques/T1148',
    tactics: '',
    value: 'histcontrol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.histcontrolDescription',
      { defaultMessage: 'HISTCONTROL (T1562.003)' }
    ),
    id: 'T1562.003',
    name: 'HISTCONTROL',
    reference: 'https://attack.mitre.org/techniques/T1562/003',
    tactics: 'defense-evasion',
    value: 'histcontrol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hardwareAdditionsDescription',
      { defaultMessage: 'Hardware Additions (T1200)' }
    ),
    id: 'T1200',
    name: 'Hardware Additions',
    reference: 'https://attack.mitre.org/techniques/T1200',
    tactics: 'initial-access',
    value: 'hardwareAdditions',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hiddenFileSystemDescription',
      { defaultMessage: 'Hidden File System (T1564.005)' }
    ),
    id: 'T1564.005',
    name: 'Hidden File System',
    reference: 'https://attack.mitre.org/techniques/T1564/005',
    tactics: 'defense-evasion',
    value: 'hiddenFileSystem',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hiddenFilesAndDirectoriesDescription',
      { defaultMessage: 'Hidden Files and Directories (T1158)' }
    ),
    id: 'T1158',
    name: 'Hidden Files and Directories',
    reference: 'https://attack.mitre.org/techniques/T1158',
    tactics: '',
    value: 'hiddenFilesAndDirectories',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hiddenFilesAndDirectoriesDescription',
      { defaultMessage: 'Hidden Files and Directories (T1564.001)' }
    ),
    id: 'T1564.001',
    name: 'Hidden Files and Directories',
    reference: 'https://attack.mitre.org/techniques/T1564/001',
    tactics: 'defense-evasion',
    value: 'hiddenFilesAndDirectories',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hiddenUsersDescription',
      { defaultMessage: 'Hidden Users (T1147)' }
    ),
    id: 'T1147',
    name: 'Hidden Users',
    reference: 'https://attack.mitre.org/techniques/T1147',
    tactics: '',
    value: 'hiddenUsers',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hiddenUsersDescription',
      { defaultMessage: 'Hidden Users (T1564.002)' }
    ),
    id: 'T1564.002',
    name: 'Hidden Users',
    reference: 'https://attack.mitre.org/techniques/T1564/002',
    tactics: 'defense-evasion',
    value: 'hiddenUsers',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hiddenWindowDescription',
      { defaultMessage: 'Hidden Window (T1143)' }
    ),
    id: 'T1143',
    name: 'Hidden Window',
    reference: 'https://attack.mitre.org/techniques/T1143',
    tactics: '',
    value: 'hiddenWindow',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hiddenWindowDescription',
      { defaultMessage: 'Hidden Window (T1564.003)' }
    ),
    id: 'T1564.003',
    name: 'Hidden Window',
    reference: 'https://attack.mitre.org/techniques/T1564/003',
    tactics: 'defense-evasion',
    value: 'hiddenWindow',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hideArtifactsDescription',
      { defaultMessage: 'Hide Artifacts (T1564)' }
    ),
    id: 'T1564',
    name: 'Hide Artifacts',
    reference: 'https://attack.mitre.org/techniques/T1564',
    tactics: 'defense-evasion',
    value: 'hideArtifacts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hijackExecutionFlowDescription',
      { defaultMessage: 'Hijack Execution Flow (T1574)' }
    ),
    id: 'T1574',
    name: 'Hijack Execution Flow',
    reference: 'https://attack.mitre.org/techniques/T1574',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    value: 'hijackExecutionFlow',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hookingDescription',
      { defaultMessage: 'Hooking (T1179)' }
    ),
    id: 'T1179',
    name: 'Hooking',
    reference: 'https://attack.mitre.org/techniques/T1179',
    tactics: '',
    value: 'hooking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hypervisorDescription',
      { defaultMessage: 'Hypervisor (T1062)' }
    ),
    id: 'T1062',
    name: 'Hypervisor',
    reference: 'https://attack.mitre.org/techniques/T1062',
    tactics: 'persistence',
    value: 'hypervisor',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.imageFileExecutionOptionsInjectionDescription',
      { defaultMessage: 'Image File Execution Options Injection (T1183)' }
    ),
    id: 'T1183',
    name: 'Image File Execution Options Injection',
    reference: 'https://attack.mitre.org/techniques/T1183',
    tactics: '',
    value: 'imageFileExecutionOptionsInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.imageFileExecutionOptionsInjectionDescription',
      { defaultMessage: 'Image File Execution Options Injection (T1546.012)' }
    ),
    id: 'T1546.012',
    name: 'Image File Execution Options Injection',
    reference: 'https://attack.mitre.org/techniques/T1546/012',
    tactics: 'privilege-escalation,persistence',
    value: 'imageFileExecutionOptionsInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.impairDefensesDescription',
      { defaultMessage: 'Impair Defenses (T1562)' }
    ),
    id: 'T1562',
    name: 'Impair Defenses',
    reference: 'https://attack.mitre.org/techniques/T1562',
    tactics: 'defense-evasion',
    value: 'impairDefenses',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.implantContainerImageDescription',
      { defaultMessage: 'Implant Container Image (T1525)' }
    ),
    id: 'T1525',
    name: 'Implant Container Image',
    reference: 'https://attack.mitre.org/techniques/T1525',
    tactics: 'persistence',
    value: 'implantContainerImage',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.indicatorBlockingDescription',
      { defaultMessage: 'Indicator Blocking (T1054)' }
    ),
    id: 'T1054',
    name: 'Indicator Blocking',
    reference: 'https://attack.mitre.org/techniques/T1054',
    tactics: '',
    value: 'indicatorBlocking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.indicatorBlockingDescription',
      { defaultMessage: 'Indicator Blocking (T1562.006)' }
    ),
    id: 'T1562.006',
    name: 'Indicator Blocking',
    reference: 'https://attack.mitre.org/techniques/T1562/006',
    tactics: 'defense-evasion',
    value: 'indicatorBlocking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.indicatorRemovalFromToolsDescription',
      { defaultMessage: 'Indicator Removal from Tools (T1066)' }
    ),
    id: 'T1066',
    name: 'Indicator Removal from Tools',
    reference: 'https://attack.mitre.org/techniques/T1066',
    tactics: '',
    value: 'indicatorRemovalFromTools',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.indicatorRemovalFromToolsDescription',
      { defaultMessage: 'Indicator Removal from Tools (T1027.005)' }
    ),
    id: 'T1027.005',
    name: 'Indicator Removal from Tools',
    reference: 'https://attack.mitre.org/techniques/T1027/005',
    tactics: 'defense-evasion',
    value: 'indicatorRemovalFromTools',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.indicatorRemovalOnHostDescription',
      { defaultMessage: 'Indicator Removal on Host (T1070)' }
    ),
    id: 'T1070',
    name: 'Indicator Removal on Host',
    reference: 'https://attack.mitre.org/techniques/T1070',
    tactics: 'defense-evasion',
    value: 'indicatorRemovalOnHost',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.indirectCommandExecutionDescription',
      { defaultMessage: 'Indirect Command Execution (T1202)' }
    ),
    id: 'T1202',
    name: 'Indirect Command Execution',
    reference: 'https://attack.mitre.org/techniques/T1202',
    tactics: 'defense-evasion',
    value: 'indirectCommandExecution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.ingressToolTransferDescription',
      { defaultMessage: 'Ingress Tool Transfer (T1105)' }
    ),
    id: 'T1105',
    name: 'Ingress Tool Transfer',
    reference: 'https://attack.mitre.org/techniques/T1105',
    tactics: 'command-and-control',
    value: 'ingressToolTransfer',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.inhibitSystemRecoveryDescription',
      { defaultMessage: 'Inhibit System Recovery (T1490)' }
    ),
    id: 'T1490',
    name: 'Inhibit System Recovery',
    reference: 'https://attack.mitre.org/techniques/T1490',
    tactics: 'impact',
    value: 'inhibitSystemRecovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.inputCaptureDescription',
      { defaultMessage: 'Input Capture (T1056)' }
    ),
    id: 'T1056',
    name: 'Input Capture',
    reference: 'https://attack.mitre.org/techniques/T1056',
    tactics: 'collection,credential-access',
    value: 'inputCapture',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.inputPromptDescription',
      { defaultMessage: 'Input Prompt (T1141)' }
    ),
    id: 'T1141',
    name: 'Input Prompt',
    reference: 'https://attack.mitre.org/techniques/T1141',
    tactics: '',
    value: 'inputPrompt',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.installRootCertificateDescription',
      { defaultMessage: 'Install Root Certificate (T1130)' }
    ),
    id: 'T1130',
    name: 'Install Root Certificate',
    reference: 'https://attack.mitre.org/techniques/T1130',
    tactics: '',
    value: 'installRootCertificate',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.installRootCertificateDescription',
      { defaultMessage: 'Install Root Certificate (T1553.004)' }
    ),
    id: 'T1553.004',
    name: 'Install Root Certificate',
    reference: 'https://attack.mitre.org/techniques/T1553/004',
    tactics: 'defense-evasion',
    value: 'installRootCertificate',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.installUtilDescription',
      { defaultMessage: 'InstallUtil (T1118)' }
    ),
    id: 'T1118',
    name: 'InstallUtil',
    reference: 'https://attack.mitre.org/techniques/T1118',
    tactics: '',
    value: 'installUtil',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.installUtilDescription',
      { defaultMessage: 'InstallUtil (T1218.004)' }
    ),
    id: 'T1218.004',
    name: 'InstallUtil',
    reference: 'https://attack.mitre.org/techniques/T1218/004',
    tactics: 'defense-evasion',
    value: 'installUtil',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.interProcessCommunicationDescription',
      { defaultMessage: 'Inter-Process Communication (T1559)' }
    ),
    id: 'T1559',
    name: 'Inter-Process Communication',
    reference: 'https://attack.mitre.org/techniques/T1559',
    tactics: 'execution',
    value: 'interProcessCommunication',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.internalDefacementDescription',
      { defaultMessage: 'Internal Defacement (T1491.001)' }
    ),
    id: 'T1491.001',
    name: 'Internal Defacement',
    reference: 'https://attack.mitre.org/techniques/T1491/001',
    tactics: 'impact',
    value: 'internalDefacement',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.internalProxyDescription',
      { defaultMessage: 'Internal Proxy (T1090.001)' }
    ),
    id: 'T1090.001',
    name: 'Internal Proxy',
    reference: 'https://attack.mitre.org/techniques/T1090/001',
    tactics: 'command-and-control',
    value: 'internalProxy',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.internalSpearphishingDescription',
      { defaultMessage: 'Internal Spearphishing (T1534)' }
    ),
    id: 'T1534',
    name: 'Internal Spearphishing',
    reference: 'https://attack.mitre.org/techniques/T1534',
    tactics: 'lateral-movement',
    value: 'internalSpearphishing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.invalidCodeSignatureDescription',
      { defaultMessage: 'Invalid Code Signature (T1036.001)' }
    ),
    id: 'T1036.001',
    name: 'Invalid Code Signature',
    reference: 'https://attack.mitre.org/techniques/T1036/001',
    tactics: 'defense-evasion',
    value: 'invalidCodeSignature',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.javaScriptJScriptDescription',
      { defaultMessage: 'JavaScript/JScript (T1059.007)' }
    ),
    id: 'T1059.007',
    name: 'JavaScript/JScript',
    reference: 'https://attack.mitre.org/techniques/T1059/007',
    tactics: 'execution',
    value: 'javaScriptJScript',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.junkDataDescription',
      { defaultMessage: 'Junk Data (T1001.001)' }
    ),
    id: 'T1001.001',
    name: 'Junk Data',
    reference: 'https://attack.mitre.org/techniques/T1001/001',
    tactics: 'command-and-control',
    value: 'junkData',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.kerberoastingDescription',
      { defaultMessage: 'Kerberoasting (T1208)' }
    ),
    id: 'T1208',
    name: 'Kerberoasting',
    reference: 'https://attack.mitre.org/techniques/T1208',
    tactics: '',
    value: 'kerberoasting',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.kerberoastingDescription',
      { defaultMessage: 'Kerberoasting (T1558.003)' }
    ),
    id: 'T1558.003',
    name: 'Kerberoasting',
    reference: 'https://attack.mitre.org/techniques/T1558/003',
    tactics: 'credential-access',
    value: 'kerberoasting',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.kernelModulesAndExtensionsDescription',
      { defaultMessage: 'Kernel Modules and Extensions (T1215)' }
    ),
    id: 'T1215',
    name: 'Kernel Modules and Extensions',
    reference: 'https://attack.mitre.org/techniques/T1215',
    tactics: '',
    value: 'kernelModulesAndExtensions',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.kernelModulesAndExtensionsDescription',
      { defaultMessage: 'Kernel Modules and Extensions (T1547.006)' }
    ),
    id: 'T1547.006',
    name: 'Kernel Modules and Extensions',
    reference: 'https://attack.mitre.org/techniques/T1547/006',
    tactics: 'persistence,privilege-escalation',
    value: 'kernelModulesAndExtensions',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.keychainDescription',
      { defaultMessage: 'Keychain (T1142)' }
    ),
    id: 'T1142',
    name: 'Keychain',
    reference: 'https://attack.mitre.org/techniques/T1142',
    tactics: '',
    value: 'keychain',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.keychainDescription',
      { defaultMessage: 'Keychain (T1555.001)' }
    ),
    id: 'T1555.001',
    name: 'Keychain',
    reference: 'https://attack.mitre.org/techniques/T1555/001',
    tactics: 'credential-access',
    value: 'keychain',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.keyloggingDescription',
      { defaultMessage: 'Keylogging (T1056.001)' }
    ),
    id: 'T1056.001',
    name: 'Keylogging',
    reference: 'https://attack.mitre.org/techniques/T1056/001',
    tactics: 'collection,credential-access',
    value: 'keylogging',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.lcLoadDylibAdditionDescription',
      { defaultMessage: 'LC_LOAD_DYLIB Addition (T1161)' }
    ),
    id: 'T1161',
    name: 'LC_LOAD_DYLIB Addition',
    reference: 'https://attack.mitre.org/techniques/T1161',
    tactics: '',
    value: 'lcLoadDylibAddition',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.lcLoadDylibAdditionDescription',
      { defaultMessage: 'LC_LOAD_DYLIB Addition (T1546.006)' }
    ),
    id: 'T1546.006',
    name: 'LC_LOAD_DYLIB Addition',
    reference: 'https://attack.mitre.org/techniques/T1546/006',
    tactics: 'privilege-escalation,persistence',
    value: 'lcLoadDylibAddition',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.lcMainHijackingDescription',
      { defaultMessage: 'LC_MAIN Hijacking (T1149)' }
    ),
    id: 'T1149',
    name: 'LC_MAIN Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1149',
    tactics: 'defense-evasion',
    value: 'lcMainHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.ldPreloadDescription',
      { defaultMessage: 'LD_PRELOAD (T1574.006)' }
    ),
    id: 'T1574.006',
    name: 'LD_PRELOAD',
    reference: 'https://attack.mitre.org/techniques/T1574/006',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    value: 'ldPreload',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.llmnrNbtNsPoisoningAndRelayDescription',
      { defaultMessage: 'LLMNR/NBT-NS Poisoning and Relay (T1171)' }
    ),
    id: 'T1171',
    name: 'LLMNR/NBT-NS Poisoning and Relay',
    reference: 'https://attack.mitre.org/techniques/T1171',
    tactics: '',
    value: 'llmnrNbtNsPoisoningAndRelay',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.llmnrNbtNsPoisoningAndSmbRelayDescription',
      { defaultMessage: 'LLMNR/NBT-NS Poisoning and SMB Relay (T1557.001)' }
    ),
    id: 'T1557.001',
    name: 'LLMNR/NBT-NS Poisoning and SMB Relay',
    reference: 'https://attack.mitre.org/techniques/T1557/001',
    tactics: 'credential-access,collection',
    value: 'llmnrNbtNsPoisoningAndSmbRelay',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.lsaSecretsDescription',
      { defaultMessage: 'LSA Secrets (T1003.004)' }
    ),
    id: 'T1003.004',
    name: 'LSA Secrets',
    reference: 'https://attack.mitre.org/techniques/T1003/004',
    tactics: 'credential-access',
    value: 'lsaSecrets',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.lsassDriverDescription',
      { defaultMessage: 'LSASS Driver (T1177)' }
    ),
    id: 'T1177',
    name: 'LSASS Driver',
    reference: 'https://attack.mitre.org/techniques/T1177',
    tactics: '',
    value: 'lsassDriver',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.lsassDriverDescription',
      { defaultMessage: 'LSASS Driver (T1547.008)' }
    ),
    id: 'T1547.008',
    name: 'LSASS Driver',
    reference: 'https://attack.mitre.org/techniques/T1547/008',
    tactics: 'persistence,privilege-escalation',
    value: 'lsassDriver',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.lsassMemoryDescription',
      { defaultMessage: 'LSASS Memory (T1003.001)' }
    ),
    id: 'T1003.001',
    name: 'LSASS Memory',
    reference: 'https://attack.mitre.org/techniques/T1003/001',
    tactics: 'credential-access',
    value: 'lsassMemory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.lateralToolTransferDescription',
      { defaultMessage: 'Lateral Tool Transfer (T1570)' }
    ),
    id: 'T1570',
    name: 'Lateral Tool Transfer',
    reference: 'https://attack.mitre.org/techniques/T1570',
    tactics: 'lateral-movement',
    value: 'lateralToolTransfer',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.launchAgentDescription',
      { defaultMessage: 'Launch Agent (T1159)' }
    ),
    id: 'T1159',
    name: 'Launch Agent',
    reference: 'https://attack.mitre.org/techniques/T1159',
    tactics: '',
    value: 'launchAgent',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.launchAgentDescription',
      { defaultMessage: 'Launch Agent (T1543.001)' }
    ),
    id: 'T1543.001',
    name: 'Launch Agent',
    reference: 'https://attack.mitre.org/techniques/T1543/001',
    tactics: 'persistence,privilege-escalation',
    value: 'launchAgent',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.launchDaemonDescription',
      { defaultMessage: 'Launch Daemon (T1160)' }
    ),
    id: 'T1160',
    name: 'Launch Daemon',
    reference: 'https://attack.mitre.org/techniques/T1160',
    tactics: '',
    value: 'launchDaemon',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.launchDaemonDescription',
      { defaultMessage: 'Launch Daemon (T1543.004)' }
    ),
    id: 'T1543.004',
    name: 'Launch Daemon',
    reference: 'https://attack.mitre.org/techniques/T1543/004',
    tactics: 'persistence,privilege-escalation',
    value: 'launchDaemon',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.launchctlDescription',
      { defaultMessage: 'Launchctl (T1152)' }
    ),
    id: 'T1152',
    name: 'Launchctl',
    reference: 'https://attack.mitre.org/techniques/T1152',
    tactics: '',
    value: 'launchctl',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.launchctlDescription',
      { defaultMessage: 'Launchctl (T1569.001)' }
    ),
    id: 'T1569.001',
    name: 'Launchctl',
    reference: 'https://attack.mitre.org/techniques/T1569/001',
    tactics: 'execution',
    value: 'launchctl',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.launchdDescription',
      { defaultMessage: 'Launchd (T1053.004)' }
    ),
    id: 'T1053.004',
    name: 'Launchd',
    reference: 'https://attack.mitre.org/techniques/T1053/004',
    tactics: 'execution,persistence,privilege-escalation',
    value: 'launchd',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.linuxAndMacFileAndDirectoryPermissionsModificationDescription',
      { defaultMessage: 'Linux and Mac File and Directory Permissions Modification (T1222.002)' }
    ),
    id: 'T1222.002',
    name: 'Linux and Mac File and Directory Permissions Modification',
    reference: 'https://attack.mitre.org/techniques/T1222/002',
    tactics: 'defense-evasion',
    value: 'linuxAndMacFileAndDirectoryPermissionsModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.localAccountDescription',
      { defaultMessage: 'Local Account (T1136.001)' }
    ),
    id: 'T1136.001',
    name: 'Local Account',
    reference: 'https://attack.mitre.org/techniques/T1136/001',
    tactics: 'persistence',
    value: 'localAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.localAccountDescription',
      { defaultMessage: 'Local Account (T1087.001)' }
    ),
    id: 'T1087.001',
    name: 'Local Account',
    reference: 'https://attack.mitre.org/techniques/T1087/001',
    tactics: 'discovery',
    value: 'localAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.localAccountsDescription',
      { defaultMessage: 'Local Accounts (T1078.003)' }
    ),
    id: 'T1078.003',
    name: 'Local Accounts',
    reference: 'https://attack.mitre.org/techniques/T1078/003',
    tactics: 'defense-evasion,persistence,privilege-escalation,initial-access',
    value: 'localAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.localDataStagingDescription',
      { defaultMessage: 'Local Data Staging (T1074.001)' }
    ),
    id: 'T1074.001',
    name: 'Local Data Staging',
    reference: 'https://attack.mitre.org/techniques/T1074/001',
    tactics: 'collection',
    value: 'localDataStaging',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.localEmailCollectionDescription',
      { defaultMessage: 'Local Email Collection (T1114.001)' }
    ),
    id: 'T1114.001',
    name: 'Local Email Collection',
    reference: 'https://attack.mitre.org/techniques/T1114/001',
    tactics: 'collection',
    value: 'localEmailCollection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.localGroupsDescription',
      { defaultMessage: 'Local Groups (T1069.001)' }
    ),
    id: 'T1069.001',
    name: 'Local Groups',
    reference: 'https://attack.mitre.org/techniques/T1069/001',
    tactics: 'discovery',
    value: 'localGroups',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.localJobSchedulingDescription',
      { defaultMessage: 'Local Job Scheduling (T1168)' }
    ),
    id: 'T1168',
    name: 'Local Job Scheduling',
    reference: 'https://attack.mitre.org/techniques/T1168',
    tactics: '',
    value: 'localJobScheduling',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.loginItemDescription',
      { defaultMessage: 'Login Item (T1162)' }
    ),
    id: 'T1162',
    name: 'Login Item',
    reference: 'https://attack.mitre.org/techniques/T1162',
    tactics: '',
    value: 'loginItem',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.logonScriptMacDescription',
      { defaultMessage: 'Logon Script (Mac) (T1037.002)' }
    ),
    id: 'T1037.002',
    name: 'Logon Script (Mac)',
    reference: 'https://attack.mitre.org/techniques/T1037/002',
    tactics: 'persistence,privilege-escalation',
    value: 'logonScriptMac',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.logonScriptWindowsDescription',
      { defaultMessage: 'Logon Script (Windows) (T1037.001)' }
    ),
    id: 'T1037.001',
    name: 'Logon Script (Windows)',
    reference: 'https://attack.mitre.org/techniques/T1037/001',
    tactics: 'persistence,privilege-escalation',
    value: 'logonScriptWindows',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.msBuildDescription',
      { defaultMessage: 'MSBuild (T1127.001)' }
    ),
    id: 'T1127.001',
    name: 'MSBuild',
    reference: 'https://attack.mitre.org/techniques/T1127/001',
    tactics: 'defense-evasion',
    value: 'msBuild',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.mailProtocolsDescription',
      { defaultMessage: 'Mail Protocols (T1071.003)' }
    ),
    id: 'T1071.003',
    name: 'Mail Protocols',
    reference: 'https://attack.mitre.org/techniques/T1071/003',
    tactics: 'command-and-control',
    value: 'mailProtocols',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.makeAndImpersonateTokenDescription',
      { defaultMessage: 'Make and Impersonate Token (T1134.003)' }
    ),
    id: 'T1134.003',
    name: 'Make and Impersonate Token',
    reference: 'https://attack.mitre.org/techniques/T1134/003',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'makeAndImpersonateToken',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.maliciousFileDescription',
      { defaultMessage: 'Malicious File (T1204.002)' }
    ),
    id: 'T1204.002',
    name: 'Malicious File',
    reference: 'https://attack.mitre.org/techniques/T1204/002',
    tactics: 'execution',
    value: 'maliciousFile',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.maliciousLinkDescription',
      { defaultMessage: 'Malicious Link (T1204.001)' }
    ),
    id: 'T1204.001',
    name: 'Malicious Link',
    reference: 'https://attack.mitre.org/techniques/T1204/001',
    tactics: 'execution',
    value: 'maliciousLink',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.manInTheBrowserDescription',
      { defaultMessage: 'Man in the Browser (T1185)' }
    ),
    id: 'T1185',
    name: 'Man in the Browser',
    reference: 'https://attack.mitre.org/techniques/T1185',
    tactics: 'collection',
    value: 'manInTheBrowser',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.manInTheMiddleDescription',
      { defaultMessage: 'Man-in-the-Middle (T1557)' }
    ),
    id: 'T1557',
    name: 'Man-in-the-Middle',
    reference: 'https://attack.mitre.org/techniques/T1557',
    tactics: 'credential-access,collection',
    value: 'manInTheMiddle',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.masqueradeTaskOrServiceDescription',
      { defaultMessage: 'Masquerade Task or Service (T1036.004)' }
    ),
    id: 'T1036.004',
    name: 'Masquerade Task or Service',
    reference: 'https://attack.mitre.org/techniques/T1036/004',
    tactics: 'defense-evasion',
    value: 'masqueradeTaskOrService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.masqueradingDescription',
      { defaultMessage: 'Masquerading (T1036)' }
    ),
    id: 'T1036',
    name: 'Masquerading',
    reference: 'https://attack.mitre.org/techniques/T1036',
    tactics: 'defense-evasion',
    value: 'masquerading',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.matchLegitimateNameOrLocationDescription',
      { defaultMessage: 'Match Legitimate Name or Location (T1036.005)' }
    ),
    id: 'T1036.005',
    name: 'Match Legitimate Name or Location',
    reference: 'https://attack.mitre.org/techniques/T1036/005',
    tactics: 'defense-evasion',
    value: 'matchLegitimateNameOrLocation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.modifyAuthenticationProcessDescription',
      { defaultMessage: 'Modify Authentication Process (T1556)' }
    ),
    id: 'T1556',
    name: 'Modify Authentication Process',
    reference: 'https://attack.mitre.org/techniques/T1556',
    tactics: 'credential-access,defense-evasion',
    value: 'modifyAuthenticationProcess',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.modifyCloudComputeInfrastructureDescription',
      { defaultMessage: 'Modify Cloud Compute Infrastructure (T1578)' }
    ),
    id: 'T1578',
    name: 'Modify Cloud Compute Infrastructure',
    reference: 'https://attack.mitre.org/techniques/T1578',
    tactics: 'defense-evasion',
    value: 'modifyCloudComputeInfrastructure',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.modifyExistingServiceDescription',
      { defaultMessage: 'Modify Existing Service (T1031)' }
    ),
    id: 'T1031',
    name: 'Modify Existing Service',
    reference: 'https://attack.mitre.org/techniques/T1031',
    tactics: '',
    value: 'modifyExistingService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.modifyRegistryDescription',
      { defaultMessage: 'Modify Registry (T1112)' }
    ),
    id: 'T1112',
    name: 'Modify Registry',
    reference: 'https://attack.mitre.org/techniques/T1112',
    tactics: 'defense-evasion',
    value: 'modifyRegistry',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.mshtaDescription',
      { defaultMessage: 'Mshta (T1170)' }
    ),
    id: 'T1170',
    name: 'Mshta',
    reference: 'https://attack.mitre.org/techniques/T1170',
    tactics: '',
    value: 'mshta',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.mshtaDescription',
      { defaultMessage: 'Mshta (T1218.005)' }
    ),
    id: 'T1218.005',
    name: 'Mshta',
    reference: 'https://attack.mitre.org/techniques/T1218/005',
    tactics: 'defense-evasion',
    value: 'mshta',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.msiexecDescription',
      { defaultMessage: 'Msiexec (T1218.007)' }
    ),
    id: 'T1218.007',
    name: 'Msiexec',
    reference: 'https://attack.mitre.org/techniques/T1218/007',
    tactics: 'defense-evasion',
    value: 'msiexec',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.multiStageChannelsDescription',
      { defaultMessage: 'Multi-Stage Channels (T1104)' }
    ),
    id: 'T1104',
    name: 'Multi-Stage Channels',
    reference: 'https://attack.mitre.org/techniques/T1104',
    tactics: 'command-and-control',
    value: 'multiStageChannels',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.multiHopProxyDescription',
      { defaultMessage: 'Multi-hop Proxy (T1188)' }
    ),
    id: 'T1188',
    name: 'Multi-hop Proxy',
    reference: 'https://attack.mitre.org/techniques/T1188',
    tactics: '',
    value: 'multiHopProxy',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.multiHopProxyDescription',
      { defaultMessage: 'Multi-hop Proxy (T1090.003)' }
    ),
    id: 'T1090.003',
    name: 'Multi-hop Proxy',
    reference: 'https://attack.mitre.org/techniques/T1090/003',
    tactics: 'command-and-control',
    value: 'multiHopProxy',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.multibandCommunicationDescription',
      { defaultMessage: 'Multiband Communication (T1026)' }
    ),
    id: 'T1026',
    name: 'Multiband Communication',
    reference: 'https://attack.mitre.org/techniques/T1026',
    tactics: 'command-and-control',
    value: 'multibandCommunication',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.multilayerEncryptionDescription',
      { defaultMessage: 'Multilayer Encryption (T1079)' }
    ),
    id: 'T1079',
    name: 'Multilayer Encryption',
    reference: 'https://attack.mitre.org/techniques/T1079',
    tactics: '',
    value: 'multilayerEncryption',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.ntdsDescription',
      { defaultMessage: 'NTDS (T1003.003)' }
    ),
    id: 'T1003.003',
    name: 'NTDS',
    reference: 'https://attack.mitre.org/techniques/T1003/003',
    tactics: 'credential-access',
    value: 'ntds',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.ntfsFileAttributesDescription',
      { defaultMessage: 'NTFS File Attributes (T1096)' }
    ),
    id: 'T1096',
    name: 'NTFS File Attributes',
    reference: 'https://attack.mitre.org/techniques/T1096',
    tactics: '',
    value: 'ntfsFileAttributes',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.ntfsFileAttributesDescription',
      { defaultMessage: 'NTFS File Attributes (T1564.004)' }
    ),
    id: 'T1564.004',
    name: 'NTFS File Attributes',
    reference: 'https://attack.mitre.org/techniques/T1564/004',
    tactics: 'defense-evasion',
    value: 'ntfsFileAttributes',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.nativeApiDescription',
      { defaultMessage: 'Native API (T1106)' }
    ),
    id: 'T1106',
    name: 'Native API',
    reference: 'https://attack.mitre.org/techniques/T1106',
    tactics: 'execution',
    value: 'nativeApi',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.netshHelperDllDescription',
      { defaultMessage: 'Netsh Helper DLL (T1128)' }
    ),
    id: 'T1128',
    name: 'Netsh Helper DLL',
    reference: 'https://attack.mitre.org/techniques/T1128',
    tactics: '',
    value: 'netshHelperDll',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.netshHelperDllDescription',
      { defaultMessage: 'Netsh Helper DLL (T1546.007)' }
    ),
    id: 'T1546.007',
    name: 'Netsh Helper DLL',
    reference: 'https://attack.mitre.org/techniques/T1546/007',
    tactics: 'privilege-escalation,persistence',
    value: 'netshHelperDll',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.networkDenialOfServiceDescription',
      { defaultMessage: 'Network Denial of Service (T1498)' }
    ),
    id: 'T1498',
    name: 'Network Denial of Service',
    reference: 'https://attack.mitre.org/techniques/T1498',
    tactics: 'impact',
    value: 'networkDenialOfService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.networkLogonScriptDescription',
      { defaultMessage: 'Network Logon Script (T1037.003)' }
    ),
    id: 'T1037.003',
    name: 'Network Logon Script',
    reference: 'https://attack.mitre.org/techniques/T1037/003',
    tactics: 'persistence,privilege-escalation',
    value: 'networkLogonScript',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.networkServiceScanningDescription',
      { defaultMessage: 'Network Service Scanning (T1046)' }
    ),
    id: 'T1046',
    name: 'Network Service Scanning',
    reference: 'https://attack.mitre.org/techniques/T1046',
    tactics: 'discovery',
    value: 'networkServiceScanning',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.networkShareConnectionRemovalDescription',
      { defaultMessage: 'Network Share Connection Removal (T1126)' }
    ),
    id: 'T1126',
    name: 'Network Share Connection Removal',
    reference: 'https://attack.mitre.org/techniques/T1126',
    tactics: '',
    value: 'networkShareConnectionRemoval',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.networkShareConnectionRemovalDescription',
      { defaultMessage: 'Network Share Connection Removal (T1070.005)' }
    ),
    id: 'T1070.005',
    name: 'Network Share Connection Removal',
    reference: 'https://attack.mitre.org/techniques/T1070/005',
    tactics: 'defense-evasion',
    value: 'networkShareConnectionRemoval',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.networkShareDiscoveryDescription',
      { defaultMessage: 'Network Share Discovery (T1135)' }
    ),
    id: 'T1135',
    name: 'Network Share Discovery',
    reference: 'https://attack.mitre.org/techniques/T1135',
    tactics: 'discovery',
    value: 'networkShareDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.networkSniffingDescription',
      { defaultMessage: 'Network Sniffing (T1040)' }
    ),
    id: 'T1040',
    name: 'Network Sniffing',
    reference: 'https://attack.mitre.org/techniques/T1040',
    tactics: 'credential-access,discovery',
    value: 'networkSniffing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.newServiceDescription',
      { defaultMessage: 'New Service (T1050)' }
    ),
    id: 'T1050',
    name: 'New Service',
    reference: 'https://attack.mitre.org/techniques/T1050',
    tactics: '',
    value: 'newService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.nonApplicationLayerProtocolDescription',
      { defaultMessage: 'Non-Application Layer Protocol (T1095)' }
    ),
    id: 'T1095',
    name: 'Non-Application Layer Protocol',
    reference: 'https://attack.mitre.org/techniques/T1095',
    tactics: 'command-and-control',
    value: 'nonApplicationLayerProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.nonStandardEncodingDescription',
      { defaultMessage: 'Non-Standard Encoding (T1132.002)' }
    ),
    id: 'T1132.002',
    name: 'Non-Standard Encoding',
    reference: 'https://attack.mitre.org/techniques/T1132/002',
    tactics: 'command-and-control',
    value: 'nonStandardEncoding',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.nonStandardPortDescription',
      { defaultMessage: 'Non-Standard Port (T1571)' }
    ),
    id: 'T1571',
    name: 'Non-Standard Port',
    reference: 'https://attack.mitre.org/techniques/T1571',
    tactics: 'command-and-control',
    value: 'nonStandardPort',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.osCredentialDumpingDescription',
      { defaultMessage: 'OS Credential Dumping (T1003)' }
    ),
    id: 'T1003',
    name: 'OS Credential Dumping',
    reference: 'https://attack.mitre.org/techniques/T1003',
    tactics: 'credential-access',
    value: 'osCredentialDumping',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.osExhaustionFloodDescription',
      { defaultMessage: 'OS Exhaustion Flood (T1499.001)' }
    ),
    id: 'T1499.001',
    name: 'OS Exhaustion Flood',
    reference: 'https://attack.mitre.org/techniques/T1499/001',
    tactics: 'impact',
    value: 'osExhaustionFlood',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.obfuscatedFilesOrInformationDescription',
      { defaultMessage: 'Obfuscated Files or Information (T1027)' }
    ),
    id: 'T1027',
    name: 'Obfuscated Files or Information',
    reference: 'https://attack.mitre.org/techniques/T1027',
    tactics: 'defense-evasion',
    value: 'obfuscatedFilesOrInformation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.odbcconfDescription',
      { defaultMessage: 'Odbcconf (T1218.008)' }
    ),
    id: 'T1218.008',
    name: 'Odbcconf',
    reference: 'https://attack.mitre.org/techniques/T1218/008',
    tactics: 'defense-evasion',
    value: 'odbcconf',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.officeApplicationStartupDescription',
      { defaultMessage: 'Office Application Startup (T1137)' }
    ),
    id: 'T1137',
    name: 'Office Application Startup',
    reference: 'https://attack.mitre.org/techniques/T1137',
    tactics: 'persistence',
    value: 'officeApplicationStartup',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.officeTemplateMacrosDescription',
      { defaultMessage: 'Office Template Macros (T1137.001)' }
    ),
    id: 'T1137.001',
    name: 'Office Template Macros',
    reference: 'https://attack.mitre.org/techniques/T1137/001',
    tactics: 'persistence',
    value: 'officeTemplateMacros',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.officeTestDescription',
      { defaultMessage: 'Office Test (T1137.002)' }
    ),
    id: 'T1137.002',
    name: 'Office Test',
    reference: 'https://attack.mitre.org/techniques/T1137/002',
    tactics: 'persistence',
    value: 'officeTest',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.oneWayCommunicationDescription',
      { defaultMessage: 'One-Way Communication (T1102.003)' }
    ),
    id: 'T1102.003',
    name: 'One-Way Communication',
    reference: 'https://attack.mitre.org/techniques/T1102/003',
    tactics: 'command-and-control',
    value: 'oneWayCommunication',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.outlookFormsDescription',
      { defaultMessage: 'Outlook Forms (T1137.003)' }
    ),
    id: 'T1137.003',
    name: 'Outlook Forms',
    reference: 'https://attack.mitre.org/techniques/T1137/003',
    tactics: 'persistence',
    value: 'outlookForms',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.outlookHomePageDescription',
      { defaultMessage: 'Outlook Home Page (T1137.004)' }
    ),
    id: 'T1137.004',
    name: 'Outlook Home Page',
    reference: 'https://attack.mitre.org/techniques/T1137/004',
    tactics: 'persistence',
    value: 'outlookHomePage',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.outlookRulesDescription',
      { defaultMessage: 'Outlook Rules (T1137.005)' }
    ),
    id: 'T1137.005',
    name: 'Outlook Rules',
    reference: 'https://attack.mitre.org/techniques/T1137/005',
    tactics: 'persistence',
    value: 'outlookRules',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.parentPidSpoofingDescription',
      { defaultMessage: 'Parent PID Spoofing (T1502)' }
    ),
    id: 'T1502',
    name: 'Parent PID Spoofing',
    reference: 'https://attack.mitre.org/techniques/T1502',
    tactics: '',
    value: 'parentPidSpoofing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.parentPidSpoofingDescription',
      { defaultMessage: 'Parent PID Spoofing (T1134.004)' }
    ),
    id: 'T1134.004',
    name: 'Parent PID Spoofing',
    reference: 'https://attack.mitre.org/techniques/T1134/004',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'parentPidSpoofing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.passTheHashDescription',
      { defaultMessage: 'Pass the Hash (T1075)' }
    ),
    id: 'T1075',
    name: 'Pass the Hash',
    reference: 'https://attack.mitre.org/techniques/T1075',
    tactics: '',
    value: 'passTheHash',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.passTheHashDescription',
      { defaultMessage: 'Pass the Hash (T1550.002)' }
    ),
    id: 'T1550.002',
    name: 'Pass the Hash',
    reference: 'https://attack.mitre.org/techniques/T1550/002',
    tactics: 'defense-evasion,lateral-movement',
    value: 'passTheHash',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.passTheTicketDescription',
      { defaultMessage: 'Pass the Ticket (T1097)' }
    ),
    id: 'T1097',
    name: 'Pass the Ticket',
    reference: 'https://attack.mitre.org/techniques/T1097',
    tactics: '',
    value: 'passTheTicket',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.passTheTicketDescription',
      { defaultMessage: 'Pass the Ticket (T1550.003)' }
    ),
    id: 'T1550.003',
    name: 'Pass the Ticket',
    reference: 'https://attack.mitre.org/techniques/T1550/003',
    tactics: 'defense-evasion,lateral-movement',
    value: 'passTheTicket',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.passwordCrackingDescription',
      { defaultMessage: 'Password Cracking (T1110.002)' }
    ),
    id: 'T1110.002',
    name: 'Password Cracking',
    reference: 'https://attack.mitre.org/techniques/T1110/002',
    tactics: 'credential-access',
    value: 'passwordCracking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.passwordFilterDllDescription',
      { defaultMessage: 'Password Filter DLL (T1174)' }
    ),
    id: 'T1174',
    name: 'Password Filter DLL',
    reference: 'https://attack.mitre.org/techniques/T1174',
    tactics: '',
    value: 'passwordFilterDll',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.passwordFilterDllDescription',
      { defaultMessage: 'Password Filter DLL (T1556.002)' }
    ),
    id: 'T1556.002',
    name: 'Password Filter DLL',
    reference: 'https://attack.mitre.org/techniques/T1556/002',
    tactics: 'credential-access,defense-evasion',
    value: 'passwordFilterDll',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.passwordGuessingDescription',
      { defaultMessage: 'Password Guessing (T1110.001)' }
    ),
    id: 'T1110.001',
    name: 'Password Guessing',
    reference: 'https://attack.mitre.org/techniques/T1110/001',
    tactics: 'credential-access',
    value: 'passwordGuessing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.passwordPolicyDiscoveryDescription',
      { defaultMessage: 'Password Policy Discovery (T1201)' }
    ),
    id: 'T1201',
    name: 'Password Policy Discovery',
    reference: 'https://attack.mitre.org/techniques/T1201',
    tactics: 'discovery',
    value: 'passwordPolicyDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.passwordSprayingDescription',
      { defaultMessage: 'Password Spraying (T1110.003)' }
    ),
    id: 'T1110.003',
    name: 'Password Spraying',
    reference: 'https://attack.mitre.org/techniques/T1110/003',
    tactics: 'credential-access',
    value: 'passwordSpraying',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.pathInterceptionDescription',
      { defaultMessage: 'Path Interception (T1034)' }
    ),
    id: 'T1034',
    name: 'Path Interception',
    reference: 'https://attack.mitre.org/techniques/T1034',
    tactics: 'persistence,privilege-escalation',
    value: 'pathInterception',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.pathInterceptionByPathEnvironmentVariableDescription',
      { defaultMessage: 'Path Interception by PATH Environment Variable (T1574.007)' }
    ),
    id: 'T1574.007',
    name: 'Path Interception by PATH Environment Variable',
    reference: 'https://attack.mitre.org/techniques/T1574/007',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    value: 'pathInterceptionByPathEnvironmentVariable',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.pathInterceptionBySearchOrderHijackingDescription',
      { defaultMessage: 'Path Interception by Search Order Hijacking (T1574.008)' }
    ),
    id: 'T1574.008',
    name: 'Path Interception by Search Order Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1574/008',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    value: 'pathInterceptionBySearchOrderHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.pathInterceptionByUnquotedPathDescription',
      { defaultMessage: 'Path Interception by Unquoted Path (T1574.009)' }
    ),
    id: 'T1574.009',
    name: 'Path Interception by Unquoted Path',
    reference: 'https://attack.mitre.org/techniques/T1574/009',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    value: 'pathInterceptionByUnquotedPath',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.peripheralDeviceDiscoveryDescription',
      { defaultMessage: 'Peripheral Device Discovery (T1120)' }
    ),
    id: 'T1120',
    name: 'Peripheral Device Discovery',
    reference: 'https://attack.mitre.org/techniques/T1120',
    tactics: 'discovery',
    value: 'peripheralDeviceDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.permissionGroupsDiscoveryDescription',
      { defaultMessage: 'Permission Groups Discovery (T1069)' }
    ),
    id: 'T1069',
    name: 'Permission Groups Discovery',
    reference: 'https://attack.mitre.org/techniques/T1069',
    tactics: 'discovery',
    value: 'permissionGroupsDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.phishingDescription',
      { defaultMessage: 'Phishing (T1566)' }
    ),
    id: 'T1566',
    name: 'Phishing',
    reference: 'https://attack.mitre.org/techniques/T1566',
    tactics: 'initial-access',
    value: 'phishing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.plistModificationDescription',
      { defaultMessage: 'Plist Modification (T1150)' }
    ),
    id: 'T1150',
    name: 'Plist Modification',
    reference: 'https://attack.mitre.org/techniques/T1150',
    tactics: '',
    value: 'plistModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.plistModificationDescription',
      { defaultMessage: 'Plist Modification (T1547.011)' }
    ),
    id: 'T1547.011',
    name: 'Plist Modification',
    reference: 'https://attack.mitre.org/techniques/T1547/011',
    tactics: 'persistence,privilege-escalation',
    value: 'plistModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.pluggableAuthenticationModulesDescription',
      { defaultMessage: 'Pluggable Authentication Modules (T1556.003)' }
    ),
    id: 'T1556.003',
    name: 'Pluggable Authentication Modules',
    reference: 'https://attack.mitre.org/techniques/T1556/003',
    tactics: 'credential-access,defense-evasion',
    value: 'pluggableAuthenticationModules',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.portKnockingDescription',
      { defaultMessage: 'Port Knocking (T1205.001)' }
    ),
    id: 'T1205.001',
    name: 'Port Knocking',
    reference: 'https://attack.mitre.org/techniques/T1205/001',
    tactics: 'defense-evasion,persistence,command-and-control',
    value: 'portKnocking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.portMonitorsDescription',
      { defaultMessage: 'Port Monitors (T1013)' }
    ),
    id: 'T1013',
    name: 'Port Monitors',
    reference: 'https://attack.mitre.org/techniques/T1013',
    tactics: '',
    value: 'portMonitors',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.portMonitorsDescription',
      { defaultMessage: 'Port Monitors (T1547.010)' }
    ),
    id: 'T1547.010',
    name: 'Port Monitors',
    reference: 'https://attack.mitre.org/techniques/T1547/010',
    tactics: 'persistence,privilege-escalation',
    value: 'portMonitors',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.portableExecutableInjectionDescription',
      { defaultMessage: 'Portable Executable Injection (T1055.002)' }
    ),
    id: 'T1055.002',
    name: 'Portable Executable Injection',
    reference: 'https://attack.mitre.org/techniques/T1055/002',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'portableExecutableInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.powerShellDescription',
      { defaultMessage: 'PowerShell (T1086)' }
    ),
    id: 'T1086',
    name: 'PowerShell',
    reference: 'https://attack.mitre.org/techniques/T1086',
    tactics: '',
    value: 'powerShell',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.powerShellDescription',
      { defaultMessage: 'PowerShell (T1059.001)' }
    ),
    id: 'T1059.001',
    name: 'PowerShell',
    reference: 'https://attack.mitre.org/techniques/T1059/001',
    tactics: 'execution',
    value: 'powerShell',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.powerShellProfileDescription',
      { defaultMessage: 'PowerShell Profile (T1504)' }
    ),
    id: 'T1504',
    name: 'PowerShell Profile',
    reference: 'https://attack.mitre.org/techniques/T1504',
    tactics: '',
    value: 'powerShellProfile',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.powerShellProfileDescription',
      { defaultMessage: 'PowerShell Profile (T1546.013)' }
    ),
    id: 'T1546.013',
    name: 'PowerShell Profile',
    reference: 'https://attack.mitre.org/techniques/T1546/013',
    tactics: 'privilege-escalation,persistence',
    value: 'powerShellProfile',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.preOsBootDescription',
      { defaultMessage: 'Pre-OS Boot (T1542)' }
    ),
    id: 'T1542',
    name: 'Pre-OS Boot',
    reference: 'https://attack.mitre.org/techniques/T1542',
    tactics: 'defense-evasion,persistence',
    value: 'preOsBoot',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.privateKeysDescription',
      { defaultMessage: 'Private Keys (T1145)' }
    ),
    id: 'T1145',
    name: 'Private Keys',
    reference: 'https://attack.mitre.org/techniques/T1145',
    tactics: '',
    value: 'privateKeys',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.privateKeysDescription',
      { defaultMessage: 'Private Keys (T1552.004)' }
    ),
    id: 'T1552.004',
    name: 'Private Keys',
    reference: 'https://attack.mitre.org/techniques/T1552/004',
    tactics: 'credential-access',
    value: 'privateKeys',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.procFilesystemDescription',
      { defaultMessage: 'Proc Filesystem (T1003.007)' }
    ),
    id: 'T1003.007',
    name: 'Proc Filesystem',
    reference: 'https://attack.mitre.org/techniques/T1003/007',
    tactics: 'credential-access',
    value: 'procFilesystem',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.procMemoryDescription',
      { defaultMessage: 'Proc Memory (T1055.009)' }
    ),
    id: 'T1055.009',
    name: 'Proc Memory',
    reference: 'https://attack.mitre.org/techniques/T1055/009',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'procMemory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.processDiscoveryDescription',
      { defaultMessage: 'Process Discovery (T1057)' }
    ),
    id: 'T1057',
    name: 'Process Discovery',
    reference: 'https://attack.mitre.org/techniques/T1057',
    tactics: 'discovery',
    value: 'processDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.processDoppelgangingDescription',
      { defaultMessage: 'Process Doppelgänging (T1186)' }
    ),
    id: 'T1186',
    name: 'Process Doppelgänging',
    reference: 'https://attack.mitre.org/techniques/T1186',
    tactics: '',
    value: 'processDoppelganging',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.processDoppelgangingDescription',
      { defaultMessage: 'Process Doppelgänging (T1055.013)' }
    ),
    id: 'T1055.013',
    name: 'Process Doppelgänging',
    reference: 'https://attack.mitre.org/techniques/T1055/013',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'processDoppelganging',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.processHollowingDescription',
      { defaultMessage: 'Process Hollowing (T1093)' }
    ),
    id: 'T1093',
    name: 'Process Hollowing',
    reference: 'https://attack.mitre.org/techniques/T1093',
    tactics: '',
    value: 'processHollowing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.processHollowingDescription',
      { defaultMessage: 'Process Hollowing (T1055.012)' }
    ),
    id: 'T1055.012',
    name: 'Process Hollowing',
    reference: 'https://attack.mitre.org/techniques/T1055/012',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'processHollowing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.processInjectionDescription',
      { defaultMessage: 'Process Injection (T1055)' }
    ),
    id: 'T1055',
    name: 'Process Injection',
    reference: 'https://attack.mitre.org/techniques/T1055',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'processInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.protocolImpersonationDescription',
      { defaultMessage: 'Protocol Impersonation (T1001.003)' }
    ),
    id: 'T1001.003',
    name: 'Protocol Impersonation',
    reference: 'https://attack.mitre.org/techniques/T1001/003',
    tactics: 'command-and-control',
    value: 'protocolImpersonation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.protocolTunnelingDescription',
      { defaultMessage: 'Protocol Tunneling (T1572)' }
    ),
    id: 'T1572',
    name: 'Protocol Tunneling',
    reference: 'https://attack.mitre.org/techniques/T1572',
    tactics: 'command-and-control',
    value: 'protocolTunneling',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.proxyDescription',
      { defaultMessage: 'Proxy (T1090)' }
    ),
    id: 'T1090',
    name: 'Proxy',
    reference: 'https://attack.mitre.org/techniques/T1090',
    tactics: 'command-and-control',
    value: 'proxy',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.ptraceSystemCallsDescription',
      { defaultMessage: 'Ptrace System Calls (T1055.008)' }
    ),
    id: 'T1055.008',
    name: 'Ptrace System Calls',
    reference: 'https://attack.mitre.org/techniques/T1055/008',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'ptraceSystemCalls',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.pubPrnDescription',
      { defaultMessage: 'PubPrn (T1216.001)' }
    ),
    id: 'T1216.001',
    name: 'PubPrn',
    reference: 'https://attack.mitre.org/techniques/T1216/001',
    tactics: 'defense-evasion',
    value: 'pubPrn',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.pythonDescription',
      { defaultMessage: 'Python (T1059.006)' }
    ),
    id: 'T1059.006',
    name: 'Python',
    reference: 'https://attack.mitre.org/techniques/T1059/006',
    tactics: 'execution',
    value: 'python',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.queryRegistryDescription',
      { defaultMessage: 'Query Registry (T1012)' }
    ),
    id: 'T1012',
    name: 'Query Registry',
    reference: 'https://attack.mitre.org/techniques/T1012',
    tactics: 'discovery',
    value: 'queryRegistry',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.rdpHijackingDescription',
      { defaultMessage: 'RDP Hijacking (T1563.002)' }
    ),
    id: 'T1563.002',
    name: 'RDP Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1563/002',
    tactics: 'lateral-movement',
    value: 'rdpHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.rcCommonDescription',
      { defaultMessage: 'Rc.common (T1163)' }
    ),
    id: 'T1163',
    name: 'Rc.common',
    reference: 'https://attack.mitre.org/techniques/T1163',
    tactics: '',
    value: 'rcCommon',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.rcCommonDescription',
      { defaultMessage: 'Rc.common (T1037.004)' }
    ),
    id: 'T1037.004',
    name: 'Rc.common',
    reference: 'https://attack.mitre.org/techniques/T1037/004',
    tactics: 'persistence,privilege-escalation',
    value: 'rcCommon',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.reOpenedApplicationsDescription',
      { defaultMessage: 'Re-opened Applications (T1164)' }
    ),
    id: 'T1164',
    name: 'Re-opened Applications',
    reference: 'https://attack.mitre.org/techniques/T1164',
    tactics: '',
    value: 'reOpenedApplications',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.reOpenedApplicationsDescription',
      { defaultMessage: 'Re-opened Applications (T1547.007)' }
    ),
    id: 'T1547.007',
    name: 'Re-opened Applications',
    reference: 'https://attack.mitre.org/techniques/T1547/007',
    tactics: 'persistence,privilege-escalation',
    value: 'reOpenedApplications',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.redundantAccessDescription',
      { defaultMessage: 'Redundant Access (T1108)' }
    ),
    id: 'T1108',
    name: 'Redundant Access',
    reference: 'https://attack.mitre.org/techniques/T1108',
    tactics: 'defense-evasion,persistence',
    value: 'redundantAccess',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.reflectionAmplificationDescription',
      { defaultMessage: 'Reflection Amplification (T1498.002)' }
    ),
    id: 'T1498.002',
    name: 'Reflection Amplification',
    reference: 'https://attack.mitre.org/techniques/T1498/002',
    tactics: 'impact',
    value: 'reflectionAmplification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.registryRunKeysStartupFolderDescription',
      { defaultMessage: 'Registry Run Keys / Startup Folder (T1060)' }
    ),
    id: 'T1060',
    name: 'Registry Run Keys / Startup Folder',
    reference: 'https://attack.mitre.org/techniques/T1060',
    tactics: '',
    value: 'registryRunKeysStartupFolder',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.registryRunKeysStartupFolderDescription',
      { defaultMessage: 'Registry Run Keys / Startup Folder (T1547.001)' }
    ),
    id: 'T1547.001',
    name: 'Registry Run Keys / Startup Folder',
    reference: 'https://attack.mitre.org/techniques/T1547/001',
    tactics: 'persistence,privilege-escalation',
    value: 'registryRunKeysStartupFolder',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.regsvcsRegasmDescription',
      { defaultMessage: 'Regsvcs/Regasm (T1121)' }
    ),
    id: 'T1121',
    name: 'Regsvcs/Regasm',
    reference: 'https://attack.mitre.org/techniques/T1121',
    tactics: '',
    value: 'regsvcsRegasm',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.regsvcsRegasmDescription',
      { defaultMessage: 'Regsvcs/Regasm (T1218.009)' }
    ),
    id: 'T1218.009',
    name: 'Regsvcs/Regasm',
    reference: 'https://attack.mitre.org/techniques/T1218/009',
    tactics: 'defense-evasion',
    value: 'regsvcsRegasm',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.regsvr32Description',
      { defaultMessage: 'Regsvr32 (T1117)' }
    ),
    id: 'T1117',
    name: 'Regsvr32',
    reference: 'https://attack.mitre.org/techniques/T1117',
    tactics: '',
    value: 'regsvr32',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.regsvr32Description',
      { defaultMessage: 'Regsvr32 (T1218.010)' }
    ),
    id: 'T1218.010',
    name: 'Regsvr32',
    reference: 'https://attack.mitre.org/techniques/T1218/010',
    tactics: 'defense-evasion',
    value: 'regsvr32',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.remoteAccessSoftwareDescription',
      { defaultMessage: 'Remote Access Software (T1219)' }
    ),
    id: 'T1219',
    name: 'Remote Access Software',
    reference: 'https://attack.mitre.org/techniques/T1219',
    tactics: 'command-and-control',
    value: 'remoteAccessSoftware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.remoteDataStagingDescription',
      { defaultMessage: 'Remote Data Staging (T1074.002)' }
    ),
    id: 'T1074.002',
    name: 'Remote Data Staging',
    reference: 'https://attack.mitre.org/techniques/T1074/002',
    tactics: 'collection',
    value: 'remoteDataStaging',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.remoteDesktopProtocolDescription',
      { defaultMessage: 'Remote Desktop Protocol (T1076)' }
    ),
    id: 'T1076',
    name: 'Remote Desktop Protocol',
    reference: 'https://attack.mitre.org/techniques/T1076',
    tactics: '',
    value: 'remoteDesktopProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.remoteDesktopProtocolDescription',
      { defaultMessage: 'Remote Desktop Protocol (T1021.001)' }
    ),
    id: 'T1021.001',
    name: 'Remote Desktop Protocol',
    reference: 'https://attack.mitre.org/techniques/T1021/001',
    tactics: 'lateral-movement',
    value: 'remoteDesktopProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.remoteEmailCollectionDescription',
      { defaultMessage: 'Remote Email Collection (T1114.002)' }
    ),
    id: 'T1114.002',
    name: 'Remote Email Collection',
    reference: 'https://attack.mitre.org/techniques/T1114/002',
    tactics: 'collection',
    value: 'remoteEmailCollection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.remoteServiceSessionHijackingDescription',
      { defaultMessage: 'Remote Service Session Hijacking (T1563)' }
    ),
    id: 'T1563',
    name: 'Remote Service Session Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1563',
    tactics: 'lateral-movement',
    value: 'remoteServiceSessionHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.remoteServicesDescription',
      { defaultMessage: 'Remote Services (T1021)' }
    ),
    id: 'T1021',
    name: 'Remote Services',
    reference: 'https://attack.mitre.org/techniques/T1021',
    tactics: 'lateral-movement',
    value: 'remoteServices',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.remoteSystemDiscoveryDescription',
      { defaultMessage: 'Remote System Discovery (T1018)' }
    ),
    id: 'T1018',
    name: 'Remote System Discovery',
    reference: 'https://attack.mitre.org/techniques/T1018',
    tactics: 'discovery',
    value: 'remoteSystemDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.renameSystemUtilitiesDescription',
      { defaultMessage: 'Rename System Utilities (T1036.003)' }
    ),
    id: 'T1036.003',
    name: 'Rename System Utilities',
    reference: 'https://attack.mitre.org/techniques/T1036/003',
    tactics: 'defense-evasion',
    value: 'renameSystemUtilities',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.replicationThroughRemovableMediaDescription',
      { defaultMessage: 'Replication Through Removable Media (T1091)' }
    ),
    id: 'T1091',
    name: 'Replication Through Removable Media',
    reference: 'https://attack.mitre.org/techniques/T1091',
    tactics: 'lateral-movement,initial-access',
    value: 'replicationThroughRemovableMedia',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.resourceHijackingDescription',
      { defaultMessage: 'Resource Hijacking (T1496)' }
    ),
    id: 'T1496',
    name: 'Resource Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1496',
    tactics: 'impact',
    value: 'resourceHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.revertCloudInstanceDescription',
      { defaultMessage: 'Revert Cloud Instance (T1536)' }
    ),
    id: 'T1536',
    name: 'Revert Cloud Instance',
    reference: 'https://attack.mitre.org/techniques/T1536',
    tactics: '',
    value: 'revertCloudInstance',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.revertCloudInstanceDescription',
      { defaultMessage: 'Revert Cloud Instance (T1578.004)' }
    ),
    id: 'T1578.004',
    name: 'Revert Cloud Instance',
    reference: 'https://attack.mitre.org/techniques/T1578/004',
    tactics: 'defense-evasion',
    value: 'revertCloudInstance',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.rightToLeftOverrideDescription',
      { defaultMessage: 'Right-to-Left Override (T1036.002)' }
    ),
    id: 'T1036.002',
    name: 'Right-to-Left Override',
    reference: 'https://attack.mitre.org/techniques/T1036/002',
    tactics: 'defense-evasion',
    value: 'rightToLeftOverride',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.rogueDomainControllerDescription',
      { defaultMessage: 'Rogue Domain Controller (T1207)' }
    ),
    id: 'T1207',
    name: 'Rogue Domain Controller',
    reference: 'https://attack.mitre.org/techniques/T1207',
    tactics: 'defense-evasion',
    value: 'rogueDomainController',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.rootkitDescription',
      { defaultMessage: 'Rootkit (T1014)' }
    ),
    id: 'T1014',
    name: 'Rootkit',
    reference: 'https://attack.mitre.org/techniques/T1014',
    tactics: 'defense-evasion',
    value: 'rootkit',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.runVirtualInstanceDescription',
      { defaultMessage: 'Run Virtual Instance (T1564.006)' }
    ),
    id: 'T1564.006',
    name: 'Run Virtual Instance',
    reference: 'https://attack.mitre.org/techniques/T1564/006',
    tactics: 'defense-evasion',
    value: 'runVirtualInstance',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.rundll32Description',
      { defaultMessage: 'Rundll32 (T1085)' }
    ),
    id: 'T1085',
    name: 'Rundll32',
    reference: 'https://attack.mitre.org/techniques/T1085',
    tactics: '',
    value: 'rundll32',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.rundll32Description',
      { defaultMessage: 'Rundll32 (T1218.011)' }
    ),
    id: 'T1218.011',
    name: 'Rundll32',
    reference: 'https://attack.mitre.org/techniques/T1218/011',
    tactics: 'defense-evasion',
    value: 'rundll32',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.runtimeDataManipulationDescription',
      { defaultMessage: 'Runtime Data Manipulation (T1494)' }
    ),
    id: 'T1494',
    name: 'Runtime Data Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1494',
    tactics: '',
    value: 'runtimeDataManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.runtimeDataManipulationDescription',
      { defaultMessage: 'Runtime Data Manipulation (T1565.003)' }
    ),
    id: 'T1565.003',
    name: 'Runtime Data Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1565/003',
    tactics: 'impact',
    value: 'runtimeDataManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sidHistoryInjectionDescription',
      { defaultMessage: 'SID-History Injection (T1178)' }
    ),
    id: 'T1178',
    name: 'SID-History Injection',
    reference: 'https://attack.mitre.org/techniques/T1178',
    tactics: '',
    value: 'sidHistoryInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sidHistoryInjectionDescription',
      { defaultMessage: 'SID-History Injection (T1134.005)' }
    ),
    id: 'T1134.005',
    name: 'SID-History Injection',
    reference: 'https://attack.mitre.org/techniques/T1134/005',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'sidHistoryInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sipAndTrustProviderHijackingDescription',
      { defaultMessage: 'SIP and Trust Provider Hijacking (T1198)' }
    ),
    id: 'T1198',
    name: 'SIP and Trust Provider Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1198',
    tactics: '',
    value: 'sipAndTrustProviderHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sipAndTrustProviderHijackingDescription',
      { defaultMessage: 'SIP and Trust Provider Hijacking (T1553.003)' }
    ),
    id: 'T1553.003',
    name: 'SIP and Trust Provider Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1553/003',
    tactics: 'defense-evasion',
    value: 'sipAndTrustProviderHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.smbWindowsAdminSharesDescription',
      { defaultMessage: 'SMB/Windows Admin Shares (T1021.002)' }
    ),
    id: 'T1021.002',
    name: 'SMB/Windows Admin Shares',
    reference: 'https://attack.mitre.org/techniques/T1021/002',
    tactics: 'lateral-movement',
    value: 'smbWindowsAdminShares',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sqlStoredProceduresDescription',
      { defaultMessage: 'SQL Stored Procedures (T1505.001)' }
    ),
    id: 'T1505.001',
    name: 'SQL Stored Procedures',
    reference: 'https://attack.mitre.org/techniques/T1505/001',
    tactics: 'persistence',
    value: 'sqlStoredProcedures',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sshDescription',
      { defaultMessage: 'SSH (T1021.004)' }
    ),
    id: 'T1021.004',
    name: 'SSH',
    reference: 'https://attack.mitre.org/techniques/T1021/004',
    tactics: 'lateral-movement',
    value: 'ssh',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sshAuthorizedKeysDescription',
      { defaultMessage: 'SSH Authorized Keys (T1098.004)' }
    ),
    id: 'T1098.004',
    name: 'SSH Authorized Keys',
    reference: 'https://attack.mitre.org/techniques/T1098/004',
    tactics: 'persistence',
    value: 'sshAuthorizedKeys',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sshHijackingDescription',
      { defaultMessage: 'SSH Hijacking (T1184)' }
    ),
    id: 'T1184',
    name: 'SSH Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1184',
    tactics: '',
    value: 'sshHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sshHijackingDescription',
      { defaultMessage: 'SSH Hijacking (T1563.001)' }
    ),
    id: 'T1563.001',
    name: 'SSH Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1563/001',
    tactics: 'lateral-movement',
    value: 'sshHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.scheduledTaskDescription',
      { defaultMessage: 'Scheduled Task (T1053.005)' }
    ),
    id: 'T1053.005',
    name: 'Scheduled Task',
    reference: 'https://attack.mitre.org/techniques/T1053/005',
    tactics: 'execution,persistence,privilege-escalation',
    value: 'scheduledTask',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.scheduledTaskJobDescription',
      { defaultMessage: 'Scheduled Task/Job (T1053)' }
    ),
    id: 'T1053',
    name: 'Scheduled Task/Job',
    reference: 'https://attack.mitre.org/techniques/T1053',
    tactics: 'execution,persistence,privilege-escalation',
    value: 'scheduledTaskJob',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.scheduledTransferDescription',
      { defaultMessage: 'Scheduled Transfer (T1029)' }
    ),
    id: 'T1029',
    name: 'Scheduled Transfer',
    reference: 'https://attack.mitre.org/techniques/T1029',
    tactics: 'exfiltration',
    value: 'scheduledTransfer',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.screenCaptureDescription',
      { defaultMessage: 'Screen Capture (T1113)' }
    ),
    id: 'T1113',
    name: 'Screen Capture',
    reference: 'https://attack.mitre.org/techniques/T1113',
    tactics: 'collection',
    value: 'screenCapture',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.screensaverDescription',
      { defaultMessage: 'Screensaver (T1180)' }
    ),
    id: 'T1180',
    name: 'Screensaver',
    reference: 'https://attack.mitre.org/techniques/T1180',
    tactics: '',
    value: 'screensaver',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.screensaverDescription',
      { defaultMessage: 'Screensaver (T1546.002)' }
    ),
    id: 'T1546.002',
    name: 'Screensaver',
    reference: 'https://attack.mitre.org/techniques/T1546/002',
    tactics: 'privilege-escalation,persistence',
    value: 'screensaver',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.scriptingDescription',
      { defaultMessage: 'Scripting (T1064)' }
    ),
    id: 'T1064',
    name: 'Scripting',
    reference: 'https://attack.mitre.org/techniques/T1064',
    tactics: 'defense-evasion,execution',
    value: 'scripting',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.securityAccountManagerDescription',
      { defaultMessage: 'Security Account Manager (T1003.002)' }
    ),
    id: 'T1003.002',
    name: 'Security Account Manager',
    reference: 'https://attack.mitre.org/techniques/T1003/002',
    tactics: 'credential-access',
    value: 'securityAccountManager',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.securitySoftwareDiscoveryDescription',
      { defaultMessage: 'Security Software Discovery (T1063)' }
    ),
    id: 'T1063',
    name: 'Security Software Discovery',
    reference: 'https://attack.mitre.org/techniques/T1063',
    tactics: '',
    value: 'securitySoftwareDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.securitySoftwareDiscoveryDescription',
      { defaultMessage: 'Security Software Discovery (T1518.001)' }
    ),
    id: 'T1518.001',
    name: 'Security Software Discovery',
    reference: 'https://attack.mitre.org/techniques/T1518/001',
    tactics: 'discovery',
    value: 'securitySoftwareDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.securitySupportProviderDescription',
      { defaultMessage: 'Security Support Provider (T1101)' }
    ),
    id: 'T1101',
    name: 'Security Support Provider',
    reference: 'https://attack.mitre.org/techniques/T1101',
    tactics: '',
    value: 'securitySupportProvider',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.securitySupportProviderDescription',
      { defaultMessage: 'Security Support Provider (T1547.005)' }
    ),
    id: 'T1547.005',
    name: 'Security Support Provider',
    reference: 'https://attack.mitre.org/techniques/T1547/005',
    tactics: 'persistence,privilege-escalation',
    value: 'securitySupportProvider',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.securitydMemoryDescription',
      { defaultMessage: 'Securityd Memory (T1167)' }
    ),
    id: 'T1167',
    name: 'Securityd Memory',
    reference: 'https://attack.mitre.org/techniques/T1167',
    tactics: '',
    value: 'securitydMemory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.securitydMemoryDescription',
      { defaultMessage: 'Securityd Memory (T1555.002)' }
    ),
    id: 'T1555.002',
    name: 'Securityd Memory',
    reference: 'https://attack.mitre.org/techniques/T1555/002',
    tactics: 'credential-access',
    value: 'securitydMemory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.serverSoftwareComponentDescription',
      { defaultMessage: 'Server Software Component (T1505)' }
    ),
    id: 'T1505',
    name: 'Server Software Component',
    reference: 'https://attack.mitre.org/techniques/T1505',
    tactics: 'persistence',
    value: 'serverSoftwareComponent',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.serviceExecutionDescription',
      { defaultMessage: 'Service Execution (T1035)' }
    ),
    id: 'T1035',
    name: 'Service Execution',
    reference: 'https://attack.mitre.org/techniques/T1035',
    tactics: '',
    value: 'serviceExecution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.serviceExecutionDescription',
      { defaultMessage: 'Service Execution (T1569.002)' }
    ),
    id: 'T1569.002',
    name: 'Service Execution',
    reference: 'https://attack.mitre.org/techniques/T1569/002',
    tactics: 'execution',
    value: 'serviceExecution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.serviceExhaustionFloodDescription',
      { defaultMessage: 'Service Exhaustion Flood (T1499.002)' }
    ),
    id: 'T1499.002',
    name: 'Service Exhaustion Flood',
    reference: 'https://attack.mitre.org/techniques/T1499/002',
    tactics: 'impact',
    value: 'serviceExhaustionFlood',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.serviceRegistryPermissionsWeaknessDescription',
      { defaultMessage: 'Service Registry Permissions Weakness (T1058)' }
    ),
    id: 'T1058',
    name: 'Service Registry Permissions Weakness',
    reference: 'https://attack.mitre.org/techniques/T1058',
    tactics: '',
    value: 'serviceRegistryPermissionsWeakness',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.serviceStopDescription',
      { defaultMessage: 'Service Stop (T1489)' }
    ),
    id: 'T1489',
    name: 'Service Stop',
    reference: 'https://attack.mitre.org/techniques/T1489',
    tactics: 'impact',
    value: 'serviceStop',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.servicesFilePermissionsWeaknessDescription',
      { defaultMessage: 'Services File Permissions Weakness (T1574.010)' }
    ),
    id: 'T1574.010',
    name: 'Services File Permissions Weakness',
    reference: 'https://attack.mitre.org/techniques/T1574/010',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    value: 'servicesFilePermissionsWeakness',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.servicesRegistryPermissionsWeaknessDescription',
      { defaultMessage: 'Services Registry Permissions Weakness (T1574.011)' }
    ),
    id: 'T1574.011',
    name: 'Services Registry Permissions Weakness',
    reference: 'https://attack.mitre.org/techniques/T1574/011',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    value: 'servicesRegistryPermissionsWeakness',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.setuidAndSetgidDescription',
      { defaultMessage: 'Setuid and Setgid (T1166)' }
    ),
    id: 'T1166',
    name: 'Setuid and Setgid',
    reference: 'https://attack.mitre.org/techniques/T1166',
    tactics: '',
    value: 'setuidAndSetgid',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.setuidAndSetgidDescription',
      { defaultMessage: 'Setuid and Setgid (T1548.001)' }
    ),
    id: 'T1548.001',
    name: 'Setuid and Setgid',
    reference: 'https://attack.mitre.org/techniques/T1548/001',
    tactics: 'privilege-escalation,defense-evasion',
    value: 'setuidAndSetgid',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sharedModulesDescription',
      { defaultMessage: 'Shared Modules (T1129)' }
    ),
    id: 'T1129',
    name: 'Shared Modules',
    reference: 'https://attack.mitre.org/techniques/T1129',
    tactics: 'execution',
    value: 'sharedModules',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sharedWebrootDescription',
      { defaultMessage: 'Shared Webroot (T1051)' }
    ),
    id: 'T1051',
    name: 'Shared Webroot',
    reference: 'https://attack.mitre.org/techniques/T1051',
    tactics: 'lateral-movement',
    value: 'sharedWebroot',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sharepointDescription',
      { defaultMessage: 'Sharepoint (T1213.002)' }
    ),
    id: 'T1213.002',
    name: 'Sharepoint',
    reference: 'https://attack.mitre.org/techniques/T1213/002',
    tactics: 'collection',
    value: 'sharepoint',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.shortcutModificationDescription',
      { defaultMessage: 'Shortcut Modification (T1023)' }
    ),
    id: 'T1023',
    name: 'Shortcut Modification',
    reference: 'https://attack.mitre.org/techniques/T1023',
    tactics: '',
    value: 'shortcutModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.shortcutModificationDescription',
      { defaultMessage: 'Shortcut Modification (T1547.009)' }
    ),
    id: 'T1547.009',
    name: 'Shortcut Modification',
    reference: 'https://attack.mitre.org/techniques/T1547/009',
    tactics: 'persistence,privilege-escalation',
    value: 'shortcutModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.signedBinaryProxyExecutionDescription',
      { defaultMessage: 'Signed Binary Proxy Execution (T1218)' }
    ),
    id: 'T1218',
    name: 'Signed Binary Proxy Execution',
    reference: 'https://attack.mitre.org/techniques/T1218',
    tactics: 'defense-evasion',
    value: 'signedBinaryProxyExecution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.signedScriptProxyExecutionDescription',
      { defaultMessage: 'Signed Script Proxy Execution (T1216)' }
    ),
    id: 'T1216',
    name: 'Signed Script Proxy Execution',
    reference: 'https://attack.mitre.org/techniques/T1216',
    tactics: 'defense-evasion',
    value: 'signedScriptProxyExecution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.silverTicketDescription',
      { defaultMessage: 'Silver Ticket (T1558.002)' }
    ),
    id: 'T1558.002',
    name: 'Silver Ticket',
    reference: 'https://attack.mitre.org/techniques/T1558/002',
    tactics: 'credential-access',
    value: 'silverTicket',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.softwareDeploymentToolsDescription',
      { defaultMessage: 'Software Deployment Tools (T1072)' }
    ),
    id: 'T1072',
    name: 'Software Deployment Tools',
    reference: 'https://attack.mitre.org/techniques/T1072',
    tactics: 'execution,lateral-movement',
    value: 'softwareDeploymentTools',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.softwareDiscoveryDescription',
      { defaultMessage: 'Software Discovery (T1518)' }
    ),
    id: 'T1518',
    name: 'Software Discovery',
    reference: 'https://attack.mitre.org/techniques/T1518',
    tactics: 'discovery',
    value: 'softwareDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.softwarePackingDescription',
      { defaultMessage: 'Software Packing (T1045)' }
    ),
    id: 'T1045',
    name: 'Software Packing',
    reference: 'https://attack.mitre.org/techniques/T1045',
    tactics: '',
    value: 'softwarePacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.softwarePackingDescription',
      { defaultMessage: 'Software Packing (T1027.002)' }
    ),
    id: 'T1027.002',
    name: 'Software Packing',
    reference: 'https://attack.mitre.org/techniques/T1027/002',
    tactics: 'defense-evasion',
    value: 'softwarePacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sourceDescription',
      { defaultMessage: 'Source (T1153)' }
    ),
    id: 'T1153',
    name: 'Source',
    reference: 'https://attack.mitre.org/techniques/T1153',
    tactics: 'execution',
    value: 'source',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.spaceAfterFilenameDescription',
      { defaultMessage: 'Space after Filename (T1151)' }
    ),
    id: 'T1151',
    name: 'Space after Filename',
    reference: 'https://attack.mitre.org/techniques/T1151',
    tactics: '',
    value: 'spaceAfterFilename',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.spaceAfterFilenameDescription',
      { defaultMessage: 'Space after Filename (T1036.006)' }
    ),
    id: 'T1036.006',
    name: 'Space after Filename',
    reference: 'https://attack.mitre.org/techniques/T1036/006',
    tactics: 'defense-evasion',
    value: 'spaceAfterFilename',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.spearphishingAttachmentDescription',
      { defaultMessage: 'Spearphishing Attachment (T1193)' }
    ),
    id: 'T1193',
    name: 'Spearphishing Attachment',
    reference: 'https://attack.mitre.org/techniques/T1193',
    tactics: '',
    value: 'spearphishingAttachment',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.spearphishingAttachmentDescription',
      { defaultMessage: 'Spearphishing Attachment (T1566.001)' }
    ),
    id: 'T1566.001',
    name: 'Spearphishing Attachment',
    reference: 'https://attack.mitre.org/techniques/T1566/001',
    tactics: 'initial-access',
    value: 'spearphishingAttachment',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.spearphishingLinkDescription',
      { defaultMessage: 'Spearphishing Link (T1192)' }
    ),
    id: 'T1192',
    name: 'Spearphishing Link',
    reference: 'https://attack.mitre.org/techniques/T1192',
    tactics: '',
    value: 'spearphishingLink',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.spearphishingLinkDescription',
      { defaultMessage: 'Spearphishing Link (T1566.002)' }
    ),
    id: 'T1566.002',
    name: 'Spearphishing Link',
    reference: 'https://attack.mitre.org/techniques/T1566/002',
    tactics: 'initial-access',
    value: 'spearphishingLink',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.spearphishingViaServiceDescription',
      { defaultMessage: 'Spearphishing via Service (T1194)' }
    ),
    id: 'T1194',
    name: 'Spearphishing via Service',
    reference: 'https://attack.mitre.org/techniques/T1194',
    tactics: '',
    value: 'spearphishingViaService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.spearphishingViaServiceDescription',
      { defaultMessage: 'Spearphishing via Service (T1566.003)' }
    ),
    id: 'T1566.003',
    name: 'Spearphishing via Service',
    reference: 'https://attack.mitre.org/techniques/T1566/003',
    tactics: 'initial-access',
    value: 'spearphishingViaService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.standardCryptographicProtocolDescription',
      { defaultMessage: 'Standard Cryptographic Protocol (T1032)' }
    ),
    id: 'T1032',
    name: 'Standard Cryptographic Protocol',
    reference: 'https://attack.mitre.org/techniques/T1032',
    tactics: '',
    value: 'standardCryptographicProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.standardEncodingDescription',
      { defaultMessage: 'Standard Encoding (T1132.001)' }
    ),
    id: 'T1132.001',
    name: 'Standard Encoding',
    reference: 'https://attack.mitre.org/techniques/T1132/001',
    tactics: 'command-and-control',
    value: 'standardEncoding',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.startupItemsDescription',
      { defaultMessage: 'Startup Items (T1165)' }
    ),
    id: 'T1165',
    name: 'Startup Items',
    reference: 'https://attack.mitre.org/techniques/T1165',
    tactics: '',
    value: 'startupItems',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.startupItemsDescription',
      { defaultMessage: 'Startup Items (T1037.005)' }
    ),
    id: 'T1037.005',
    name: 'Startup Items',
    reference: 'https://attack.mitre.org/techniques/T1037/005',
    tactics: 'persistence,privilege-escalation',
    value: 'startupItems',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.stealApplicationAccessTokenDescription',
      { defaultMessage: 'Steal Application Access Token (T1528)' }
    ),
    id: 'T1528',
    name: 'Steal Application Access Token',
    reference: 'https://attack.mitre.org/techniques/T1528',
    tactics: 'credential-access',
    value: 'stealApplicationAccessToken',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.stealWebSessionCookieDescription',
      { defaultMessage: 'Steal Web Session Cookie (T1539)' }
    ),
    id: 'T1539',
    name: 'Steal Web Session Cookie',
    reference: 'https://attack.mitre.org/techniques/T1539',
    tactics: 'credential-access',
    value: 'stealWebSessionCookie',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.stealOrForgeKerberosTicketsDescription',
      { defaultMessage: 'Steal or Forge Kerberos Tickets (T1558)' }
    ),
    id: 'T1558',
    name: 'Steal or Forge Kerberos Tickets',
    reference: 'https://attack.mitre.org/techniques/T1558',
    tactics: 'credential-access',
    value: 'stealOrForgeKerberosTickets',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.steganographyDescription',
      { defaultMessage: 'Steganography (T1027.003)' }
    ),
    id: 'T1027.003',
    name: 'Steganography',
    reference: 'https://attack.mitre.org/techniques/T1027/003',
    tactics: 'defense-evasion',
    value: 'steganography',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.steganographyDescription',
      { defaultMessage: 'Steganography (T1001.002)' }
    ),
    id: 'T1001.002',
    name: 'Steganography',
    reference: 'https://attack.mitre.org/techniques/T1001/002',
    tactics: 'command-and-control',
    value: 'steganography',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.storedDataManipulationDescription',
      { defaultMessage: 'Stored Data Manipulation (T1492)' }
    ),
    id: 'T1492',
    name: 'Stored Data Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1492',
    tactics: '',
    value: 'storedDataManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.storedDataManipulationDescription',
      { defaultMessage: 'Stored Data Manipulation (T1565.001)' }
    ),
    id: 'T1565.001',
    name: 'Stored Data Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1565/001',
    tactics: 'impact',
    value: 'storedDataManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.subvertTrustControlsDescription',
      { defaultMessage: 'Subvert Trust Controls (T1553)' }
    ),
    id: 'T1553',
    name: 'Subvert Trust Controls',
    reference: 'https://attack.mitre.org/techniques/T1553',
    tactics: 'defense-evasion',
    value: 'subvertTrustControls',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sudoDescription',
      { defaultMessage: 'Sudo (T1169)' }
    ),
    id: 'T1169',
    name: 'Sudo',
    reference: 'https://attack.mitre.org/techniques/T1169',
    tactics: '',
    value: 'sudo',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sudoCachingDescription',
      { defaultMessage: 'Sudo Caching (T1206)' }
    ),
    id: 'T1206',
    name: 'Sudo Caching',
    reference: 'https://attack.mitre.org/techniques/T1206',
    tactics: '',
    value: 'sudoCaching',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sudoAndSudoCachingDescription',
      { defaultMessage: 'Sudo and Sudo Caching (T1548.003)' }
    ),
    id: 'T1548.003',
    name: 'Sudo and Sudo Caching',
    reference: 'https://attack.mitre.org/techniques/T1548/003',
    tactics: 'privilege-escalation,defense-evasion',
    value: 'sudoAndSudoCaching',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.supplyChainCompromiseDescription',
      { defaultMessage: 'Supply Chain Compromise (T1195)' }
    ),
    id: 'T1195',
    name: 'Supply Chain Compromise',
    reference: 'https://attack.mitre.org/techniques/T1195',
    tactics: 'initial-access',
    value: 'supplyChainCompromise',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.symmetricCryptographyDescription',
      { defaultMessage: 'Symmetric Cryptography (T1573.001)' }
    ),
    id: 'T1573.001',
    name: 'Symmetric Cryptography',
    reference: 'https://attack.mitre.org/techniques/T1573/001',
    tactics: 'command-and-control',
    value: 'symmetricCryptography',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemChecksDescription',
      { defaultMessage: 'System Checks (T1497.001)' }
    ),
    id: 'T1497.001',
    name: 'System Checks',
    reference: 'https://attack.mitre.org/techniques/T1497/001',
    tactics: 'defense-evasion,discovery',
    value: 'systemChecks',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemFirmwareDescription',
      { defaultMessage: 'System Firmware (T1019)' }
    ),
    id: 'T1019',
    name: 'System Firmware',
    reference: 'https://attack.mitre.org/techniques/T1019',
    tactics: '',
    value: 'systemFirmware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemFirmwareDescription',
      { defaultMessage: 'System Firmware (T1542.001)' }
    ),
    id: 'T1542.001',
    name: 'System Firmware',
    reference: 'https://attack.mitre.org/techniques/T1542/001',
    tactics: 'persistence,defense-evasion',
    value: 'systemFirmware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemInformationDiscoveryDescription',
      { defaultMessage: 'System Information Discovery (T1082)' }
    ),
    id: 'T1082',
    name: 'System Information Discovery',
    reference: 'https://attack.mitre.org/techniques/T1082',
    tactics: 'discovery',
    value: 'systemInformationDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemNetworkConfigurationDiscoveryDescription',
      { defaultMessage: 'System Network Configuration Discovery (T1016)' }
    ),
    id: 'T1016',
    name: 'System Network Configuration Discovery',
    reference: 'https://attack.mitre.org/techniques/T1016',
    tactics: 'discovery',
    value: 'systemNetworkConfigurationDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemNetworkConnectionsDiscoveryDescription',
      { defaultMessage: 'System Network Connections Discovery (T1049)' }
    ),
    id: 'T1049',
    name: 'System Network Connections Discovery',
    reference: 'https://attack.mitre.org/techniques/T1049',
    tactics: 'discovery',
    value: 'systemNetworkConnectionsDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemOwnerUserDiscoveryDescription',
      { defaultMessage: 'System Owner/User Discovery (T1033)' }
    ),
    id: 'T1033',
    name: 'System Owner/User Discovery',
    reference: 'https://attack.mitre.org/techniques/T1033',
    tactics: 'discovery',
    value: 'systemOwnerUserDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemServiceDiscoveryDescription',
      { defaultMessage: 'System Service Discovery (T1007)' }
    ),
    id: 'T1007',
    name: 'System Service Discovery',
    reference: 'https://attack.mitre.org/techniques/T1007',
    tactics: 'discovery',
    value: 'systemServiceDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemServicesDescription',
      { defaultMessage: 'System Services (T1569)' }
    ),
    id: 'T1569',
    name: 'System Services',
    reference: 'https://attack.mitre.org/techniques/T1569',
    tactics: 'execution',
    value: 'systemServices',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemShutdownRebootDescription',
      { defaultMessage: 'System Shutdown/Reboot (T1529)' }
    ),
    id: 'T1529',
    name: 'System Shutdown/Reboot',
    reference: 'https://attack.mitre.org/techniques/T1529',
    tactics: 'impact',
    value: 'systemShutdownReboot',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemTimeDiscoveryDescription',
      { defaultMessage: 'System Time Discovery (T1124)' }
    ),
    id: 'T1124',
    name: 'System Time Discovery',
    reference: 'https://attack.mitre.org/techniques/T1124',
    tactics: 'discovery',
    value: 'systemTimeDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemdServiceDescription',
      { defaultMessage: 'Systemd Service (T1501)' }
    ),
    id: 'T1501',
    name: 'Systemd Service',
    reference: 'https://attack.mitre.org/techniques/T1501',
    tactics: '',
    value: 'systemdService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemdServiceDescription',
      { defaultMessage: 'Systemd Service (T1543.002)' }
    ),
    id: 'T1543.002',
    name: 'Systemd Service',
    reference: 'https://attack.mitre.org/techniques/T1543/002',
    tactics: 'persistence,privilege-escalation',
    value: 'systemdService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.taintSharedContentDescription',
      { defaultMessage: 'Taint Shared Content (T1080)' }
    ),
    id: 'T1080',
    name: 'Taint Shared Content',
    reference: 'https://attack.mitre.org/techniques/T1080',
    tactics: 'lateral-movement',
    value: 'taintSharedContent',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.templateInjectionDescription',
      { defaultMessage: 'Template Injection (T1221)' }
    ),
    id: 'T1221',
    name: 'Template Injection',
    reference: 'https://attack.mitre.org/techniques/T1221',
    tactics: 'defense-evasion',
    value: 'templateInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.threadExecutionHijackingDescription',
      { defaultMessage: 'Thread Execution Hijacking (T1055.003)' }
    ),
    id: 'T1055.003',
    name: 'Thread Execution Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1055/003',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'threadExecutionHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.threadLocalStorageDescription',
      { defaultMessage: 'Thread Local Storage (T1055.005)' }
    ),
    id: 'T1055.005',
    name: 'Thread Local Storage',
    reference: 'https://attack.mitre.org/techniques/T1055/005',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'threadLocalStorage',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.timeBasedEvasionDescription',
      { defaultMessage: 'Time Based Evasion (T1497.003)' }
    ),
    id: 'T1497.003',
    name: 'Time Based Evasion',
    reference: 'https://attack.mitre.org/techniques/T1497/003',
    tactics: 'defense-evasion,discovery',
    value: 'timeBasedEvasion',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.timeProvidersDescription',
      { defaultMessage: 'Time Providers (T1209)' }
    ),
    id: 'T1209',
    name: 'Time Providers',
    reference: 'https://attack.mitre.org/techniques/T1209',
    tactics: '',
    value: 'timeProviders',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.timeProvidersDescription',
      { defaultMessage: 'Time Providers (T1547.003)' }
    ),
    id: 'T1547.003',
    name: 'Time Providers',
    reference: 'https://attack.mitre.org/techniques/T1547/003',
    tactics: 'persistence,privilege-escalation',
    value: 'timeProviders',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.timestompDescription',
      { defaultMessage: 'Timestomp (T1099)' }
    ),
    id: 'T1099',
    name: 'Timestomp',
    reference: 'https://attack.mitre.org/techniques/T1099',
    tactics: '',
    value: 'timestomp',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.timestompDescription',
      { defaultMessage: 'Timestomp (T1070.006)' }
    ),
    id: 'T1070.006',
    name: 'Timestomp',
    reference: 'https://attack.mitre.org/techniques/T1070/006',
    tactics: 'defense-evasion',
    value: 'timestomp',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.tokenImpersonationTheftDescription',
      { defaultMessage: 'Token Impersonation/Theft (T1134.001)' }
    ),
    id: 'T1134.001',
    name: 'Token Impersonation/Theft',
    reference: 'https://attack.mitre.org/techniques/T1134/001',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'tokenImpersonationTheft',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.trafficSignalingDescription',
      { defaultMessage: 'Traffic Signaling (T1205)' }
    ),
    id: 'T1205',
    name: 'Traffic Signaling',
    reference: 'https://attack.mitre.org/techniques/T1205',
    tactics: 'defense-evasion,persistence,command-and-control',
    value: 'trafficSignaling',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.transferDataToCloudAccountDescription',
      { defaultMessage: 'Transfer Data to Cloud Account (T1537)' }
    ),
    id: 'T1537',
    name: 'Transfer Data to Cloud Account',
    reference: 'https://attack.mitre.org/techniques/T1537',
    tactics: 'exfiltration',
    value: 'transferDataToCloudAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.transmittedDataManipulationDescription',
      { defaultMessage: 'Transmitted Data Manipulation (T1493)' }
    ),
    id: 'T1493',
    name: 'Transmitted Data Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1493',
    tactics: '',
    value: 'transmittedDataManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.transmittedDataManipulationDescription',
      { defaultMessage: 'Transmitted Data Manipulation (T1565.002)' }
    ),
    id: 'T1565.002',
    name: 'Transmitted Data Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1565/002',
    tactics: 'impact',
    value: 'transmittedDataManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.transportAgentDescription',
      { defaultMessage: 'Transport Agent (T1505.002)' }
    ),
    id: 'T1505.002',
    name: 'Transport Agent',
    reference: 'https://attack.mitre.org/techniques/T1505/002',
    tactics: 'persistence',
    value: 'transportAgent',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.trapDescription',
      { defaultMessage: 'Trap (T1154)' }
    ),
    id: 'T1154',
    name: 'Trap',
    reference: 'https://attack.mitre.org/techniques/T1154',
    tactics: '',
    value: 'trap',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.trapDescription',
      { defaultMessage: 'Trap (T1546.005)' }
    ),
    id: 'T1546.005',
    name: 'Trap',
    reference: 'https://attack.mitre.org/techniques/T1546/005',
    tactics: 'privilege-escalation,persistence',
    value: 'trap',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.trustedDeveloperUtilitiesProxyExecutionDescription',
      { defaultMessage: 'Trusted Developer Utilities Proxy Execution (T1127)' }
    ),
    id: 'T1127',
    name: 'Trusted Developer Utilities Proxy Execution',
    reference: 'https://attack.mitre.org/techniques/T1127',
    tactics: 'defense-evasion',
    value: 'trustedDeveloperUtilitiesProxyExecution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.trustedRelationshipDescription',
      { defaultMessage: 'Trusted Relationship (T1199)' }
    ),
    id: 'T1199',
    name: 'Trusted Relationship',
    reference: 'https://attack.mitre.org/techniques/T1199',
    tactics: 'initial-access',
    value: 'trustedRelationship',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.twoFactorAuthenticationInterceptionDescription',
      { defaultMessage: 'Two-Factor Authentication Interception (T1111)' }
    ),
    id: 'T1111',
    name: 'Two-Factor Authentication Interception',
    reference: 'https://attack.mitre.org/techniques/T1111',
    tactics: 'credential-access',
    value: 'twoFactorAuthenticationInterception',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.uncommonlyUsedPortDescription',
      { defaultMessage: 'Uncommonly Used Port (T1065)' }
    ),
    id: 'T1065',
    name: 'Uncommonly Used Port',
    reference: 'https://attack.mitre.org/techniques/T1065',
    tactics: '',
    value: 'uncommonlyUsedPort',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.unixShellDescription',
      { defaultMessage: 'Unix Shell (T1059.004)' }
    ),
    id: 'T1059.004',
    name: 'Unix Shell',
    reference: 'https://attack.mitre.org/techniques/T1059/004',
    tactics: 'execution',
    value: 'unixShell',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.unsecuredCredentialsDescription',
      { defaultMessage: 'Unsecured Credentials (T1552)' }
    ),
    id: 'T1552',
    name: 'Unsecured Credentials',
    reference: 'https://attack.mitre.org/techniques/T1552',
    tactics: 'credential-access',
    value: 'unsecuredCredentials',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.unusedUnsupportedCloudRegionsDescription',
      { defaultMessage: 'Unused/Unsupported Cloud Regions (T1535)' }
    ),
    id: 'T1535',
    name: 'Unused/Unsupported Cloud Regions',
    reference: 'https://attack.mitre.org/techniques/T1535',
    tactics: 'defense-evasion',
    value: 'unusedUnsupportedCloudRegions',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.useAlternateAuthenticationMaterialDescription',
      { defaultMessage: 'Use Alternate Authentication Material (T1550)' }
    ),
    id: 'T1550',
    name: 'Use Alternate Authentication Material',
    reference: 'https://attack.mitre.org/techniques/T1550',
    tactics: 'defense-evasion,lateral-movement',
    value: 'useAlternateAuthenticationMaterial',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.userActivityBasedChecksDescription',
      { defaultMessage: 'User Activity Based Checks (T1497.002)' }
    ),
    id: 'T1497.002',
    name: 'User Activity Based Checks',
    reference: 'https://attack.mitre.org/techniques/T1497/002',
    tactics: 'defense-evasion,discovery',
    value: 'userActivityBasedChecks',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.userExecutionDescription',
      { defaultMessage: 'User Execution (T1204)' }
    ),
    id: 'T1204',
    name: 'User Execution',
    reference: 'https://attack.mitre.org/techniques/T1204',
    tactics: 'execution',
    value: 'userExecution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.vdsoHijackingDescription',
      { defaultMessage: 'VDSO Hijacking (T1055.014)' }
    ),
    id: 'T1055.014',
    name: 'VDSO Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1055/014',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'vdsoHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.vncDescription',
      { defaultMessage: 'VNC (T1021.005)' }
    ),
    id: 'T1021.005',
    name: 'VNC',
    reference: 'https://attack.mitre.org/techniques/T1021/005',
    tactics: 'lateral-movement',
    value: 'vnc',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.validAccountsDescription',
      { defaultMessage: 'Valid Accounts (T1078)' }
    ),
    id: 'T1078',
    name: 'Valid Accounts',
    reference: 'https://attack.mitre.org/techniques/T1078',
    tactics: 'defense-evasion,persistence,privilege-escalation,initial-access',
    value: 'validAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.videoCaptureDescription',
      { defaultMessage: 'Video Capture (T1125)' }
    ),
    id: 'T1125',
    name: 'Video Capture',
    reference: 'https://attack.mitre.org/techniques/T1125',
    tactics: 'collection',
    value: 'videoCapture',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.virtualizationSandboxEvasionDescription',
      { defaultMessage: 'Virtualization/Sandbox Evasion (T1497)' }
    ),
    id: 'T1497',
    name: 'Virtualization/Sandbox Evasion',
    reference: 'https://attack.mitre.org/techniques/T1497',
    tactics: 'defense-evasion,discovery',
    value: 'virtualizationSandboxEvasion',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.visualBasicDescription',
      { defaultMessage: 'Visual Basic (T1059.005)' }
    ),
    id: 'T1059.005',
    name: 'Visual Basic',
    reference: 'https://attack.mitre.org/techniques/T1059/005',
    tactics: 'execution',
    value: 'visualBasic',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.webPortalCaptureDescription',
      { defaultMessage: 'Web Portal Capture (T1056.003)' }
    ),
    id: 'T1056.003',
    name: 'Web Portal Capture',
    reference: 'https://attack.mitre.org/techniques/T1056/003',
    tactics: 'collection,credential-access',
    value: 'webPortalCapture',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.webProtocolsDescription',
      { defaultMessage: 'Web Protocols (T1071.001)' }
    ),
    id: 'T1071.001',
    name: 'Web Protocols',
    reference: 'https://attack.mitre.org/techniques/T1071/001',
    tactics: 'command-and-control',
    value: 'webProtocols',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.webServiceDescription',
      { defaultMessage: 'Web Service (T1102)' }
    ),
    id: 'T1102',
    name: 'Web Service',
    reference: 'https://attack.mitre.org/techniques/T1102',
    tactics: 'command-and-control',
    value: 'webService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.webSessionCookieDescription',
      { defaultMessage: 'Web Session Cookie (T1506)' }
    ),
    id: 'T1506',
    name: 'Web Session Cookie',
    reference: 'https://attack.mitre.org/techniques/T1506',
    tactics: '',
    value: 'webSessionCookie',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.webSessionCookieDescription',
      { defaultMessage: 'Web Session Cookie (T1550.004)' }
    ),
    id: 'T1550.004',
    name: 'Web Session Cookie',
    reference: 'https://attack.mitre.org/techniques/T1550/004',
    tactics: 'defense-evasion,lateral-movement',
    value: 'webSessionCookie',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.webShellDescription',
      { defaultMessage: 'Web Shell (T1100)' }
    ),
    id: 'T1100',
    name: 'Web Shell',
    reference: 'https://attack.mitre.org/techniques/T1100',
    tactics: '',
    value: 'webShell',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.webShellDescription',
      { defaultMessage: 'Web Shell (T1505.003)' }
    ),
    id: 'T1505.003',
    name: 'Web Shell',
    reference: 'https://attack.mitre.org/techniques/T1505/003',
    tactics: 'persistence',
    value: 'webShell',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.windowsAdminSharesDescription',
      { defaultMessage: 'Windows Admin Shares (T1077)' }
    ),
    id: 'T1077',
    name: 'Windows Admin Shares',
    reference: 'https://attack.mitre.org/techniques/T1077',
    tactics: '',
    value: 'windowsAdminShares',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.windowsCommandShellDescription',
      { defaultMessage: 'Windows Command Shell (T1059.003)' }
    ),
    id: 'T1059.003',
    name: 'Windows Command Shell',
    reference: 'https://attack.mitre.org/techniques/T1059/003',
    tactics: 'execution',
    value: 'windowsCommandShell',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.windowsFileAndDirectoryPermissionsModificationDescription',
      { defaultMessage: 'Windows File and Directory Permissions Modification (T1222.001)' }
    ),
    id: 'T1222.001',
    name: 'Windows File and Directory Permissions Modification',
    reference: 'https://attack.mitre.org/techniques/T1222/001',
    tactics: 'defense-evasion',
    value: 'windowsFileAndDirectoryPermissionsModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.windowsManagementInstrumentationDescription',
      { defaultMessage: 'Windows Management Instrumentation (T1047)' }
    ),
    id: 'T1047',
    name: 'Windows Management Instrumentation',
    reference: 'https://attack.mitre.org/techniques/T1047',
    tactics: 'execution',
    value: 'windowsManagementInstrumentation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.windowsManagementInstrumentationEventSubscriptionDescription',
      { defaultMessage: 'Windows Management Instrumentation Event Subscription (T1084)' }
    ),
    id: 'T1084',
    name: 'Windows Management Instrumentation Event Subscription',
    reference: 'https://attack.mitre.org/techniques/T1084',
    tactics: '',
    value: 'windowsManagementInstrumentationEventSubscription',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.windowsManagementInstrumentationEventSubscriptionDescription',
      { defaultMessage: 'Windows Management Instrumentation Event Subscription (T1546.003)' }
    ),
    id: 'T1546.003',
    name: 'Windows Management Instrumentation Event Subscription',
    reference: 'https://attack.mitre.org/techniques/T1546/003',
    tactics: 'privilege-escalation,persistence',
    value: 'windowsManagementInstrumentationEventSubscription',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.windowsRemoteManagementDescription',
      { defaultMessage: 'Windows Remote Management (T1028)' }
    ),
    id: 'T1028',
    name: 'Windows Remote Management',
    reference: 'https://attack.mitre.org/techniques/T1028',
    tactics: '',
    value: 'windowsRemoteManagement',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.windowsRemoteManagementDescription',
      { defaultMessage: 'Windows Remote Management (T1021.006)' }
    ),
    id: 'T1021.006',
    name: 'Windows Remote Management',
    reference: 'https://attack.mitre.org/techniques/T1021/006',
    tactics: 'lateral-movement',
    value: 'windowsRemoteManagement',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.windowsServiceDescription',
      { defaultMessage: 'Windows Service (T1543.003)' }
    ),
    id: 'T1543.003',
    name: 'Windows Service',
    reference: 'https://attack.mitre.org/techniques/T1543/003',
    tactics: 'persistence,privilege-escalation',
    value: 'windowsService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.winlogonHelperDllDescription',
      { defaultMessage: 'Winlogon Helper DLL (T1004)' }
    ),
    id: 'T1004',
    name: 'Winlogon Helper DLL',
    reference: 'https://attack.mitre.org/techniques/T1004',
    tactics: '',
    value: 'winlogonHelperDll',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.winlogonHelperDllDescription',
      { defaultMessage: 'Winlogon Helper DLL (T1547.004)' }
    ),
    id: 'T1547.004',
    name: 'Winlogon Helper DLL',
    reference: 'https://attack.mitre.org/techniques/T1547/004',
    tactics: 'persistence,privilege-escalation',
    value: 'winlogonHelperDll',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.xslScriptProcessingDescription',
      { defaultMessage: 'XSL Script Processing (T1220)' }
    ),
    id: 'T1220',
    name: 'XSL Script Processing',
    reference: 'https://attack.mitre.org/techniques/T1220',
    tactics: 'defense-evasion',
    value: 'xslScriptProcessing',
  },
];
