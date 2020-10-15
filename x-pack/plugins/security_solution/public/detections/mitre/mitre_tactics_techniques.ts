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
      {
        defaultMessage: 'Collection (TA0009)',
      }
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
      {
        defaultMessage: 'Discovery (TA0007)',
      }
    ),
    value: 'discovery',
  },
  {
    id: 'TA0002',
    name: 'Execution',
    reference: 'https://attack.mitre.org/tactics/TA0002',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.executionDescription',
      {
        defaultMessage: 'Execution (TA0002)',
      }
    ),
    value: 'execution',
  },
  {
    id: 'TA0010',
    name: 'Exfiltration',
    reference: 'https://attack.mitre.org/tactics/TA0010',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.exfiltrationDescription',
      {
        defaultMessage: 'Exfiltration (TA0010)',
      }
    ),
    value: 'exfiltration',
  },
  {
    id: 'TA0040',
    name: 'Impact',
    reference: 'https://attack.mitre.org/tactics/TA0040',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.impactDescription',
      {
        defaultMessage: 'Impact (TA0040)',
      }
    ),
    value: 'impact',
  },
  {
    id: 'TA0001',
    name: 'Initial Access',
    reference: 'https://attack.mitre.org/tactics/TA0001',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.initialAccessDescription',
      {
        defaultMessage: 'Initial Access (TA0001)',
      }
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
      {
        defaultMessage: 'Persistence (TA0003)',
      }
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
    tactics: ['persistence'],
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
    tactics: ['persistence', 'privilege-escalation'],
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
    tactics: ['credential-access', 'persistence'],
  },
  {
    name: 'AppCert DLLs',
    id: 'T1182',
    reference: 'https://attack.mitre.org/techniques/T1182',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'AppInit DLLs',
    id: 'T1103',
    reference: 'https://attack.mitre.org/techniques/T1103',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'AppleScript',
    id: 'T1155',
    reference: 'https://attack.mitre.org/techniques/T1155',
    tactics: ['execution', 'lateral-movement'],
  },
  {
    name: 'Application Access Token',
    id: 'T1527',
    reference: 'https://attack.mitre.org/techniques/T1527',
    tactics: ['defense-evasion', 'lateral-movement'],
  },
  {
    name: 'Application Deployment Software',
    id: 'T1017',
    reference: 'https://attack.mitre.org/techniques/T1017',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Application Shimming',
    id: 'T1138',
    reference: 'https://attack.mitre.org/techniques/T1138',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Application Window Discovery',
    id: 'T1010',
    reference: 'https://attack.mitre.org/techniques/T1010',
    tactics: ['discovery'],
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
    tactics: ['persistence'],
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
    tactics: ['credential-access'],
  },
  {
    name: 'Binary Padding',
    id: 'T1009',
    reference: 'https://attack.mitre.org/techniques/T1009',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Bootkit',
    id: 'T1067',
    reference: 'https://attack.mitre.org/techniques/T1067',
    tactics: ['persistence'],
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
    name: 'Bypass User Account Control',
    id: 'T1088',
    reference: 'https://attack.mitre.org/techniques/T1088',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'CMSTP',
    id: 'T1191',
    reference: 'https://attack.mitre.org/techniques/T1191',
    tactics: ['defense-evasion', 'execution'],
  },
  {
    name: 'Change Default File Association',
    id: 'T1042',
    reference: 'https://attack.mitre.org/techniques/T1042',
    tactics: ['persistence'],
  },
  {
    name: 'Clear Command History',
    id: 'T1146',
    reference: 'https://attack.mitre.org/techniques/T1146',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Clipboard Data',
    id: 'T1115',
    reference: 'https://attack.mitre.org/techniques/T1115',
    tactics: ['collection'],
  },
  {
    name: 'Cloud Instance Metadata API',
    id: 'T1522',
    reference: 'https://attack.mitre.org/techniques/T1522',
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
    tactics: ['defense-evasion'],
  },
  {
    name: 'Command-Line Interface',
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
    tactics: ['defense-evasion'],
  },
  {
    name: 'Compiled HTML File',
    id: 'T1223',
    reference: 'https://attack.mitre.org/techniques/T1223',
    tactics: ['defense-evasion', 'execution'],
  },
  {
    name: 'Component Firmware',
    id: 'T1109',
    reference: 'https://attack.mitre.org/techniques/T1109',
    tactics: ['defense-evasion', 'persistence'],
  },
  {
    name: 'Component Object Model Hijacking',
    id: 'T1122',
    reference: 'https://attack.mitre.org/techniques/T1122',
    tactics: ['defense-evasion', 'persistence'],
  },
  {
    name: 'Component Object Model and Distributed COM',
    id: 'T1175',
    reference: 'https://attack.mitre.org/techniques/T1175',
    tactics: ['lateral-movement', 'execution'],
  },
  {
    name: 'Connection Proxy',
    id: 'T1090',
    reference: 'https://attack.mitre.org/techniques/T1090',
    tactics: ['command-and-control', 'defense-evasion'],
  },
  {
    name: 'Control Panel Items',
    id: 'T1196',
    reference: 'https://attack.mitre.org/techniques/T1196',
    tactics: ['defense-evasion', 'execution'],
  },
  {
    name: 'Create Account',
    id: 'T1136',
    reference: 'https://attack.mitre.org/techniques/T1136',
    tactics: ['persistence'],
  },
  {
    name: 'Credential Dumping',
    id: 'T1003',
    reference: 'https://attack.mitre.org/techniques/T1003',
    tactics: ['credential-access'],
  },
  {
    name: 'Credentials from Web Browsers',
    id: 'T1503',
    reference: 'https://attack.mitre.org/techniques/T1503',
    tactics: ['credential-access'],
  },
  {
    name: 'Credentials in Files',
    id: 'T1081',
    reference: 'https://attack.mitre.org/techniques/T1081',
    tactics: ['credential-access'],
  },
  {
    name: 'Credentials in Registry',
    id: 'T1214',
    reference: 'https://attack.mitre.org/techniques/T1214',
    tactics: ['credential-access'],
  },
  {
    name: 'Custom Command and Control Protocol',
    id: 'T1094',
    reference: 'https://attack.mitre.org/techniques/T1094',
    tactics: ['command-and-control'],
  },
  {
    name: 'Custom Cryptographic Protocol',
    id: 'T1024',
    reference: 'https://attack.mitre.org/techniques/T1024',
    tactics: ['command-and-control'],
  },
  {
    name: 'DCShadow',
    id: 'T1207',
    reference: 'https://attack.mitre.org/techniques/T1207',
    tactics: ['defense-evasion'],
  },
  {
    name: 'DLL Search Order Hijacking',
    id: 'T1038',
    reference: 'https://attack.mitre.org/techniques/T1038',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
  },
  {
    name: 'DLL Side-Loading',
    id: 'T1073',
    reference: 'https://attack.mitre.org/techniques/T1073',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Data Compressed',
    id: 'T1002',
    reference: 'https://attack.mitre.org/techniques/T1002',
    tactics: ['exfiltration'],
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
    tactics: ['exfiltration'],
  },
  {
    name: 'Data Encrypted for Impact',
    id: 'T1486',
    reference: 'https://attack.mitre.org/techniques/T1486',
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
    name: 'Defacement',
    id: 'T1491',
    reference: 'https://attack.mitre.org/techniques/T1491',
    tactics: ['impact'],
  },
  {
    name: 'Deobfuscate/Decode Files or Information',
    id: 'T1140',
    reference: 'https://attack.mitre.org/techniques/T1140',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Disabling Security Tools',
    id: 'T1089',
    reference: 'https://attack.mitre.org/techniques/T1089',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Disk Content Wipe',
    id: 'T1488',
    reference: 'https://attack.mitre.org/techniques/T1488',
    tactics: ['impact'],
  },
  {
    name: 'Disk Structure Wipe',
    id: 'T1487',
    reference: 'https://attack.mitre.org/techniques/T1487',
    tactics: ['impact'],
  },
  {
    name: 'Domain Fronting',
    id: 'T1172',
    reference: 'https://attack.mitre.org/techniques/T1172',
    tactics: ['command-and-control'],
  },
  {
    name: 'Domain Generation Algorithms',
    id: 'T1483',
    reference: 'https://attack.mitre.org/techniques/T1483',
    tactics: ['command-and-control'],
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
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Dynamic Data Exchange',
    id: 'T1173',
    reference: 'https://attack.mitre.org/techniques/T1173',
    tactics: ['execution'],
  },
  {
    name: 'Elevated Execution with Prompt',
    id: 'T1514',
    reference: 'https://attack.mitre.org/techniques/T1514',
    tactics: ['privilege-escalation'],
  },
  {
    name: 'Email Collection',
    id: 'T1114',
    reference: 'https://attack.mitre.org/techniques/T1114',
    tactics: ['collection'],
  },
  {
    name: 'Emond',
    id: 'T1519',
    reference: 'https://attack.mitre.org/techniques/T1519',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Endpoint Denial of Service',
    id: 'T1499',
    reference: 'https://attack.mitre.org/techniques/T1499',
    tactics: ['impact'],
  },
  {
    name: 'Execution Guardrails',
    id: 'T1480',
    reference: 'https://attack.mitre.org/techniques/T1480',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Execution through API',
    id: 'T1106',
    reference: 'https://attack.mitre.org/techniques/T1106',
    tactics: ['execution'],
  },
  {
    name: 'Execution through Module Load',
    id: 'T1129',
    reference: 'https://attack.mitre.org/techniques/T1129',
    tactics: ['execution'],
  },
  {
    name: 'Exfiltration Over Alternative Protocol',
    id: 'T1048',
    reference: 'https://attack.mitre.org/techniques/T1048',
    tactics: ['exfiltration'],
  },
  {
    name: 'Exfiltration Over Command and Control Channel',
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
    name: 'External Remote Services',
    id: 'T1133',
    reference: 'https://attack.mitre.org/techniques/T1133',
    tactics: ['persistence', 'initial-access'],
  },
  {
    name: 'Extra Window Memory Injection',
    id: 'T1181',
    reference: 'https://attack.mitre.org/techniques/T1181',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Fallback Channels',
    id: 'T1008',
    reference: 'https://attack.mitre.org/techniques/T1008',
    tactics: ['command-and-control'],
  },
  {
    name: 'File Deletion',
    id: 'T1107',
    reference: 'https://attack.mitre.org/techniques/T1107',
    tactics: ['defense-evasion'],
  },
  {
    name: 'File System Logical Offsets',
    id: 'T1006',
    reference: 'https://attack.mitre.org/techniques/T1006',
    tactics: ['defense-evasion'],
  },
  {
    name: 'File System Permissions Weakness',
    id: 'T1044',
    reference: 'https://attack.mitre.org/techniques/T1044',
    tactics: ['persistence', 'privilege-escalation'],
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
    name: 'Gatekeeper Bypass',
    id: 'T1144',
    reference: 'https://attack.mitre.org/techniques/T1144',
    tactics: ['defense-evasion'],
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
    tactics: ['defense-evasion'],
  },
  {
    name: 'HISTCONTROL',
    id: 'T1148',
    reference: 'https://attack.mitre.org/techniques/T1148',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Hardware Additions',
    id: 'T1200',
    reference: 'https://attack.mitre.org/techniques/T1200',
    tactics: ['initial-access'],
  },
  {
    name: 'Hidden Files and Directories',
    id: 'T1158',
    reference: 'https://attack.mitre.org/techniques/T1158',
    tactics: ['defense-evasion', 'persistence'],
  },
  {
    name: 'Hidden Users',
    id: 'T1147',
    reference: 'https://attack.mitre.org/techniques/T1147',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Hidden Window',
    id: 'T1143',
    reference: 'https://attack.mitre.org/techniques/T1143',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Hooking',
    id: 'T1179',
    reference: 'https://attack.mitre.org/techniques/T1179',
    tactics: ['persistence', 'privilege-escalation', 'credential-access'],
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
    tactics: ['privilege-escalation', 'persistence', 'defense-evasion'],
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
    tactics: ['defense-evasion'],
  },
  {
    name: 'Indicator Removal from Tools',
    id: 'T1066',
    reference: 'https://attack.mitre.org/techniques/T1066',
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
    tactics: ['credential-access'],
  },
  {
    name: 'Install Root Certificate',
    id: 'T1130',
    reference: 'https://attack.mitre.org/techniques/T1130',
    tactics: ['defense-evasion'],
  },
  {
    name: 'InstallUtil',
    id: 'T1118',
    reference: 'https://attack.mitre.org/techniques/T1118',
    tactics: ['defense-evasion', 'execution'],
  },
  {
    name: 'Internal Spearphishing',
    id: 'T1534',
    reference: 'https://attack.mitre.org/techniques/T1534',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Kerberoasting',
    id: 'T1208',
    reference: 'https://attack.mitre.org/techniques/T1208',
    tactics: ['credential-access'],
  },
  {
    name: 'Kernel Modules and Extensions',
    id: 'T1215',
    reference: 'https://attack.mitre.org/techniques/T1215',
    tactics: ['persistence'],
  },
  {
    name: 'Keychain',
    id: 'T1142',
    reference: 'https://attack.mitre.org/techniques/T1142',
    tactics: ['credential-access'],
  },
  {
    name: 'LC_LOAD_DYLIB Addition',
    id: 'T1161',
    reference: 'https://attack.mitre.org/techniques/T1161',
    tactics: ['persistence'],
  },
  {
    name: 'LC_MAIN Hijacking',
    id: 'T1149',
    reference: 'https://attack.mitre.org/techniques/T1149',
    tactics: ['defense-evasion'],
  },
  {
    name: 'LLMNR/NBT-NS Poisoning and Relay',
    id: 'T1171',
    reference: 'https://attack.mitre.org/techniques/T1171',
    tactics: ['credential-access'],
  },
  {
    name: 'LSASS Driver',
    id: 'T1177',
    reference: 'https://attack.mitre.org/techniques/T1177',
    tactics: ['execution', 'persistence'],
  },
  {
    name: 'Launch Agent',
    id: 'T1159',
    reference: 'https://attack.mitre.org/techniques/T1159',
    tactics: ['persistence'],
  },
  {
    name: 'Launch Daemon',
    id: 'T1160',
    reference: 'https://attack.mitre.org/techniques/T1160',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Launchctl',
    id: 'T1152',
    reference: 'https://attack.mitre.org/techniques/T1152',
    tactics: ['defense-evasion', 'execution', 'persistence'],
  },
  {
    name: 'Local Job Scheduling',
    id: 'T1168',
    reference: 'https://attack.mitre.org/techniques/T1168',
    tactics: ['persistence', 'execution'],
  },
  {
    name: 'Login Item',
    id: 'T1162',
    reference: 'https://attack.mitre.org/techniques/T1162',
    tactics: ['persistence'],
  },
  {
    name: 'Logon Scripts',
    id: 'T1037',
    reference: 'https://attack.mitre.org/techniques/T1037',
    tactics: ['lateral-movement', 'persistence'],
  },
  {
    name: 'Man in the Browser',
    id: 'T1185',
    reference: 'https://attack.mitre.org/techniques/T1185',
    tactics: ['collection'],
  },
  {
    name: 'Masquerading',
    id: 'T1036',
    reference: 'https://attack.mitre.org/techniques/T1036',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Modify Existing Service',
    id: 'T1031',
    reference: 'https://attack.mitre.org/techniques/T1031',
    tactics: ['persistence'],
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
    tactics: ['defense-evasion', 'execution'],
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
    tactics: ['command-and-control'],
  },
  {
    name: 'NTFS File Attributes',
    id: 'T1096',
    reference: 'https://attack.mitre.org/techniques/T1096',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Netsh Helper DLL',
    id: 'T1128',
    reference: 'https://attack.mitre.org/techniques/T1128',
    tactics: ['persistence'],
  },
  {
    name: 'Network Denial of Service',
    id: 'T1498',
    reference: 'https://attack.mitre.org/techniques/T1498',
    tactics: ['impact'],
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
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Obfuscated Files or Information',
    id: 'T1027',
    reference: 'https://attack.mitre.org/techniques/T1027',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Office Application Startup',
    id: 'T1137',
    reference: 'https://attack.mitre.org/techniques/T1137',
    tactics: ['persistence'],
  },
  {
    name: 'Parent PID Spoofing',
    id: 'T1502',
    reference: 'https://attack.mitre.org/techniques/T1502',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Pass the Hash',
    id: 'T1075',
    reference: 'https://attack.mitre.org/techniques/T1075',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Pass the Ticket',
    id: 'T1097',
    reference: 'https://attack.mitre.org/techniques/T1097',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Password Filter DLL',
    id: 'T1174',
    reference: 'https://attack.mitre.org/techniques/T1174',
    tactics: ['credential-access'],
  },
  {
    name: 'Password Policy Discovery',
    id: 'T1201',
    reference: 'https://attack.mitre.org/techniques/T1201',
    tactics: ['discovery'],
  },
  {
    name: 'Path Interception',
    id: 'T1034',
    reference: 'https://attack.mitre.org/techniques/T1034',
    tactics: ['persistence', 'privilege-escalation'],
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
    name: 'Plist Modification',
    id: 'T1150',
    reference: 'https://attack.mitre.org/techniques/T1150',
    tactics: ['defense-evasion', 'persistence', 'privilege-escalation'],
  },
  {
    name: 'Port Knocking',
    id: 'T1205',
    reference: 'https://attack.mitre.org/techniques/T1205',
    tactics: ['defense-evasion', 'persistence', 'command-and-control'],
  },
  {
    name: 'Port Monitors',
    id: 'T1013',
    reference: 'https://attack.mitre.org/techniques/T1013',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'PowerShell',
    id: 'T1086',
    reference: 'https://attack.mitre.org/techniques/T1086',
    tactics: ['execution'],
  },
  {
    name: 'PowerShell Profile',
    id: 'T1504',
    reference: 'https://attack.mitre.org/techniques/T1504',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Private Keys',
    id: 'T1145',
    reference: 'https://attack.mitre.org/techniques/T1145',
    tactics: ['credential-access'],
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
    tactics: ['defense-evasion'],
  },
  {
    name: 'Process Hollowing',
    id: 'T1093',
    reference: 'https://attack.mitre.org/techniques/T1093',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Process Injection',
    id: 'T1055',
    reference: 'https://attack.mitre.org/techniques/T1055',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Query Registry',
    id: 'T1012',
    reference: 'https://attack.mitre.org/techniques/T1012',
    tactics: ['discovery'],
  },
  {
    name: 'Rc.common',
    id: 'T1163',
    reference: 'https://attack.mitre.org/techniques/T1163',
    tactics: ['persistence'],
  },
  {
    name: 'Re-opened Applications',
    id: 'T1164',
    reference: 'https://attack.mitre.org/techniques/T1164',
    tactics: ['persistence'],
  },
  {
    name: 'Redundant Access',
    id: 'T1108',
    reference: 'https://attack.mitre.org/techniques/T1108',
    tactics: ['defense-evasion', 'persistence'],
  },
  {
    name: 'Registry Run Keys / Startup Folder',
    id: 'T1060',
    reference: 'https://attack.mitre.org/techniques/T1060',
    tactics: ['persistence'],
  },
  {
    name: 'Regsvcs/Regasm',
    id: 'T1121',
    reference: 'https://attack.mitre.org/techniques/T1121',
    tactics: ['defense-evasion', 'execution'],
  },
  {
    name: 'Regsvr32',
    id: 'T1117',
    reference: 'https://attack.mitre.org/techniques/T1117',
    tactics: ['defense-evasion', 'execution'],
  },
  {
    name: 'Remote Access Tools',
    id: 'T1219',
    reference: 'https://attack.mitre.org/techniques/T1219',
    tactics: ['command-and-control'],
  },
  {
    name: 'Remote Desktop Protocol',
    id: 'T1076',
    reference: 'https://attack.mitre.org/techniques/T1076',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Remote File Copy',
    id: 'T1105',
    reference: 'https://attack.mitre.org/techniques/T1105',
    tactics: ['command-and-control', 'lateral-movement'],
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
    tactics: ['defense-evasion'],
  },
  {
    name: 'Rootkit',
    id: 'T1014',
    reference: 'https://attack.mitre.org/techniques/T1014',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Rundll32',
    id: 'T1085',
    reference: 'https://attack.mitre.org/techniques/T1085',
    tactics: ['defense-evasion', 'execution'],
  },
  {
    name: 'Runtime Data Manipulation',
    id: 'T1494',
    reference: 'https://attack.mitre.org/techniques/T1494',
    tactics: ['impact'],
  },
  {
    name: 'SID-History Injection',
    id: 'T1178',
    reference: 'https://attack.mitre.org/techniques/T1178',
    tactics: ['privilege-escalation'],
  },
  {
    name: 'SIP and Trust Provider Hijacking',
    id: 'T1198',
    reference: 'https://attack.mitre.org/techniques/T1198',
    tactics: ['defense-evasion', 'persistence'],
  },
  {
    name: 'SSH Hijacking',
    id: 'T1184',
    reference: 'https://attack.mitre.org/techniques/T1184',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Scheduled Task',
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
    tactics: ['persistence'],
  },
  {
    name: 'Scripting',
    id: 'T1064',
    reference: 'https://attack.mitre.org/techniques/T1064',
    tactics: ['defense-evasion', 'execution'],
  },
  {
    name: 'Security Software Discovery',
    id: 'T1063',
    reference: 'https://attack.mitre.org/techniques/T1063',
    tactics: ['discovery'],
  },
  {
    name: 'Security Support Provider',
    id: 'T1101',
    reference: 'https://attack.mitre.org/techniques/T1101',
    tactics: ['persistence'],
  },
  {
    name: 'Securityd Memory',
    id: 'T1167',
    reference: 'https://attack.mitre.org/techniques/T1167',
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
    tactics: ['execution'],
  },
  {
    name: 'Service Registry Permissions Weakness',
    id: 'T1058',
    reference: 'https://attack.mitre.org/techniques/T1058',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Service Stop',
    id: 'T1489',
    reference: 'https://attack.mitre.org/techniques/T1489',
    tactics: ['impact'],
  },
  {
    name: 'Setuid and Setgid',
    id: 'T1166',
    reference: 'https://attack.mitre.org/techniques/T1166',
    tactics: ['privilege-escalation', 'persistence'],
  },
  {
    name: 'Shared Webroot',
    id: 'T1051',
    reference: 'https://attack.mitre.org/techniques/T1051',
    tactics: ['lateral-movement'],
  },
  {
    name: 'Shortcut Modification',
    id: 'T1023',
    reference: 'https://attack.mitre.org/techniques/T1023',
    tactics: ['persistence'],
  },
  {
    name: 'Signed Binary Proxy Execution',
    id: 'T1218',
    reference: 'https://attack.mitre.org/techniques/T1218',
    tactics: ['defense-evasion', 'execution'],
  },
  {
    name: 'Signed Script Proxy Execution',
    id: 'T1216',
    reference: 'https://attack.mitre.org/techniques/T1216',
    tactics: ['defense-evasion', 'execution'],
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
    tactics: ['defense-evasion', 'execution'],
  },
  {
    name: 'Spearphishing Attachment',
    id: 'T1193',
    reference: 'https://attack.mitre.org/techniques/T1193',
    tactics: ['initial-access'],
  },
  {
    name: 'Spearphishing Link',
    id: 'T1192',
    reference: 'https://attack.mitre.org/techniques/T1192',
    tactics: ['initial-access'],
  },
  {
    name: 'Spearphishing via Service',
    id: 'T1194',
    reference: 'https://attack.mitre.org/techniques/T1194',
    tactics: ['initial-access'],
  },
  {
    name: 'Standard Application Layer Protocol',
    id: 'T1071',
    reference: 'https://attack.mitre.org/techniques/T1071',
    tactics: ['command-and-control'],
  },
  {
    name: 'Standard Cryptographic Protocol',
    id: 'T1032',
    reference: 'https://attack.mitre.org/techniques/T1032',
    tactics: ['command-and-control'],
  },
  {
    name: 'Standard Non-Application Layer Protocol',
    id: 'T1095',
    reference: 'https://attack.mitre.org/techniques/T1095',
    tactics: ['command-and-control'],
  },
  {
    name: 'Startup Items',
    id: 'T1165',
    reference: 'https://attack.mitre.org/techniques/T1165',
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
    name: 'Stored Data Manipulation',
    id: 'T1492',
    reference: 'https://attack.mitre.org/techniques/T1492',
    tactics: ['impact'],
  },
  {
    name: 'Sudo',
    id: 'T1169',
    reference: 'https://attack.mitre.org/techniques/T1169',
    tactics: ['privilege-escalation'],
  },
  {
    name: 'Sudo Caching',
    id: 'T1206',
    reference: 'https://attack.mitre.org/techniques/T1206',
    tactics: ['privilege-escalation'],
  },
  {
    name: 'Supply Chain Compromise',
    id: 'T1195',
    reference: 'https://attack.mitre.org/techniques/T1195',
    tactics: ['initial-access'],
  },
  {
    name: 'System Firmware',
    id: 'T1019',
    reference: 'https://attack.mitre.org/techniques/T1019',
    tactics: ['persistence'],
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
    tactics: ['persistence'],
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
    name: 'Third-party Software',
    id: 'T1072',
    reference: 'https://attack.mitre.org/techniques/T1072',
    tactics: ['execution', 'lateral-movement'],
  },
  {
    name: 'Time Providers',
    id: 'T1209',
    reference: 'https://attack.mitre.org/techniques/T1209',
    tactics: ['persistence'],
  },
  {
    name: 'Timestomp',
    id: 'T1099',
    reference: 'https://attack.mitre.org/techniques/T1099',
    tactics: ['defense-evasion'],
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
    tactics: ['impact'],
  },
  {
    name: 'Trap',
    id: 'T1154',
    reference: 'https://attack.mitre.org/techniques/T1154',
    tactics: ['execution', 'persistence'],
  },
  {
    name: 'Trusted Developer Utilities',
    id: 'T1127',
    reference: 'https://attack.mitre.org/techniques/T1127',
    tactics: ['defense-evasion', 'execution'],
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
    tactics: ['command-and-control'],
  },
  {
    name: 'Unused/Unsupported Cloud Regions',
    id: 'T1535',
    reference: 'https://attack.mitre.org/techniques/T1535',
    tactics: ['defense-evasion'],
  },
  {
    name: 'User Execution',
    id: 'T1204',
    reference: 'https://attack.mitre.org/techniques/T1204',
    tactics: ['execution'],
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
    name: 'Web Service',
    id: 'T1102',
    reference: 'https://attack.mitre.org/techniques/T1102',
    tactics: ['command-and-control', 'defense-evasion'],
  },
  {
    name: 'Web Session Cookie',
    id: 'T1506',
    reference: 'https://attack.mitre.org/techniques/T1506',
    tactics: ['defense-evasion', 'lateral-movement'],
  },
  {
    name: 'Web Shell',
    id: 'T1100',
    reference: 'https://attack.mitre.org/techniques/T1100',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Windows Admin Shares',
    id: 'T1077',
    reference: 'https://attack.mitre.org/techniques/T1077',
    tactics: ['lateral-movement'],
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
    tactics: ['persistence'],
  },
  {
    name: 'Windows Remote Management',
    id: 'T1028',
    reference: 'https://attack.mitre.org/techniques/T1028',
    tactics: ['execution', 'lateral-movement'],
  },
  {
    name: 'Winlogon Helper DLL',
    id: 'T1004',
    reference: 'https://attack.mitre.org/techniques/T1004',
    tactics: ['persistence'],
  },
  {
    name: 'XSL Script Processing',
    id: 'T1220',
    reference: 'https://attack.mitre.org/techniques/T1220',
    tactics: ['defense-evasion', 'execution'],
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
    tactics: 'persistence',
    value: 'bashProfileAndBashrc',
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
    tactics: 'persistence,privilege-escalation',
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
    tactics: 'credential-access,persistence',
    value: 'accountManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.appCertDlLsDescription',
      { defaultMessage: 'AppCert DLLs (T1182)' }
    ),
    id: 'T1182',
    name: 'AppCert DLLs',
    reference: 'https://attack.mitre.org/techniques/T1182',
    tactics: 'persistence,privilege-escalation',
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
    tactics: 'persistence,privilege-escalation',
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
    tactics: 'execution,lateral-movement',
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
    tactics: 'lateral-movement',
    value: 'applicationDeploymentSoftware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.applicationShimmingDescription',
      { defaultMessage: 'Application Shimming (T1138)' }
    ),
    id: 'T1138',
    name: 'Application Shimming',
    reference: 'https://attack.mitre.org/techniques/T1138',
    tactics: 'persistence,privilege-escalation',
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
    tactics: 'persistence',
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
      {
        defaultMessage: 'BITS Jobs (T1197)',
      }
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
    tactics: 'credential-access',
    value: 'bashHistory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.binaryPaddingDescription',
      { defaultMessage: 'Binary Padding (T1009)' }
    ),
    id: 'T1009',
    name: 'Binary Padding',
    reference: 'https://attack.mitre.org/techniques/T1009',
    tactics: 'defense-evasion',
    value: 'binaryPadding',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bootkitDescription',
      {
        defaultMessage: 'Bootkit (T1067)',
      }
    ),
    id: 'T1067',
    name: 'Bootkit',
    reference: 'https://attack.mitre.org/techniques/T1067',
    tactics: 'persistence',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.bypassUserAccountControlDescription',
      { defaultMessage: 'Bypass User Account Control (T1088)' }
    ),
    id: 'T1088',
    name: 'Bypass User Account Control',
    reference: 'https://attack.mitre.org/techniques/T1088',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'bypassUserAccountControl',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cmstpDescription',
      {
        defaultMessage: 'CMSTP (T1191)',
      }
    ),
    id: 'T1191',
    name: 'CMSTP',
    reference: 'https://attack.mitre.org/techniques/T1191',
    tactics: 'defense-evasion,execution',
    value: 'cmstp',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.changeDefaultFileAssociationDescription',
      { defaultMessage: 'Change Default File Association (T1042)' }
    ),
    id: 'T1042',
    name: 'Change Default File Association',
    reference: 'https://attack.mitre.org/techniques/T1042',
    tactics: 'persistence',
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
    tactics: 'defense-evasion',
    value: 'clearCommandHistory',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cloudInstanceMetadataApiDescription',
      { defaultMessage: 'Cloud Instance Metadata API (T1522)' }
    ),
    id: 'T1522',
    name: 'Cloud Instance Metadata API',
    reference: 'https://attack.mitre.org/techniques/T1522',
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
    tactics: 'defense-evasion',
    value: 'codeSigning',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.commandLineInterfaceDescription',
      { defaultMessage: 'Command-Line Interface (T1059)' }
    ),
    id: 'T1059',
    name: 'Command-Line Interface',
    reference: 'https://attack.mitre.org/techniques/T1059',
    tactics: 'execution',
    value: 'commandLineInterface',
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
    tactics: 'defense-evasion,execution',
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
    tactics: 'defense-evasion,persistence',
    value: 'componentFirmware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.componentObjectModelHijackingDescription',
      { defaultMessage: 'Component Object Model Hijacking (T1122)' }
    ),
    id: 'T1122',
    name: 'Component Object Model Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1122',
    tactics: 'defense-evasion,persistence',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.connectionProxyDescription',
      { defaultMessage: 'Connection Proxy (T1090)' }
    ),
    id: 'T1090',
    name: 'Connection Proxy',
    reference: 'https://attack.mitre.org/techniques/T1090',
    tactics: 'command-and-control,defense-evasion',
    value: 'connectionProxy',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.controlPanelItemsDescription',
      { defaultMessage: 'Control Panel Items (T1196)' }
    ),
    id: 'T1196',
    name: 'Control Panel Items',
    reference: 'https://attack.mitre.org/techniques/T1196',
    tactics: 'defense-evasion,execution',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.credentialDumpingDescription',
      { defaultMessage: 'Credential Dumping (T1003)' }
    ),
    id: 'T1003',
    name: 'Credential Dumping',
    reference: 'https://attack.mitre.org/techniques/T1003',
    tactics: 'credential-access',
    value: 'credentialDumping',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.credentialsFromWebBrowsersDescription',
      { defaultMessage: 'Credentials from Web Browsers (T1503)' }
    ),
    id: 'T1503',
    name: 'Credentials from Web Browsers',
    reference: 'https://attack.mitre.org/techniques/T1503',
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
    tactics: 'credential-access',
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
    tactics: 'credential-access',
    value: 'credentialsInRegistry',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.customCommandAndControlProtocolDescription',
      { defaultMessage: 'Custom Command and Control Protocol (T1094)' }
    ),
    id: 'T1094',
    name: 'Custom Command and Control Protocol',
    reference: 'https://attack.mitre.org/techniques/T1094',
    tactics: 'command-and-control',
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
    tactics: 'command-and-control',
    value: 'customCryptographicProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dcShadowDescription',
      {
        defaultMessage: 'DCShadow (T1207)',
      }
    ),
    id: 'T1207',
    name: 'DCShadow',
    reference: 'https://attack.mitre.org/techniques/T1207',
    tactics: 'defense-evasion',
    value: 'dcShadow',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dllSearchOrderHijackingDescription',
      { defaultMessage: 'DLL Search Order Hijacking (T1038)' }
    ),
    id: 'T1038',
    name: 'DLL Search Order Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1038',
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
    tactics: 'defense-evasion',
    value: 'dllSideLoading',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataCompressedDescription',
      { defaultMessage: 'Data Compressed (T1002)' }
    ),
    id: 'T1002',
    name: 'Data Compressed',
    reference: 'https://attack.mitre.org/techniques/T1002',
    tactics: 'exfiltration',
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
    tactics: 'exfiltration',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.disablingSecurityToolsDescription',
      { defaultMessage: 'Disabling Security Tools (T1089)' }
    ),
    id: 'T1089',
    name: 'Disabling Security Tools',
    reference: 'https://attack.mitre.org/techniques/T1089',
    tactics: 'defense-evasion',
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
    tactics: 'impact',
    value: 'diskStructureWipe',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.domainFrontingDescription',
      { defaultMessage: 'Domain Fronting (T1172)' }
    ),
    id: 'T1172',
    name: 'Domain Fronting',
    reference: 'https://attack.mitre.org/techniques/T1172',
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
    tactics: 'command-and-control',
    value: 'domainGenerationAlgorithms',
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
    tactics: 'persistence,privilege-escalation',
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
    tactics: 'execution',
    value: 'dynamicDataExchange',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.elevatedExecutionWithPromptDescription',
      { defaultMessage: 'Elevated Execution with Prompt (T1514)' }
    ),
    id: 'T1514',
    name: 'Elevated Execution with Prompt',
    reference: 'https://attack.mitre.org/techniques/T1514',
    tactics: 'privilege-escalation',
    value: 'elevatedExecutionWithPrompt',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.emondDescription',
      {
        defaultMessage: 'Emond (T1519)',
      }
    ),
    id: 'T1519',
    name: 'Emond',
    reference: 'https://attack.mitre.org/techniques/T1519',
    tactics: 'persistence,privilege-escalation',
    value: 'emond',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.executionThroughApiDescription',
      { defaultMessage: 'Execution through API (T1106)' }
    ),
    id: 'T1106',
    name: 'Execution through API',
    reference: 'https://attack.mitre.org/techniques/T1106',
    tactics: 'execution',
    value: 'executionThroughApi',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.executionThroughModuleLoadDescription',
      { defaultMessage: 'Execution through Module Load (T1129)' }
    ),
    id: 'T1129',
    name: 'Execution through Module Load',
    reference: 'https://attack.mitre.org/techniques/T1129',
    tactics: 'execution',
    value: 'executionThroughModuleLoad',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.exfiltrationOverCommandAndControlChannelDescription',
      { defaultMessage: 'Exfiltration Over Command and Control Channel (T1041)' }
    ),
    id: 'T1041',
    name: 'Exfiltration Over Command and Control Channel',
    reference: 'https://attack.mitre.org/techniques/T1041',
    tactics: 'exfiltration',
    value: 'exfiltrationOverCommandAndControlChannel',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.fileDeletionDescription',
      { defaultMessage: 'File Deletion (T1107)' }
    ),
    id: 'T1107',
    name: 'File Deletion',
    reference: 'https://attack.mitre.org/techniques/T1107',
    tactics: 'defense-evasion',
    value: 'fileDeletion',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.fileSystemLogicalOffsetsDescription',
      { defaultMessage: 'File System Logical Offsets (T1006)' }
    ),
    id: 'T1006',
    name: 'File System Logical Offsets',
    reference: 'https://attack.mitre.org/techniques/T1006',
    tactics: 'defense-evasion',
    value: 'fileSystemLogicalOffsets',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.fileSystemPermissionsWeaknessDescription',
      { defaultMessage: 'File System Permissions Weakness (T1044)' }
    ),
    id: 'T1044',
    name: 'File System Permissions Weakness',
    reference: 'https://attack.mitre.org/techniques/T1044',
    tactics: 'persistence,privilege-escalation',
    value: 'fileSystemPermissionsWeakness',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.gatekeeperBypassDescription',
      { defaultMessage: 'Gatekeeper Bypass (T1144)' }
    ),
    id: 'T1144',
    name: 'Gatekeeper Bypass',
    reference: 'https://attack.mitre.org/techniques/T1144',
    tactics: 'defense-evasion',
    value: 'gatekeeperBypass',
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
    tactics: 'defense-evasion',
    value: 'groupPolicyModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.histcontrolDescription',
      { defaultMessage: 'HISTCONTROL (T1148)' }
    ),
    id: 'T1148',
    name: 'HISTCONTROL',
    reference: 'https://attack.mitre.org/techniques/T1148',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hiddenFilesAndDirectoriesDescription',
      { defaultMessage: 'Hidden Files and Directories (T1158)' }
    ),
    id: 'T1158',
    name: 'Hidden Files and Directories',
    reference: 'https://attack.mitre.org/techniques/T1158',
    tactics: 'defense-evasion,persistence',
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
    tactics: 'defense-evasion',
    value: 'hiddenWindow',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.hookingDescription',
      {
        defaultMessage: 'Hooking (T1179)',
      }
    ),
    id: 'T1179',
    name: 'Hooking',
    reference: 'https://attack.mitre.org/techniques/T1179',
    tactics: 'persistence,privilege-escalation,credential-access',
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
    tactics: 'privilege-escalation,persistence,defense-evasion',
    value: 'imageFileExecutionOptionsInjection',
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
    tactics: 'credential-access',
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
    tactics: 'defense-evasion,execution',
    value: 'installUtil',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.kerberoastingDescription',
      { defaultMessage: 'Kerberoasting (T1208)' }
    ),
    id: 'T1208',
    name: 'Kerberoasting',
    reference: 'https://attack.mitre.org/techniques/T1208',
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
    tactics: 'persistence',
    value: 'kernelModulesAndExtensions',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.keychainDescription',
      {
        defaultMessage: 'Keychain (T1142)',
      }
    ),
    id: 'T1142',
    name: 'Keychain',
    reference: 'https://attack.mitre.org/techniques/T1142',
    tactics: 'credential-access',
    value: 'keychain',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.lcLoadDylibAdditionDescription',
      { defaultMessage: 'LC_LOAD_DYLIB Addition (T1161)' }
    ),
    id: 'T1161',
    name: 'LC_LOAD_DYLIB Addition',
    reference: 'https://attack.mitre.org/techniques/T1161',
    tactics: 'persistence',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.llmnrNbtNsPoisoningAndRelayDescription',
      { defaultMessage: 'LLMNR/NBT-NS Poisoning and Relay (T1171)' }
    ),
    id: 'T1171',
    name: 'LLMNR/NBT-NS Poisoning and Relay',
    reference: 'https://attack.mitre.org/techniques/T1171',
    tactics: 'credential-access',
    value: 'llmnrNbtNsPoisoningAndRelay',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.lsassDriverDescription',
      { defaultMessage: 'LSASS Driver (T1177)' }
    ),
    id: 'T1177',
    name: 'LSASS Driver',
    reference: 'https://attack.mitre.org/techniques/T1177',
    tactics: 'execution,persistence',
    value: 'lsassDriver',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.launchAgentDescription',
      { defaultMessage: 'Launch Agent (T1159)' }
    ),
    id: 'T1159',
    name: 'Launch Agent',
    reference: 'https://attack.mitre.org/techniques/T1159',
    tactics: 'persistence',
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
    tactics: 'persistence,privilege-escalation',
    value: 'launchDaemon',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.launchctlDescription',
      {
        defaultMessage: 'Launchctl (T1152)',
      }
    ),
    id: 'T1152',
    name: 'Launchctl',
    reference: 'https://attack.mitre.org/techniques/T1152',
    tactics: 'defense-evasion,execution,persistence',
    value: 'launchctl',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.localJobSchedulingDescription',
      { defaultMessage: 'Local Job Scheduling (T1168)' }
    ),
    id: 'T1168',
    name: 'Local Job Scheduling',
    reference: 'https://attack.mitre.org/techniques/T1168',
    tactics: 'persistence,execution',
    value: 'localJobScheduling',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.loginItemDescription',
      {
        defaultMessage: 'Login Item (T1162)',
      }
    ),
    id: 'T1162',
    name: 'Login Item',
    reference: 'https://attack.mitre.org/techniques/T1162',
    tactics: 'persistence',
    value: 'loginItem',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.logonScriptsDescription',
      { defaultMessage: 'Logon Scripts (T1037)' }
    ),
    id: 'T1037',
    name: 'Logon Scripts',
    reference: 'https://attack.mitre.org/techniques/T1037',
    tactics: 'lateral-movement,persistence',
    value: 'logonScripts',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.modifyExistingServiceDescription',
      { defaultMessage: 'Modify Existing Service (T1031)' }
    ),
    id: 'T1031',
    name: 'Modify Existing Service',
    reference: 'https://attack.mitre.org/techniques/T1031',
    tactics: 'persistence',
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
      {
        defaultMessage: 'Mshta (T1170)',
      }
    ),
    id: 'T1170',
    name: 'Mshta',
    reference: 'https://attack.mitre.org/techniques/T1170',
    tactics: 'defense-evasion,execution',
    value: 'mshta',
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
    tactics: 'command-and-control',
    value: 'multilayerEncryption',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.ntfsFileAttributesDescription',
      { defaultMessage: 'NTFS File Attributes (T1096)' }
    ),
    id: 'T1096',
    name: 'NTFS File Attributes',
    reference: 'https://attack.mitre.org/techniques/T1096',
    tactics: 'defense-evasion',
    value: 'ntfsFileAttributes',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.netshHelperDllDescription',
      { defaultMessage: 'Netsh Helper DLL (T1128)' }
    ),
    id: 'T1128',
    name: 'Netsh Helper DLL',
    reference: 'https://attack.mitre.org/techniques/T1128',
    tactics: 'persistence',
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
    tactics: 'persistence,privilege-escalation',
    value: 'newService',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.parentPidSpoofingDescription',
      { defaultMessage: 'Parent PID Spoofing (T1502)' }
    ),
    id: 'T1502',
    name: 'Parent PID Spoofing',
    reference: 'https://attack.mitre.org/techniques/T1502',
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
    tactics: 'lateral-movement',
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
    tactics: 'lateral-movement',
    value: 'passTheTicket',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.passwordFilterDllDescription',
      { defaultMessage: 'Password Filter DLL (T1174)' }
    ),
    id: 'T1174',
    name: 'Password Filter DLL',
    reference: 'https://attack.mitre.org/techniques/T1174',
    tactics: 'credential-access',
    value: 'passwordFilterDll',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.plistModificationDescription',
      { defaultMessage: 'Plist Modification (T1150)' }
    ),
    id: 'T1150',
    name: 'Plist Modification',
    reference: 'https://attack.mitre.org/techniques/T1150',
    tactics: 'defense-evasion,persistence,privilege-escalation',
    value: 'plistModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.portKnockingDescription',
      { defaultMessage: 'Port Knocking (T1205)' }
    ),
    id: 'T1205',
    name: 'Port Knocking',
    reference: 'https://attack.mitre.org/techniques/T1205',
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
    tactics: 'persistence,privilege-escalation',
    value: 'portMonitors',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.powerShellDescription',
      { defaultMessage: 'PowerShell (T1086)' }
    ),
    id: 'T1086',
    name: 'PowerShell',
    reference: 'https://attack.mitre.org/techniques/T1086',
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
    tactics: 'persistence,privilege-escalation',
    value: 'powerShellProfile',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.privateKeysDescription',
      { defaultMessage: 'Private Keys (T1145)' }
    ),
    id: 'T1145',
    name: 'Private Keys',
    reference: 'https://attack.mitre.org/techniques/T1145',
    tactics: 'credential-access',
    value: 'privateKeys',
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
    tactics: 'defense-evasion',
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
    tactics: 'defense-evasion',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.rcCommonDescription',
      {
        defaultMessage: 'Rc.common (T1163)',
      }
    ),
    id: 'T1163',
    name: 'Rc.common',
    reference: 'https://attack.mitre.org/techniques/T1163',
    tactics: 'persistence',
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
    tactics: 'persistence',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.registryRunKeysStartupFolderDescription',
      { defaultMessage: 'Registry Run Keys / Startup Folder (T1060)' }
    ),
    id: 'T1060',
    name: 'Registry Run Keys / Startup Folder',
    reference: 'https://attack.mitre.org/techniques/T1060',
    tactics: 'persistence',
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
    tactics: 'defense-evasion,execution',
    value: 'regsvcsRegasm',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.regsvr32Description',
      {
        defaultMessage: 'Regsvr32 (T1117)',
      }
    ),
    id: 'T1117',
    name: 'Regsvr32',
    reference: 'https://attack.mitre.org/techniques/T1117',
    tactics: 'defense-evasion,execution',
    value: 'regsvr32',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.remoteAccessToolsDescription',
      { defaultMessage: 'Remote Access Tools (T1219)' }
    ),
    id: 'T1219',
    name: 'Remote Access Tools',
    reference: 'https://attack.mitre.org/techniques/T1219',
    tactics: 'command-and-control',
    value: 'remoteAccessTools',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.remoteDesktopProtocolDescription',
      { defaultMessage: 'Remote Desktop Protocol (T1076)' }
    ),
    id: 'T1076',
    name: 'Remote Desktop Protocol',
    reference: 'https://attack.mitre.org/techniques/T1076',
    tactics: 'lateral-movement',
    value: 'remoteDesktopProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.remoteFileCopyDescription',
      { defaultMessage: 'Remote File Copy (T1105)' }
    ),
    id: 'T1105',
    name: 'Remote File Copy',
    reference: 'https://attack.mitre.org/techniques/T1105',
    tactics: 'command-and-control,lateral-movement',
    value: 'remoteFileCopy',
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
    tactics: 'defense-evasion',
    value: 'revertCloudInstance',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.rootkitDescription',
      {
        defaultMessage: 'Rootkit (T1014)',
      }
    ),
    id: 'T1014',
    name: 'Rootkit',
    reference: 'https://attack.mitre.org/techniques/T1014',
    tactics: 'defense-evasion',
    value: 'rootkit',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.rundll32Description',
      {
        defaultMessage: 'Rundll32 (T1085)',
      }
    ),
    id: 'T1085',
    name: 'Rundll32',
    reference: 'https://attack.mitre.org/techniques/T1085',
    tactics: 'defense-evasion,execution',
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
    tactics: 'privilege-escalation',
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
    tactics: 'defense-evasion,persistence',
    value: 'sipAndTrustProviderHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sshHijackingDescription',
      { defaultMessage: 'SSH Hijacking (T1184)' }
    ),
    id: 'T1184',
    name: 'SSH Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1184',
    tactics: 'lateral-movement',
    value: 'sshHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.scheduledTaskDescription',
      { defaultMessage: 'Scheduled Task (T1053)' }
    ),
    id: 'T1053',
    name: 'Scheduled Task',
    reference: 'https://attack.mitre.org/techniques/T1053',
    tactics: 'execution,persistence,privilege-escalation',
    value: 'scheduledTask',
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
    tactics: 'persistence',
    value: 'screensaver',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.scriptingDescription',
      {
        defaultMessage: 'Scripting (T1064)',
      }
    ),
    id: 'T1064',
    name: 'Scripting',
    reference: 'https://attack.mitre.org/techniques/T1064',
    tactics: 'defense-evasion,execution',
    value: 'scripting',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.securitySoftwareDiscoveryDescription',
      { defaultMessage: 'Security Software Discovery (T1063)' }
    ),
    id: 'T1063',
    name: 'Security Software Discovery',
    reference: 'https://attack.mitre.org/techniques/T1063',
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
    tactics: 'persistence',
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
    tactics: 'execution',
    value: 'serviceExecution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.serviceRegistryPermissionsWeaknessDescription',
      { defaultMessage: 'Service Registry Permissions Weakness (T1058)' }
    ),
    id: 'T1058',
    name: 'Service Registry Permissions Weakness',
    reference: 'https://attack.mitre.org/techniques/T1058',
    tactics: 'persistence,privilege-escalation',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.setuidAndSetgidDescription',
      { defaultMessage: 'Setuid and Setgid (T1166)' }
    ),
    id: 'T1166',
    name: 'Setuid and Setgid',
    reference: 'https://attack.mitre.org/techniques/T1166',
    tactics: 'privilege-escalation,persistence',
    value: 'setuidAndSetgid',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.shortcutModificationDescription',
      { defaultMessage: 'Shortcut Modification (T1023)' }
    ),
    id: 'T1023',
    name: 'Shortcut Modification',
    reference: 'https://attack.mitre.org/techniques/T1023',
    tactics: 'persistence',
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
    tactics: 'defense-evasion,execution',
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
    tactics: 'defense-evasion,execution',
    value: 'signedScriptProxyExecution',
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
    tactics: 'defense-evasion',
    value: 'softwarePacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sourceDescription',
      {
        defaultMessage: 'Source (T1153)',
      }
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
    tactics: 'defense-evasion,execution',
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
    tactics: 'initial-access',
    value: 'spearphishingViaService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.standardApplicationLayerProtocolDescription',
      { defaultMessage: 'Standard Application Layer Protocol (T1071)' }
    ),
    id: 'T1071',
    name: 'Standard Application Layer Protocol',
    reference: 'https://attack.mitre.org/techniques/T1071',
    tactics: 'command-and-control',
    value: 'standardApplicationLayerProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.standardCryptographicProtocolDescription',
      { defaultMessage: 'Standard Cryptographic Protocol (T1032)' }
    ),
    id: 'T1032',
    name: 'Standard Cryptographic Protocol',
    reference: 'https://attack.mitre.org/techniques/T1032',
    tactics: 'command-and-control',
    value: 'standardCryptographicProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.standardNonApplicationLayerProtocolDescription',
      { defaultMessage: 'Standard Non-Application Layer Protocol (T1095)' }
    ),
    id: 'T1095',
    name: 'Standard Non-Application Layer Protocol',
    reference: 'https://attack.mitre.org/techniques/T1095',
    tactics: 'command-and-control',
    value: 'standardNonApplicationLayerProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.startupItemsDescription',
      { defaultMessage: 'Startup Items (T1165)' }
    ),
    id: 'T1165',
    name: 'Startup Items',
    reference: 'https://attack.mitre.org/techniques/T1165',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.storedDataManipulationDescription',
      { defaultMessage: 'Stored Data Manipulation (T1492)' }
    ),
    id: 'T1492',
    name: 'Stored Data Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1492',
    tactics: 'impact',
    value: 'storedDataManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.sudoDescription',
      {
        defaultMessage: 'Sudo (T1169)',
      }
    ),
    id: 'T1169',
    name: 'Sudo',
    reference: 'https://attack.mitre.org/techniques/T1169',
    tactics: 'privilege-escalation',
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
    tactics: 'privilege-escalation',
    value: 'sudoCaching',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.systemFirmwareDescription',
      { defaultMessage: 'System Firmware (T1019)' }
    ),
    id: 'T1019',
    name: 'System Firmware',
    reference: 'https://attack.mitre.org/techniques/T1019',
    tactics: 'persistence',
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
    tactics: 'persistence',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.thirdPartySoftwareDescription',
      { defaultMessage: 'Third-party Software (T1072)' }
    ),
    id: 'T1072',
    name: 'Third-party Software',
    reference: 'https://attack.mitre.org/techniques/T1072',
    tactics: 'execution,lateral-movement',
    value: 'thirdPartySoftware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.timeProvidersDescription',
      { defaultMessage: 'Time Providers (T1209)' }
    ),
    id: 'T1209',
    name: 'Time Providers',
    reference: 'https://attack.mitre.org/techniques/T1209',
    tactics: 'persistence',
    value: 'timeProviders',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.timestompDescription',
      {
        defaultMessage: 'Timestomp (T1099)',
      }
    ),
    id: 'T1099',
    name: 'Timestomp',
    reference: 'https://attack.mitre.org/techniques/T1099',
    tactics: 'defense-evasion',
    value: 'timestomp',
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
    tactics: 'impact',
    value: 'transmittedDataManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.trapDescription',
      {
        defaultMessage: 'Trap (T1154)',
      }
    ),
    id: 'T1154',
    name: 'Trap',
    reference: 'https://attack.mitre.org/techniques/T1154',
    tactics: 'execution,persistence',
    value: 'trap',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.trustedDeveloperUtilitiesDescription',
      { defaultMessage: 'Trusted Developer Utilities (T1127)' }
    ),
    id: 'T1127',
    name: 'Trusted Developer Utilities',
    reference: 'https://attack.mitre.org/techniques/T1127',
    tactics: 'defense-evasion,execution',
    value: 'trustedDeveloperUtilities',
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
    tactics: 'command-and-control',
    value: 'uncommonlyUsedPort',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.webServiceDescription',
      { defaultMessage: 'Web Service (T1102)' }
    ),
    id: 'T1102',
    name: 'Web Service',
    reference: 'https://attack.mitre.org/techniques/T1102',
    tactics: 'command-and-control,defense-evasion',
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
    tactics: 'defense-evasion,lateral-movement',
    value: 'webSessionCookie',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.webShellDescription',
      {
        defaultMessage: 'Web Shell (T1100)',
      }
    ),
    id: 'T1100',
    name: 'Web Shell',
    reference: 'https://attack.mitre.org/techniques/T1100',
    tactics: 'persistence,privilege-escalation',
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
    tactics: 'lateral-movement',
    value: 'windowsAdminShares',
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
    tactics: 'persistence',
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
    tactics: 'execution,lateral-movement',
    value: 'windowsRemoteManagement',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.winlogonHelperDllDescription',
      { defaultMessage: 'Winlogon Helper DLL (T1004)' }
    ),
    id: 'T1004',
    name: 'Winlogon Helper DLL',
    reference: 'https://attack.mitre.org/techniques/T1004',
    tactics: 'persistence',
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
    tactics: 'defense-evasion,execution',
    value: 'xslScriptProcessing',
  },
];
