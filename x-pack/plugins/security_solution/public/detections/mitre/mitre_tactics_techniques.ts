/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import { MitreTacticsOptions, MitreTechniquesOptions, MitreSubtechniquesOptions } from './types';

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
  {
    name: 'Reconnaissance',
    id: 'TA0043',
    reference: 'https://attack.mitre.org/tactics/TA0043',
  },
  {
    name: 'Resource Development',
    id: 'TA0042',
    reference: 'https://attack.mitre.org/tactics/TA0042',
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
  {
    id: 'TA0043',
    name: 'Reconnaissance',
    reference: 'https://attack.mitre.org/tactics/TA0043',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.reconnaissanceDescription',
      { defaultMessage: 'Reconnaissance (TA0043)' }
    ),
    value: 'reconnaissance',
  },
  {
    id: 'TA0042',
    name: 'Resource Development',
    reference: 'https://attack.mitre.org/tactics/TA0042',
    text: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTactics.resourceDevelopmentDescription',
      { defaultMessage: 'Resource Development (TA0042)' }
    ),
    value: 'resourceDevelopment',
  },
];

export const technique = [
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
    name: 'Acquire Infrastructure',
    id: 'T1583',
    reference: 'https://attack.mitre.org/techniques/T1583',
    tactics: ['resource-development'],
  },
  {
    name: 'Active Scanning',
    id: 'T1595',
    reference: 'https://attack.mitre.org/techniques/T1595',
    tactics: ['reconnaissance'],
  },
  {
    name: 'Application Layer Protocol',
    id: 'T1071',
    reference: 'https://attack.mitre.org/techniques/T1071',
    tactics: ['command-and-control'],
  },
  {
    name: 'Application Window Discovery',
    id: 'T1010',
    reference: 'https://attack.mitre.org/techniques/T1010',
    tactics: ['discovery'],
  },
  {
    name: 'Archive Collected Data',
    id: 'T1560',
    reference: 'https://attack.mitre.org/techniques/T1560',
    tactics: ['collection'],
  },
  {
    name: 'Audio Capture',
    id: 'T1123',
    reference: 'https://attack.mitre.org/techniques/T1123',
    tactics: ['collection'],
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
    name: 'Clipboard Data',
    id: 'T1115',
    reference: 'https://attack.mitre.org/techniques/T1115',
    tactics: ['collection'],
  },
  {
    name: 'Cloud Infrastructure Discovery',
    id: 'T1580',
    reference: 'https://attack.mitre.org/techniques/T1580',
    tactics: ['discovery'],
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
    name: 'Component Object Model and Distributed COM',
    id: 'T1175',
    reference: 'https://attack.mitre.org/techniques/T1175',
    tactics: ['lateral-movement', 'execution'],
  },
  {
    name: 'Compromise Accounts',
    id: 'T1586',
    reference: 'https://attack.mitre.org/techniques/T1586',
    tactics: ['resource-development'],
  },
  {
    name: 'Compromise Client Software Binary',
    id: 'T1554',
    reference: 'https://attack.mitre.org/techniques/T1554',
    tactics: ['persistence'],
  },
  {
    name: 'Compromise Infrastructure',
    id: 'T1584',
    reference: 'https://attack.mitre.org/techniques/T1584',
    tactics: ['resource-development'],
  },
  {
    name: 'Create Account',
    id: 'T1136',
    reference: 'https://attack.mitre.org/techniques/T1136',
    tactics: ['persistence'],
  },
  {
    name: 'Create or Modify System Process',
    id: 'T1543',
    reference: 'https://attack.mitre.org/techniques/T1543',
    tactics: ['persistence', 'privilege-escalation'],
  },
  {
    name: 'Credentials from Password Stores',
    id: 'T1555',
    reference: 'https://attack.mitre.org/techniques/T1555',
    tactics: ['credential-access'],
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
    name: 'Data from Configuration Repository',
    id: 'T1602',
    reference: 'https://attack.mitre.org/techniques/T1602',
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
    name: 'Develop Capabilities',
    id: 'T1587',
    reference: 'https://attack.mitre.org/techniques/T1587',
    tactics: ['resource-development'],
  },
  {
    name: 'Direct Volume Access',
    id: 'T1006',
    reference: 'https://attack.mitre.org/techniques/T1006',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Disk Wipe',
    id: 'T1561',
    reference: 'https://attack.mitre.org/techniques/T1561',
    tactics: ['impact'],
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
    name: 'Dynamic Resolution',
    id: 'T1568',
    reference: 'https://attack.mitre.org/techniques/T1568',
    tactics: ['command-and-control'],
  },
  {
    name: 'Email Collection',
    id: 'T1114',
    reference: 'https://attack.mitre.org/techniques/T1114',
    tactics: ['collection'],
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
    name: 'Establish Accounts',
    id: 'T1585',
    reference: 'https://attack.mitre.org/techniques/T1585',
    tactics: ['resource-development'],
  },
  {
    name: 'Event Triggered Execution',
    id: 'T1546',
    reference: 'https://attack.mitre.org/techniques/T1546',
    tactics: ['privilege-escalation', 'persistence'],
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
    name: 'Exfiltration Over Web Service',
    id: 'T1567',
    reference: 'https://attack.mitre.org/techniques/T1567',
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
    name: 'Fallback Channels',
    id: 'T1008',
    reference: 'https://attack.mitre.org/techniques/T1008',
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
    name: 'Gather Victim Host Information',
    id: 'T1592',
    reference: 'https://attack.mitre.org/techniques/T1592',
    tactics: ['reconnaissance'],
  },
  {
    name: 'Gather Victim Identity Information',
    id: 'T1589',
    reference: 'https://attack.mitre.org/techniques/T1589',
    tactics: ['reconnaissance'],
  },
  {
    name: 'Gather Victim Network Information',
    id: 'T1590',
    reference: 'https://attack.mitre.org/techniques/T1590',
    tactics: ['reconnaissance'],
  },
  {
    name: 'Gather Victim Org Information',
    id: 'T1591',
    reference: 'https://attack.mitre.org/techniques/T1591',
    tactics: ['reconnaissance'],
  },
  {
    name: 'Graphical User Interface',
    id: 'T1061',
    reference: 'https://attack.mitre.org/techniques/T1061',
    tactics: ['execution'],
  },
  {
    name: 'Hardware Additions',
    id: 'T1200',
    reference: 'https://attack.mitre.org/techniques/T1200',
    tactics: ['initial-access'],
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
    name: 'Hypervisor',
    id: 'T1062',
    reference: 'https://attack.mitre.org/techniques/T1062',
    tactics: ['persistence'],
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
    name: 'Inter-Process Communication',
    id: 'T1559',
    reference: 'https://attack.mitre.org/techniques/T1559',
    tactics: ['execution'],
  },
  {
    name: 'Internal Spearphishing',
    id: 'T1534',
    reference: 'https://attack.mitre.org/techniques/T1534',
    tactics: ['lateral-movement'],
  },
  {
    name: 'LC_MAIN Hijacking',
    id: 'T1149',
    reference: 'https://attack.mitre.org/techniques/T1149',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Lateral Tool Transfer',
    id: 'T1570',
    reference: 'https://attack.mitre.org/techniques/T1570',
    tactics: ['lateral-movement'],
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
    name: 'Masquerading',
    id: 'T1036',
    reference: 'https://attack.mitre.org/techniques/T1036',
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
    name: 'Modify Registry',
    id: 'T1112',
    reference: 'https://attack.mitre.org/techniques/T1112',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Modify System Image',
    id: 'T1601',
    reference: 'https://attack.mitre.org/techniques/T1601',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Multi-Stage Channels',
    id: 'T1104',
    reference: 'https://attack.mitre.org/techniques/T1104',
    tactics: ['command-and-control'],
  },
  {
    name: 'Multiband Communication',
    id: 'T1026',
    reference: 'https://attack.mitre.org/techniques/T1026',
    tactics: ['command-and-control'],
  },
  {
    name: 'Native API',
    id: 'T1106',
    reference: 'https://attack.mitre.org/techniques/T1106',
    tactics: ['execution'],
  },
  {
    name: 'Network Boundary Bridging',
    id: 'T1599',
    reference: 'https://attack.mitre.org/techniques/T1599',
    tactics: ['defense-evasion'],
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
    name: 'Non-Application Layer Protocol',
    id: 'T1095',
    reference: 'https://attack.mitre.org/techniques/T1095',
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
    name: 'Obfuscated Files or Information',
    id: 'T1027',
    reference: 'https://attack.mitre.org/techniques/T1027',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Obtain Capabilities',
    id: 'T1588',
    reference: 'https://attack.mitre.org/techniques/T1588',
    tactics: ['resource-development'],
  },
  {
    name: 'Office Application Startup',
    id: 'T1137',
    reference: 'https://attack.mitre.org/techniques/T1137',
    tactics: ['persistence'],
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
    name: 'Phishing',
    id: 'T1566',
    reference: 'https://attack.mitre.org/techniques/T1566',
    tactics: ['initial-access'],
  },
  {
    name: 'Phishing for Information',
    id: 'T1598',
    reference: 'https://attack.mitre.org/techniques/T1598',
    tactics: ['reconnaissance'],
  },
  {
    name: 'Pre-OS Boot',
    id: 'T1542',
    reference: 'https://attack.mitre.org/techniques/T1542',
    tactics: ['defense-evasion', 'persistence'],
  },
  {
    name: 'Process Discovery',
    id: 'T1057',
    reference: 'https://attack.mitre.org/techniques/T1057',
    tactics: ['discovery'],
  },
  {
    name: 'Process Injection',
    id: 'T1055',
    reference: 'https://attack.mitre.org/techniques/T1055',
    tactics: ['defense-evasion', 'privilege-escalation'],
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
    name: 'Query Registry',
    id: 'T1012',
    reference: 'https://attack.mitre.org/techniques/T1012',
    tactics: ['discovery'],
  },
  {
    name: 'Redundant Access',
    id: 'T1108',
    reference: 'https://attack.mitre.org/techniques/T1108',
    tactics: ['defense-evasion', 'persistence'],
  },
  {
    name: 'Remote Access Software',
    id: 'T1219',
    reference: 'https://attack.mitre.org/techniques/T1219',
    tactics: ['command-and-control'],
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
    name: 'Scripting',
    id: 'T1064',
    reference: 'https://attack.mitre.org/techniques/T1064',
    tactics: ['defense-evasion', 'execution'],
  },
  {
    name: 'Search Closed Sources',
    id: 'T1597',
    reference: 'https://attack.mitre.org/techniques/T1597',
    tactics: ['reconnaissance'],
  },
  {
    name: 'Search Open Technical Databases',
    id: 'T1596',
    reference: 'https://attack.mitre.org/techniques/T1596',
    tactics: ['reconnaissance'],
  },
  {
    name: 'Search Open Websites/Domains',
    id: 'T1593',
    reference: 'https://attack.mitre.org/techniques/T1593',
    tactics: ['reconnaissance'],
  },
  {
    name: 'Search Victim-Owned Websites',
    id: 'T1594',
    reference: 'https://attack.mitre.org/techniques/T1594',
    tactics: ['reconnaissance'],
  },
  {
    name: 'Server Software Component',
    id: 'T1505',
    reference: 'https://attack.mitre.org/techniques/T1505',
    tactics: ['persistence'],
  },
  {
    name: 'Service Stop',
    id: 'T1489',
    reference: 'https://attack.mitre.org/techniques/T1489',
    tactics: ['impact'],
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
    name: 'Source',
    id: 'T1153',
    reference: 'https://attack.mitre.org/techniques/T1153',
    tactics: ['execution'],
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
    name: 'Subvert Trust Controls',
    id: 'T1553',
    reference: 'https://attack.mitre.org/techniques/T1553',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Supply Chain Compromise',
    id: 'T1195',
    reference: 'https://attack.mitre.org/techniques/T1195',
    tactics: ['initial-access'],
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
    name: 'Weaken Encryption',
    id: 'T1600',
    reference: 'https://attack.mitre.org/techniques/T1600',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Web Service',
    id: 'T1102',
    reference: 'https://attack.mitre.org/techniques/T1102',
    tactics: ['command-and-control'],
  },
  {
    name: 'Windows Management Instrumentation',
    id: 'T1047',
    reference: 'https://attack.mitre.org/techniques/T1047',
    tactics: ['execution'],
  },
  {
    name: 'XSL Script Processing',
    id: 'T1220',
    reference: 'https://attack.mitre.org/techniques/T1220',
    tactics: ['defense-evasion'],
  },
  {
    name: 'Domain Policy Modification',
    id: 'T1484',
    reference: 'https://attack.mitre.org/techniques/T1484',
    tactics: ['defense-evasion', 'privilege-escalation'],
  },
  {
    name: 'Forge Web Credentials',
    id: 'T1606',
    reference: 'https://attack.mitre.org/techniques/T1606',
    tactics: ['credential-access'],
  },
];

export const techniquesOptions: MitreTechniquesOptions[] = [
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.acquireInfrastructureDescription',
      { defaultMessage: 'Acquire Infrastructure (T1583)' }
    ),
    id: 'T1583',
    name: 'Acquire Infrastructure',
    reference: 'https://attack.mitre.org/techniques/T1583',
    tactics: 'resource-development',
    value: 'acquireInfrastructure',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.activeScanningDescription',
      { defaultMessage: 'Active Scanning (T1595)' }
    ),
    id: 'T1595',
    name: 'Active Scanning',
    reference: 'https://attack.mitre.org/techniques/T1595',
    tactics: 'reconnaissance',
    value: 'activeScanning',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.cloudInfrastructureDiscoveryDescription',
      { defaultMessage: 'Cloud Infrastructure Discovery (T1580)' }
    ),
    id: 'T1580',
    name: 'Cloud Infrastructure Discovery',
    reference: 'https://attack.mitre.org/techniques/T1580',
    tactics: 'discovery',
    value: 'cloudInfrastructureDiscovery',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.compromiseAccountsDescription',
      { defaultMessage: 'Compromise Accounts (T1586)' }
    ),
    id: 'T1586',
    name: 'Compromise Accounts',
    reference: 'https://attack.mitre.org/techniques/T1586',
    tactics: 'resource-development',
    value: 'compromiseAccounts',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.compromiseInfrastructureDescription',
      { defaultMessage: 'Compromise Infrastructure (T1584)' }
    ),
    id: 'T1584',
    name: 'Compromise Infrastructure',
    reference: 'https://attack.mitre.org/techniques/T1584',
    tactics: 'resource-development',
    value: 'compromiseInfrastructure',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.dataFromConfigurationRepositoryDescription',
      { defaultMessage: 'Data from Configuration Repository (T1602)' }
    ),
    id: 'T1602',
    name: 'Data from Configuration Repository',
    reference: 'https://attack.mitre.org/techniques/T1602',
    tactics: 'collection',
    value: 'dataFromConfigurationRepository',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.developCapabilitiesDescription',
      { defaultMessage: 'Develop Capabilities (T1587)' }
    ),
    id: 'T1587',
    name: 'Develop Capabilities',
    reference: 'https://attack.mitre.org/techniques/T1587',
    tactics: 'resource-development',
    value: 'developCapabilities',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.establishAccountsDescription',
      { defaultMessage: 'Establish Accounts (T1585)' }
    ),
    id: 'T1585',
    name: 'Establish Accounts',
    reference: 'https://attack.mitre.org/techniques/T1585',
    tactics: 'resource-development',
    value: 'establishAccounts',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.gatherVictimHostInformationDescription',
      { defaultMessage: 'Gather Victim Host Information (T1592)' }
    ),
    id: 'T1592',
    name: 'Gather Victim Host Information',
    reference: 'https://attack.mitre.org/techniques/T1592',
    tactics: 'reconnaissance',
    value: 'gatherVictimHostInformation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.gatherVictimIdentityInformationDescription',
      { defaultMessage: 'Gather Victim Identity Information (T1589)' }
    ),
    id: 'T1589',
    name: 'Gather Victim Identity Information',
    reference: 'https://attack.mitre.org/techniques/T1589',
    tactics: 'reconnaissance',
    value: 'gatherVictimIdentityInformation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.gatherVictimNetworkInformationDescription',
      { defaultMessage: 'Gather Victim Network Information (T1590)' }
    ),
    id: 'T1590',
    name: 'Gather Victim Network Information',
    reference: 'https://attack.mitre.org/techniques/T1590',
    tactics: 'reconnaissance',
    value: 'gatherVictimNetworkInformation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.gatherVictimOrgInformationDescription',
      { defaultMessage: 'Gather Victim Org Information (T1591)' }
    ),
    id: 'T1591',
    name: 'Gather Victim Org Information',
    reference: 'https://attack.mitre.org/techniques/T1591',
    tactics: 'reconnaissance',
    value: 'gatherVictimOrgInformation',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.modifySystemImageDescription',
      { defaultMessage: 'Modify System Image (T1601)' }
    ),
    id: 'T1601',
    name: 'Modify System Image',
    reference: 'https://attack.mitre.org/techniques/T1601',
    tactics: 'defense-evasion',
    value: 'modifySystemImage',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.networkBoundaryBridgingDescription',
      { defaultMessage: 'Network Boundary Bridging (T1599)' }
    ),
    id: 'T1599',
    name: 'Network Boundary Bridging',
    reference: 'https://attack.mitre.org/techniques/T1599',
    tactics: 'defense-evasion',
    value: 'networkBoundaryBridging',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.obtainCapabilitiesDescription',
      { defaultMessage: 'Obtain Capabilities (T1588)' }
    ),
    id: 'T1588',
    name: 'Obtain Capabilities',
    reference: 'https://attack.mitre.org/techniques/T1588',
    tactics: 'resource-development',
    value: 'obtainCapabilities',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.phishingForInformationDescription',
      { defaultMessage: 'Phishing for Information (T1598)' }
    ),
    id: 'T1598',
    name: 'Phishing for Information',
    reference: 'https://attack.mitre.org/techniques/T1598',
    tactics: 'reconnaissance',
    value: 'phishingForInformation',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.searchClosedSourcesDescription',
      { defaultMessage: 'Search Closed Sources (T1597)' }
    ),
    id: 'T1597',
    name: 'Search Closed Sources',
    reference: 'https://attack.mitre.org/techniques/T1597',
    tactics: 'reconnaissance',
    value: 'searchClosedSources',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.searchOpenTechnicalDatabasesDescription',
      { defaultMessage: 'Search Open Technical Databases (T1596)' }
    ),
    id: 'T1596',
    name: 'Search Open Technical Databases',
    reference: 'https://attack.mitre.org/techniques/T1596',
    tactics: 'reconnaissance',
    value: 'searchOpenTechnicalDatabases',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.searchOpenWebsitesDomainsDescription',
      { defaultMessage: 'Search Open Websites/Domains (T1593)' }
    ),
    id: 'T1593',
    name: 'Search Open Websites/Domains',
    reference: 'https://attack.mitre.org/techniques/T1593',
    tactics: 'reconnaissance',
    value: 'searchOpenWebsitesDomains',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.searchVictimOwnedWebsitesDescription',
      { defaultMessage: 'Search Victim-Owned Websites (T1594)' }
    ),
    id: 'T1594',
    name: 'Search Victim-Owned Websites',
    reference: 'https://attack.mitre.org/techniques/T1594',
    tactics: 'reconnaissance',
    value: 'searchVictimOwnedWebsites',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.weakenEncryptionDescription',
      { defaultMessage: 'Weaken Encryption (T1600)' }
    ),
    id: 'T1600',
    name: 'Weaken Encryption',
    reference: 'https://attack.mitre.org/techniques/T1600',
    tactics: 'defense-evasion',
    value: 'weakenEncryption',
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
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.xslScriptProcessingDescription',
      { defaultMessage: 'XSL Script Processing (T1220)' }
    ),
    id: 'T1220',
    name: 'XSL Script Processing',
    reference: 'https://attack.mitre.org/techniques/T1220',
    tactics: 'defense-evasion',
    value: 'xslScriptProcessing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.domainPolicyModificationDescription',
      { defaultMessage: 'Domain Policy Modification (T1484)' }
    ),
    id: 'T1484',
    name: 'Domain Policy Modification',
    reference: 'https://attack.mitre.org/techniques/T1484',
    tactics: 'defense-evasion,privilege-escalation',
    value: 'domainPolicyModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackTechniques.forgeWebCredentialsDescription',
      { defaultMessage: 'Forge Web Credentials (T1606)' }
    ),
    id: 'T1606',
    name: 'Forge Web Credentials',
    reference: 'https://attack.mitre.org/techniques/T1606',
    tactics: 'credential-access',
    value: 'forgeWebCredentials',
  },
];

export const subtechniques = [
  {
    name: '.bash_profile and .bashrc',
    id: 'T1546.004',
    reference: 'https://attack.mitre.org/techniques/T1546/004',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: '/etc/passwd and /etc/shadow',
    id: 'T1003.008',
    reference: 'https://attack.mitre.org/techniques/T1003/008',
    tactics: ['credential-access'],
    techniqueId: 'T1003',
  },
  {
    name: 'ARP Cache Poisoning',
    id: 'T1557.002',
    reference: 'https://attack.mitre.org/techniques/T1557/002',
    tactics: ['credential-access', 'collection'],
    techniqueId: 'T1557',
  },
  {
    name: 'AS-REP Roasting',
    id: 'T1558.004',
    reference: 'https://attack.mitre.org/techniques/T1558/004',
    tactics: ['credential-access'],
    techniqueId: 'T1558',
  },
  {
    name: 'Accessibility Features',
    id: 'T1546.008',
    reference: 'https://attack.mitre.org/techniques/T1546/008',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'Add Office 365 Global Administrator Role',
    id: 'T1098.003',
    reference: 'https://attack.mitre.org/techniques/T1098/003',
    tactics: ['persistence'],
    techniqueId: 'T1098',
  },
  {
    name: 'Add-ins',
    id: 'T1137.006',
    reference: 'https://attack.mitre.org/techniques/T1137/006',
    tactics: ['persistence'],
    techniqueId: 'T1137',
  },
  {
    name: 'AppCert DLLs',
    id: 'T1546.009',
    reference: 'https://attack.mitre.org/techniques/T1546/009',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'AppInit DLLs',
    id: 'T1546.010',
    reference: 'https://attack.mitre.org/techniques/T1546/010',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'AppleScript',
    id: 'T1059.002',
    reference: 'https://attack.mitre.org/techniques/T1059/002',
    tactics: ['execution'],
    techniqueId: 'T1059',
  },
  {
    name: 'Application Access Token',
    id: 'T1550.001',
    reference: 'https://attack.mitre.org/techniques/T1550/001',
    tactics: ['defense-evasion', 'lateral-movement'],
    techniqueId: 'T1550',
  },
  {
    name: 'Application Exhaustion Flood',
    id: 'T1499.003',
    reference: 'https://attack.mitre.org/techniques/T1499/003',
    tactics: ['impact'],
    techniqueId: 'T1499',
  },
  {
    name: 'Application Shimming',
    id: 'T1546.011',
    reference: 'https://attack.mitre.org/techniques/T1546/011',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'Application or System Exploitation',
    id: 'T1499.004',
    reference: 'https://attack.mitre.org/techniques/T1499/004',
    tactics: ['impact'],
    techniqueId: 'T1499',
  },
  {
    name: 'Archive via Custom Method',
    id: 'T1560.003',
    reference: 'https://attack.mitre.org/techniques/T1560/003',
    tactics: ['collection'],
    techniqueId: 'T1560',
  },
  {
    name: 'Archive via Library',
    id: 'T1560.002',
    reference: 'https://attack.mitre.org/techniques/T1560/002',
    tactics: ['collection'],
    techniqueId: 'T1560',
  },
  {
    name: 'Archive via Utility',
    id: 'T1560.001',
    reference: 'https://attack.mitre.org/techniques/T1560/001',
    tactics: ['collection'],
    techniqueId: 'T1560',
  },
  {
    name: 'Asymmetric Cryptography',
    id: 'T1573.002',
    reference: 'https://attack.mitre.org/techniques/T1573/002',
    tactics: ['command-and-control'],
    techniqueId: 'T1573',
  },
  {
    name: 'Asynchronous Procedure Call',
    id: 'T1055.004',
    reference: 'https://attack.mitre.org/techniques/T1055/004',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1055',
  },
  {
    name: 'At (Linux)',
    id: 'T1053.001',
    reference: 'https://attack.mitre.org/techniques/T1053/001',
    tactics: ['execution', 'persistence', 'privilege-escalation'],
    techniqueId: 'T1053',
  },
  {
    name: 'At (Windows)',
    id: 'T1053.002',
    reference: 'https://attack.mitre.org/techniques/T1053/002',
    tactics: ['execution', 'persistence', 'privilege-escalation'],
    techniqueId: 'T1053',
  },
  {
    name: 'Authentication Package',
    id: 'T1547.002',
    reference: 'https://attack.mitre.org/techniques/T1547/002',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1547',
  },
  {
    name: 'Bash History',
    id: 'T1552.003',
    reference: 'https://attack.mitre.org/techniques/T1552/003',
    tactics: ['credential-access'],
    techniqueId: 'T1552',
  },
  {
    name: 'Bidirectional Communication',
    id: 'T1102.002',
    reference: 'https://attack.mitre.org/techniques/T1102/002',
    tactics: ['command-and-control'],
    techniqueId: 'T1102',
  },
  {
    name: 'Binary Padding',
    id: 'T1027.001',
    reference: 'https://attack.mitre.org/techniques/T1027/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1027',
  },
  {
    name: 'Bootkit',
    id: 'T1542.003',
    reference: 'https://attack.mitre.org/techniques/T1542/003',
    tactics: ['persistence', 'defense-evasion'],
    techniqueId: 'T1542',
  },
  {
    name: 'Botnet',
    id: 'T1583.005',
    reference: 'https://attack.mitre.org/techniques/T1583/005',
    tactics: ['resource-development'],
    techniqueId: 'T1583',
  },
  {
    name: 'Botnet',
    id: 'T1584.005',
    reference: 'https://attack.mitre.org/techniques/T1584/005',
    tactics: ['resource-development'],
    techniqueId: 'T1584',
  },
  {
    name: 'Business Relationships',
    id: 'T1591.002',
    reference: 'https://attack.mitre.org/techniques/T1591/002',
    tactics: ['reconnaissance'],
    techniqueId: 'T1591',
  },
  {
    name: 'Bypass User Account Control',
    id: 'T1548.002',
    reference: 'https://attack.mitre.org/techniques/T1548/002',
    tactics: ['privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1548',
  },
  {
    name: 'CDNs',
    id: 'T1596.004',
    reference: 'https://attack.mitre.org/techniques/T1596/004',
    tactics: ['reconnaissance'],
    techniqueId: 'T1596',
  },
  {
    name: 'CMSTP',
    id: 'T1218.003',
    reference: 'https://attack.mitre.org/techniques/T1218/003',
    tactics: ['defense-evasion'],
    techniqueId: 'T1218',
  },
  {
    name: 'COR_PROFILER',
    id: 'T1574.012',
    reference: 'https://attack.mitre.org/techniques/T1574/012',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1574',
  },
  {
    name: 'Cached Domain Credentials',
    id: 'T1003.005',
    reference: 'https://attack.mitre.org/techniques/T1003/005',
    tactics: ['credential-access'],
    techniqueId: 'T1003',
  },
  {
    name: 'Change Default File Association',
    id: 'T1546.001',
    reference: 'https://attack.mitre.org/techniques/T1546/001',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'Clear Command History',
    id: 'T1070.003',
    reference: 'https://attack.mitre.org/techniques/T1070/003',
    tactics: ['defense-evasion'],
    techniqueId: 'T1070',
  },
  {
    name: 'Clear Linux or Mac System Logs',
    id: 'T1070.002',
    reference: 'https://attack.mitre.org/techniques/T1070/002',
    tactics: ['defense-evasion'],
    techniqueId: 'T1070',
  },
  {
    name: 'Clear Windows Event Logs',
    id: 'T1070.001',
    reference: 'https://attack.mitre.org/techniques/T1070/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1070',
  },
  {
    name: 'Client Configurations',
    id: 'T1592.004',
    reference: 'https://attack.mitre.org/techniques/T1592/004',
    tactics: ['reconnaissance'],
    techniqueId: 'T1592',
  },
  {
    name: 'Cloud Account',
    id: 'T1136.003',
    reference: 'https://attack.mitre.org/techniques/T1136/003',
    tactics: ['persistence'],
    techniqueId: 'T1136',
  },
  {
    name: 'Cloud Account',
    id: 'T1087.004',
    reference: 'https://attack.mitre.org/techniques/T1087/004',
    tactics: ['discovery'],
    techniqueId: 'T1087',
  },
  {
    name: 'Cloud Accounts',
    id: 'T1078.004',
    reference: 'https://attack.mitre.org/techniques/T1078/004',
    tactics: ['defense-evasion', 'persistence', 'privilege-escalation', 'initial-access'],
    techniqueId: 'T1078',
  },
  {
    name: 'Cloud Groups',
    id: 'T1069.003',
    reference: 'https://attack.mitre.org/techniques/T1069/003',
    tactics: ['discovery'],
    techniqueId: 'T1069',
  },
  {
    name: 'Cloud Instance Metadata API',
    id: 'T1552.005',
    reference: 'https://attack.mitre.org/techniques/T1552/005',
    tactics: ['credential-access'],
    techniqueId: 'T1552',
  },
  {
    name: 'Code Signing',
    id: 'T1553.002',
    reference: 'https://attack.mitre.org/techniques/T1553/002',
    tactics: ['defense-evasion'],
    techniqueId: 'T1553',
  },
  {
    name: 'Code Signing Certificates',
    id: 'T1587.002',
    reference: 'https://attack.mitre.org/techniques/T1587/002',
    tactics: ['resource-development'],
    techniqueId: 'T1587',
  },
  {
    name: 'Code Signing Certificates',
    id: 'T1588.003',
    reference: 'https://attack.mitre.org/techniques/T1588/003',
    tactics: ['resource-development'],
    techniqueId: 'T1588',
  },
  {
    name: 'Compile After Delivery',
    id: 'T1027.004',
    reference: 'https://attack.mitre.org/techniques/T1027/004',
    tactics: ['defense-evasion'],
    techniqueId: 'T1027',
  },
  {
    name: 'Compiled HTML File',
    id: 'T1218.001',
    reference: 'https://attack.mitre.org/techniques/T1218/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1218',
  },
  {
    name: 'Component Firmware',
    id: 'T1542.002',
    reference: 'https://attack.mitre.org/techniques/T1542/002',
    tactics: ['persistence', 'defense-evasion'],
    techniqueId: 'T1542',
  },
  {
    name: 'Component Object Model',
    id: 'T1559.001',
    reference: 'https://attack.mitre.org/techniques/T1559/001',
    tactics: ['execution'],
    techniqueId: 'T1559',
  },
  {
    name: 'Component Object Model Hijacking',
    id: 'T1546.015',
    reference: 'https://attack.mitre.org/techniques/T1546/015',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'Compromise Hardware Supply Chain',
    id: 'T1195.003',
    reference: 'https://attack.mitre.org/techniques/T1195/003',
    tactics: ['initial-access'],
    techniqueId: 'T1195',
  },
  {
    name: 'Compromise Software Dependencies and Development Tools',
    id: 'T1195.001',
    reference: 'https://attack.mitre.org/techniques/T1195/001',
    tactics: ['initial-access'],
    techniqueId: 'T1195',
  },
  {
    name: 'Compromise Software Supply Chain',
    id: 'T1195.002',
    reference: 'https://attack.mitre.org/techniques/T1195/002',
    tactics: ['initial-access'],
    techniqueId: 'T1195',
  },
  {
    name: 'Confluence',
    id: 'T1213.001',
    reference: 'https://attack.mitre.org/techniques/T1213/001',
    tactics: ['collection'],
    techniqueId: 'T1213',
  },
  {
    name: 'Control Panel',
    id: 'T1218.002',
    reference: 'https://attack.mitre.org/techniques/T1218/002',
    tactics: ['defense-evasion'],
    techniqueId: 'T1218',
  },
  {
    name: 'Create Cloud Instance',
    id: 'T1578.002',
    reference: 'https://attack.mitre.org/techniques/T1578/002',
    tactics: ['defense-evasion'],
    techniqueId: 'T1578',
  },
  {
    name: 'Create Process with Token',
    id: 'T1134.002',
    reference: 'https://attack.mitre.org/techniques/T1134/002',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1134',
  },
  {
    name: 'Create Snapshot',
    id: 'T1578.001',
    reference: 'https://attack.mitre.org/techniques/T1578/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1578',
  },
  {
    name: 'Credential API Hooking',
    id: 'T1056.004',
    reference: 'https://attack.mitre.org/techniques/T1056/004',
    tactics: ['collection', 'credential-access'],
    techniqueId: 'T1056',
  },
  {
    name: 'Credential Stuffing',
    id: 'T1110.004',
    reference: 'https://attack.mitre.org/techniques/T1110/004',
    tactics: ['credential-access'],
    techniqueId: 'T1110',
  },
  {
    name: 'Credentials',
    id: 'T1589.001',
    reference: 'https://attack.mitre.org/techniques/T1589/001',
    tactics: ['reconnaissance'],
    techniqueId: 'T1589',
  },
  {
    name: 'Credentials In Files',
    id: 'T1552.001',
    reference: 'https://attack.mitre.org/techniques/T1552/001',
    tactics: ['credential-access'],
    techniqueId: 'T1552',
  },
  {
    name: 'Credentials from Web Browsers',
    id: 'T1555.003',
    reference: 'https://attack.mitre.org/techniques/T1555/003',
    tactics: ['credential-access'],
    techniqueId: 'T1555',
  },
  {
    name: 'Credentials in Registry',
    id: 'T1552.002',
    reference: 'https://attack.mitre.org/techniques/T1552/002',
    tactics: ['credential-access'],
    techniqueId: 'T1552',
  },
  {
    name: 'Cron',
    id: 'T1053.003',
    reference: 'https://attack.mitre.org/techniques/T1053/003',
    tactics: ['execution', 'persistence', 'privilege-escalation'],
    techniqueId: 'T1053',
  },
  {
    name: 'DCSync',
    id: 'T1003.006',
    reference: 'https://attack.mitre.org/techniques/T1003/006',
    tactics: ['credential-access'],
    techniqueId: 'T1003',
  },
  {
    name: 'DLL Search Order Hijacking',
    id: 'T1574.001',
    reference: 'https://attack.mitre.org/techniques/T1574/001',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1574',
  },
  {
    name: 'DLL Side-Loading',
    id: 'T1574.002',
    reference: 'https://attack.mitre.org/techniques/T1574/002',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1574',
  },
  {
    name: 'DNS',
    id: 'T1071.004',
    reference: 'https://attack.mitre.org/techniques/T1071/004',
    tactics: ['command-and-control'],
    techniqueId: 'T1071',
  },
  {
    name: 'DNS',
    id: 'T1590.002',
    reference: 'https://attack.mitre.org/techniques/T1590/002',
    tactics: ['reconnaissance'],
    techniqueId: 'T1590',
  },
  {
    name: 'DNS Calculation',
    id: 'T1568.003',
    reference: 'https://attack.mitre.org/techniques/T1568/003',
    tactics: ['command-and-control'],
    techniqueId: 'T1568',
  },
  {
    name: 'DNS Server',
    id: 'T1583.002',
    reference: 'https://attack.mitre.org/techniques/T1583/002',
    tactics: ['resource-development'],
    techniqueId: 'T1583',
  },
  {
    name: 'DNS Server',
    id: 'T1584.002',
    reference: 'https://attack.mitre.org/techniques/T1584/002',
    tactics: ['resource-development'],
    techniqueId: 'T1584',
  },
  {
    name: 'DNS/Passive DNS',
    id: 'T1596.001',
    reference: 'https://attack.mitre.org/techniques/T1596/001',
    tactics: ['reconnaissance'],
    techniqueId: 'T1596',
  },
  {
    name: 'Dead Drop Resolver',
    id: 'T1102.001',
    reference: 'https://attack.mitre.org/techniques/T1102/001',
    tactics: ['command-and-control'],
    techniqueId: 'T1102',
  },
  {
    name: 'Default Accounts',
    id: 'T1078.001',
    reference: 'https://attack.mitre.org/techniques/T1078/001',
    tactics: ['defense-evasion', 'persistence', 'privilege-escalation', 'initial-access'],
    techniqueId: 'T1078',
  },
  {
    name: 'Delete Cloud Instance',
    id: 'T1578.003',
    reference: 'https://attack.mitre.org/techniques/T1578/003',
    tactics: ['defense-evasion'],
    techniqueId: 'T1578',
  },
  {
    name: 'Determine Physical Locations',
    id: 'T1591.001',
    reference: 'https://attack.mitre.org/techniques/T1591/001',
    tactics: ['reconnaissance'],
    techniqueId: 'T1591',
  },
  {
    name: 'Digital Certificates',
    id: 'T1587.003',
    reference: 'https://attack.mitre.org/techniques/T1587/003',
    tactics: ['resource-development'],
    techniqueId: 'T1587',
  },
  {
    name: 'Digital Certificates',
    id: 'T1588.004',
    reference: 'https://attack.mitre.org/techniques/T1588/004',
    tactics: ['resource-development'],
    techniqueId: 'T1588',
  },
  {
    name: 'Digital Certificates',
    id: 'T1596.003',
    reference: 'https://attack.mitre.org/techniques/T1596/003',
    tactics: ['reconnaissance'],
    techniqueId: 'T1596',
  },
  {
    name: 'Direct Network Flood',
    id: 'T1498.001',
    reference: 'https://attack.mitre.org/techniques/T1498/001',
    tactics: ['impact'],
    techniqueId: 'T1498',
  },
  {
    name: 'Disable Cloud Logs',
    id: 'T1562.008',
    reference: 'https://attack.mitre.org/techniques/T1562/008',
    tactics: ['defense-evasion'],
    techniqueId: 'T1562',
  },
  {
    name: 'Disable Crypto Hardware',
    id: 'T1600.002',
    reference: 'https://attack.mitre.org/techniques/T1600/002',
    tactics: ['defense-evasion'],
    techniqueId: 'T1600',
  },
  {
    name: 'Disable Windows Event Logging',
    id: 'T1562.002',
    reference: 'https://attack.mitre.org/techniques/T1562/002',
    tactics: ['defense-evasion'],
    techniqueId: 'T1562',
  },
  {
    name: 'Disable or Modify Cloud Firewall',
    id: 'T1562.007',
    reference: 'https://attack.mitre.org/techniques/T1562/007',
    tactics: ['defense-evasion'],
    techniqueId: 'T1562',
  },
  {
    name: 'Disable or Modify System Firewall',
    id: 'T1562.004',
    reference: 'https://attack.mitre.org/techniques/T1562/004',
    tactics: ['defense-evasion'],
    techniqueId: 'T1562',
  },
  {
    name: 'Disable or Modify Tools',
    id: 'T1562.001',
    reference: 'https://attack.mitre.org/techniques/T1562/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1562',
  },
  {
    name: 'Disk Content Wipe',
    id: 'T1561.001',
    reference: 'https://attack.mitre.org/techniques/T1561/001',
    tactics: ['impact'],
    techniqueId: 'T1561',
  },
  {
    name: 'Disk Structure Wipe',
    id: 'T1561.002',
    reference: 'https://attack.mitre.org/techniques/T1561/002',
    tactics: ['impact'],
    techniqueId: 'T1561',
  },
  {
    name: 'Distributed Component Object Model',
    id: 'T1021.003',
    reference: 'https://attack.mitre.org/techniques/T1021/003',
    tactics: ['lateral-movement'],
    techniqueId: 'T1021',
  },
  {
    name: 'Domain Account',
    id: 'T1136.002',
    reference: 'https://attack.mitre.org/techniques/T1136/002',
    tactics: ['persistence'],
    techniqueId: 'T1136',
  },
  {
    name: 'Domain Account',
    id: 'T1087.002',
    reference: 'https://attack.mitre.org/techniques/T1087/002',
    tactics: ['discovery'],
    techniqueId: 'T1087',
  },
  {
    name: 'Domain Accounts',
    id: 'T1078.002',
    reference: 'https://attack.mitre.org/techniques/T1078/002',
    tactics: ['defense-evasion', 'persistence', 'privilege-escalation', 'initial-access'],
    techniqueId: 'T1078',
  },
  {
    name: 'Domain Controller Authentication',
    id: 'T1556.001',
    reference: 'https://attack.mitre.org/techniques/T1556/001',
    tactics: ['credential-access', 'defense-evasion'],
    techniqueId: 'T1556',
  },
  {
    name: 'Domain Fronting',
    id: 'T1090.004',
    reference: 'https://attack.mitre.org/techniques/T1090/004',
    tactics: ['command-and-control'],
    techniqueId: 'T1090',
  },
  {
    name: 'Domain Generation Algorithms',
    id: 'T1568.002',
    reference: 'https://attack.mitre.org/techniques/T1568/002',
    tactics: ['command-and-control'],
    techniqueId: 'T1568',
  },
  {
    name: 'Domain Groups',
    id: 'T1069.002',
    reference: 'https://attack.mitre.org/techniques/T1069/002',
    tactics: ['discovery'],
    techniqueId: 'T1069',
  },
  {
    name: 'Domain Properties',
    id: 'T1590.001',
    reference: 'https://attack.mitre.org/techniques/T1590/001',
    tactics: ['reconnaissance'],
    techniqueId: 'T1590',
  },
  {
    name: 'Domains',
    id: 'T1583.001',
    reference: 'https://attack.mitre.org/techniques/T1583/001',
    tactics: ['resource-development'],
    techniqueId: 'T1583',
  },
  {
    name: 'Domains',
    id: 'T1584.001',
    reference: 'https://attack.mitre.org/techniques/T1584/001',
    tactics: ['resource-development'],
    techniqueId: 'T1584',
  },
  {
    name: 'Downgrade System Image',
    id: 'T1601.002',
    reference: 'https://attack.mitre.org/techniques/T1601/002',
    tactics: ['defense-evasion'],
    techniqueId: 'T1601',
  },
  {
    name: 'Dylib Hijacking',
    id: 'T1574.004',
    reference: 'https://attack.mitre.org/techniques/T1574/004',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1574',
  },
  {
    name: 'Dynamic Data Exchange',
    id: 'T1559.002',
    reference: 'https://attack.mitre.org/techniques/T1559/002',
    tactics: ['execution'],
    techniqueId: 'T1559',
  },
  {
    name: 'Dynamic-link Library Injection',
    id: 'T1055.001',
    reference: 'https://attack.mitre.org/techniques/T1055/001',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1055',
  },
  {
    name: 'Elevated Execution with Prompt',
    id: 'T1548.004',
    reference: 'https://attack.mitre.org/techniques/T1548/004',
    tactics: ['privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1548',
  },
  {
    name: 'Email Account',
    id: 'T1087.003',
    reference: 'https://attack.mitre.org/techniques/T1087/003',
    tactics: ['discovery'],
    techniqueId: 'T1087',
  },
  {
    name: 'Email Accounts',
    id: 'T1585.002',
    reference: 'https://attack.mitre.org/techniques/T1585/002',
    tactics: ['resource-development'],
    techniqueId: 'T1585',
  },
  {
    name: 'Email Accounts',
    id: 'T1586.002',
    reference: 'https://attack.mitre.org/techniques/T1586/002',
    tactics: ['resource-development'],
    techniqueId: 'T1586',
  },
  {
    name: 'Email Addresses',
    id: 'T1589.002',
    reference: 'https://attack.mitre.org/techniques/T1589/002',
    tactics: ['reconnaissance'],
    techniqueId: 'T1589',
  },
  {
    name: 'Email Forwarding Rule',
    id: 'T1114.003',
    reference: 'https://attack.mitre.org/techniques/T1114/003',
    tactics: ['collection'],
    techniqueId: 'T1114',
  },
  {
    name: 'Emond',
    id: 'T1546.014',
    reference: 'https://attack.mitre.org/techniques/T1546/014',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'Employee Names',
    id: 'T1589.003',
    reference: 'https://attack.mitre.org/techniques/T1589/003',
    tactics: ['reconnaissance'],
    techniqueId: 'T1589',
  },
  {
    name: 'Environmental Keying',
    id: 'T1480.001',
    reference: 'https://attack.mitre.org/techniques/T1480/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1480',
  },
  {
    name: 'Exchange Email Delegate Permissions',
    id: 'T1098.002',
    reference: 'https://attack.mitre.org/techniques/T1098/002',
    tactics: ['persistence'],
    techniqueId: 'T1098',
  },
  {
    name: 'Executable Installer File Permissions Weakness',
    id: 'T1574.005',
    reference: 'https://attack.mitre.org/techniques/T1574/005',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1574',
  },
  {
    name: 'Exfiltration Over Asymmetric Encrypted Non-C2 Protocol',
    id: 'T1048.002',
    reference: 'https://attack.mitre.org/techniques/T1048/002',
    tactics: ['exfiltration'],
    techniqueId: 'T1048',
  },
  {
    name: 'Exfiltration Over Bluetooth',
    id: 'T1011.001',
    reference: 'https://attack.mitre.org/techniques/T1011/001',
    tactics: ['exfiltration'],
    techniqueId: 'T1011',
  },
  {
    name: 'Exfiltration Over Symmetric Encrypted Non-C2 Protocol',
    id: 'T1048.001',
    reference: 'https://attack.mitre.org/techniques/T1048/001',
    tactics: ['exfiltration'],
    techniqueId: 'T1048',
  },
  {
    name: 'Exfiltration Over Unencrypted/Obfuscated Non-C2 Protocol',
    id: 'T1048.003',
    reference: 'https://attack.mitre.org/techniques/T1048/003',
    tactics: ['exfiltration'],
    techniqueId: 'T1048',
  },
  {
    name: 'Exfiltration over USB',
    id: 'T1052.001',
    reference: 'https://attack.mitre.org/techniques/T1052/001',
    tactics: ['exfiltration'],
    techniqueId: 'T1052',
  },
  {
    name: 'Exfiltration to Cloud Storage',
    id: 'T1567.002',
    reference: 'https://attack.mitre.org/techniques/T1567/002',
    tactics: ['exfiltration'],
    techniqueId: 'T1567',
  },
  {
    name: 'Exfiltration to Code Repository',
    id: 'T1567.001',
    reference: 'https://attack.mitre.org/techniques/T1567/001',
    tactics: ['exfiltration'],
    techniqueId: 'T1567',
  },
  {
    name: 'Exploits',
    id: 'T1587.004',
    reference: 'https://attack.mitre.org/techniques/T1587/004',
    tactics: ['resource-development'],
    techniqueId: 'T1587',
  },
  {
    name: 'Exploits',
    id: 'T1588.005',
    reference: 'https://attack.mitre.org/techniques/T1588/005',
    tactics: ['resource-development'],
    techniqueId: 'T1588',
  },
  {
    name: 'External Defacement',
    id: 'T1491.002',
    reference: 'https://attack.mitre.org/techniques/T1491/002',
    tactics: ['impact'],
    techniqueId: 'T1491',
  },
  {
    name: 'External Proxy',
    id: 'T1090.002',
    reference: 'https://attack.mitre.org/techniques/T1090/002',
    tactics: ['command-and-control'],
    techniqueId: 'T1090',
  },
  {
    name: 'Extra Window Memory Injection',
    id: 'T1055.011',
    reference: 'https://attack.mitre.org/techniques/T1055/011',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1055',
  },
  {
    name: 'Fast Flux DNS',
    id: 'T1568.001',
    reference: 'https://attack.mitre.org/techniques/T1568/001',
    tactics: ['command-and-control'],
    techniqueId: 'T1568',
  },
  {
    name: 'File Deletion',
    id: 'T1070.004',
    reference: 'https://attack.mitre.org/techniques/T1070/004',
    tactics: ['defense-evasion'],
    techniqueId: 'T1070',
  },
  {
    name: 'File Transfer Protocols',
    id: 'T1071.002',
    reference: 'https://attack.mitre.org/techniques/T1071/002',
    tactics: ['command-and-control'],
    techniqueId: 'T1071',
  },
  {
    name: 'Firmware',
    id: 'T1592.003',
    reference: 'https://attack.mitre.org/techniques/T1592/003',
    tactics: ['reconnaissance'],
    techniqueId: 'T1592',
  },
  {
    name: 'GUI Input Capture',
    id: 'T1056.002',
    reference: 'https://attack.mitre.org/techniques/T1056/002',
    tactics: ['collection', 'credential-access'],
    techniqueId: 'T1056',
  },
  {
    name: 'Gatekeeper Bypass',
    id: 'T1553.001',
    reference: 'https://attack.mitre.org/techniques/T1553/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1553',
  },
  {
    name: 'Golden Ticket',
    id: 'T1558.001',
    reference: 'https://attack.mitre.org/techniques/T1558/001',
    tactics: ['credential-access'],
    techniqueId: 'T1558',
  },
  {
    name: 'Group Policy Preferences',
    id: 'T1552.006',
    reference: 'https://attack.mitre.org/techniques/T1552/006',
    tactics: ['credential-access'],
    techniqueId: 'T1552',
  },
  {
    name: 'Hardware',
    id: 'T1592.001',
    reference: 'https://attack.mitre.org/techniques/T1592/001',
    tactics: ['reconnaissance'],
    techniqueId: 'T1592',
  },
  {
    name: 'Hidden File System',
    id: 'T1564.005',
    reference: 'https://attack.mitre.org/techniques/T1564/005',
    tactics: ['defense-evasion'],
    techniqueId: 'T1564',
  },
  {
    name: 'Hidden Files and Directories',
    id: 'T1564.001',
    reference: 'https://attack.mitre.org/techniques/T1564/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1564',
  },
  {
    name: 'Hidden Users',
    id: 'T1564.002',
    reference: 'https://attack.mitre.org/techniques/T1564/002',
    tactics: ['defense-evasion'],
    techniqueId: 'T1564',
  },
  {
    name: 'Hidden Window',
    id: 'T1564.003',
    reference: 'https://attack.mitre.org/techniques/T1564/003',
    tactics: ['defense-evasion'],
    techniqueId: 'T1564',
  },
  {
    name: 'IP Addresses',
    id: 'T1590.005',
    reference: 'https://attack.mitre.org/techniques/T1590/005',
    tactics: ['reconnaissance'],
    techniqueId: 'T1590',
  },
  {
    name: 'Identify Business Tempo',
    id: 'T1591.003',
    reference: 'https://attack.mitre.org/techniques/T1591/003',
    tactics: ['reconnaissance'],
    techniqueId: 'T1591',
  },
  {
    name: 'Identify Roles',
    id: 'T1591.004',
    reference: 'https://attack.mitre.org/techniques/T1591/004',
    tactics: ['reconnaissance'],
    techniqueId: 'T1591',
  },
  {
    name: 'Image File Execution Options Injection',
    id: 'T1546.012',
    reference: 'https://attack.mitre.org/techniques/T1546/012',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'Impair Command History Logging',
    id: 'T1562.003',
    reference: 'https://attack.mitre.org/techniques/T1562/003',
    tactics: ['defense-evasion'],
    techniqueId: 'T1562',
  },
  {
    name: 'Indicator Blocking',
    id: 'T1562.006',
    reference: 'https://attack.mitre.org/techniques/T1562/006',
    tactics: ['defense-evasion'],
    techniqueId: 'T1562',
  },
  {
    name: 'Indicator Removal from Tools',
    id: 'T1027.005',
    reference: 'https://attack.mitre.org/techniques/T1027/005',
    tactics: ['defense-evasion'],
    techniqueId: 'T1027',
  },
  {
    name: 'Install Root Certificate',
    id: 'T1553.004',
    reference: 'https://attack.mitre.org/techniques/T1553/004',
    tactics: ['defense-evasion'],
    techniqueId: 'T1553',
  },
  {
    name: 'InstallUtil',
    id: 'T1218.004',
    reference: 'https://attack.mitre.org/techniques/T1218/004',
    tactics: ['defense-evasion'],
    techniqueId: 'T1218',
  },
  {
    name: 'Internal Defacement',
    id: 'T1491.001',
    reference: 'https://attack.mitre.org/techniques/T1491/001',
    tactics: ['impact'],
    techniqueId: 'T1491',
  },
  {
    name: 'Internal Proxy',
    id: 'T1090.001',
    reference: 'https://attack.mitre.org/techniques/T1090/001',
    tactics: ['command-and-control'],
    techniqueId: 'T1090',
  },
  {
    name: 'Invalid Code Signature',
    id: 'T1036.001',
    reference: 'https://attack.mitre.org/techniques/T1036/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1036',
  },
  {
    name: 'JavaScript/JScript',
    id: 'T1059.007',
    reference: 'https://attack.mitre.org/techniques/T1059/007',
    tactics: ['execution'],
    techniqueId: 'T1059',
  },
  {
    name: 'Junk Data',
    id: 'T1001.001',
    reference: 'https://attack.mitre.org/techniques/T1001/001',
    tactics: ['command-and-control'],
    techniqueId: 'T1001',
  },
  {
    name: 'Kerberoasting',
    id: 'T1558.003',
    reference: 'https://attack.mitre.org/techniques/T1558/003',
    tactics: ['credential-access'],
    techniqueId: 'T1558',
  },
  {
    name: 'Kernel Modules and Extensions',
    id: 'T1547.006',
    reference: 'https://attack.mitre.org/techniques/T1547/006',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1547',
  },
  {
    name: 'Keychain',
    id: 'T1555.001',
    reference: 'https://attack.mitre.org/techniques/T1555/001',
    tactics: ['credential-access'],
    techniqueId: 'T1555',
  },
  {
    name: 'Keylogging',
    id: 'T1056.001',
    reference: 'https://attack.mitre.org/techniques/T1056/001',
    tactics: ['collection', 'credential-access'],
    techniqueId: 'T1056',
  },
  {
    name: 'LC_LOAD_DYLIB Addition',
    id: 'T1546.006',
    reference: 'https://attack.mitre.org/techniques/T1546/006',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'LD_PRELOAD',
    id: 'T1574.006',
    reference: 'https://attack.mitre.org/techniques/T1574/006',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1574',
  },
  {
    name: 'LLMNR/NBT-NS Poisoning and SMB Relay',
    id: 'T1557.001',
    reference: 'https://attack.mitre.org/techniques/T1557/001',
    tactics: ['credential-access', 'collection'],
    techniqueId: 'T1557',
  },
  {
    name: 'LSA Secrets',
    id: 'T1003.004',
    reference: 'https://attack.mitre.org/techniques/T1003/004',
    tactics: ['credential-access'],
    techniqueId: 'T1003',
  },
  {
    name: 'LSASS Driver',
    id: 'T1547.008',
    reference: 'https://attack.mitre.org/techniques/T1547/008',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1547',
  },
  {
    name: 'LSASS Memory',
    id: 'T1003.001',
    reference: 'https://attack.mitre.org/techniques/T1003/001',
    tactics: ['credential-access'],
    techniqueId: 'T1003',
  },
  {
    name: 'Launch Agent',
    id: 'T1543.001',
    reference: 'https://attack.mitre.org/techniques/T1543/001',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1543',
  },
  {
    name: 'Launch Daemon',
    id: 'T1543.004',
    reference: 'https://attack.mitre.org/techniques/T1543/004',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1543',
  },
  {
    name: 'Launchctl',
    id: 'T1569.001',
    reference: 'https://attack.mitre.org/techniques/T1569/001',
    tactics: ['execution'],
    techniqueId: 'T1569',
  },
  {
    name: 'Launchd',
    id: 'T1053.004',
    reference: 'https://attack.mitre.org/techniques/T1053/004',
    tactics: ['execution', 'persistence', 'privilege-escalation'],
    techniqueId: 'T1053',
  },
  {
    name: 'Linux and Mac File and Directory Permissions Modification',
    id: 'T1222.002',
    reference: 'https://attack.mitre.org/techniques/T1222/002',
    tactics: ['defense-evasion'],
    techniqueId: 'T1222',
  },
  {
    name: 'Local Account',
    id: 'T1136.001',
    reference: 'https://attack.mitre.org/techniques/T1136/001',
    tactics: ['persistence'],
    techniqueId: 'T1136',
  },
  {
    name: 'Local Account',
    id: 'T1087.001',
    reference: 'https://attack.mitre.org/techniques/T1087/001',
    tactics: ['discovery'],
    techniqueId: 'T1087',
  },
  {
    name: 'Local Accounts',
    id: 'T1078.003',
    reference: 'https://attack.mitre.org/techniques/T1078/003',
    tactics: ['defense-evasion', 'persistence', 'privilege-escalation', 'initial-access'],
    techniqueId: 'T1078',
  },
  {
    name: 'Local Data Staging',
    id: 'T1074.001',
    reference: 'https://attack.mitre.org/techniques/T1074/001',
    tactics: ['collection'],
    techniqueId: 'T1074',
  },
  {
    name: 'Local Email Collection',
    id: 'T1114.001',
    reference: 'https://attack.mitre.org/techniques/T1114/001',
    tactics: ['collection'],
    techniqueId: 'T1114',
  },
  {
    name: 'Local Groups',
    id: 'T1069.001',
    reference: 'https://attack.mitre.org/techniques/T1069/001',
    tactics: ['discovery'],
    techniqueId: 'T1069',
  },
  {
    name: 'Logon Script (Mac)',
    id: 'T1037.002',
    reference: 'https://attack.mitre.org/techniques/T1037/002',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1037',
  },
  {
    name: 'Logon Script (Windows)',
    id: 'T1037.001',
    reference: 'https://attack.mitre.org/techniques/T1037/001',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1037',
  },
  {
    name: 'MSBuild',
    id: 'T1127.001',
    reference: 'https://attack.mitre.org/techniques/T1127/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1127',
  },
  {
    name: 'Mail Protocols',
    id: 'T1071.003',
    reference: 'https://attack.mitre.org/techniques/T1071/003',
    tactics: ['command-and-control'],
    techniqueId: 'T1071',
  },
  {
    name: 'Make and Impersonate Token',
    id: 'T1134.003',
    reference: 'https://attack.mitre.org/techniques/T1134/003',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1134',
  },
  {
    name: 'Malicious File',
    id: 'T1204.002',
    reference: 'https://attack.mitre.org/techniques/T1204/002',
    tactics: ['execution'],
    techniqueId: 'T1204',
  },
  {
    name: 'Malicious Link',
    id: 'T1204.001',
    reference: 'https://attack.mitre.org/techniques/T1204/001',
    tactics: ['execution'],
    techniqueId: 'T1204',
  },
  {
    name: 'Malware',
    id: 'T1587.001',
    reference: 'https://attack.mitre.org/techniques/T1587/001',
    tactics: ['resource-development'],
    techniqueId: 'T1587',
  },
  {
    name: 'Malware',
    id: 'T1588.001',
    reference: 'https://attack.mitre.org/techniques/T1588/001',
    tactics: ['resource-development'],
    techniqueId: 'T1588',
  },
  {
    name: 'Masquerade Task or Service',
    id: 'T1036.004',
    reference: 'https://attack.mitre.org/techniques/T1036/004',
    tactics: ['defense-evasion'],
    techniqueId: 'T1036',
  },
  {
    name: 'Match Legitimate Name or Location',
    id: 'T1036.005',
    reference: 'https://attack.mitre.org/techniques/T1036/005',
    tactics: ['defense-evasion'],
    techniqueId: 'T1036',
  },
  {
    name: 'Mshta',
    id: 'T1218.005',
    reference: 'https://attack.mitre.org/techniques/T1218/005',
    tactics: ['defense-evasion'],
    techniqueId: 'T1218',
  },
  {
    name: 'Msiexec',
    id: 'T1218.007',
    reference: 'https://attack.mitre.org/techniques/T1218/007',
    tactics: ['defense-evasion'],
    techniqueId: 'T1218',
  },
  {
    name: 'Multi-hop Proxy',
    id: 'T1090.003',
    reference: 'https://attack.mitre.org/techniques/T1090/003',
    tactics: ['command-and-control'],
    techniqueId: 'T1090',
  },
  {
    name: 'NTDS',
    id: 'T1003.003',
    reference: 'https://attack.mitre.org/techniques/T1003/003',
    tactics: ['credential-access'],
    techniqueId: 'T1003',
  },
  {
    name: 'NTFS File Attributes',
    id: 'T1564.004',
    reference: 'https://attack.mitre.org/techniques/T1564/004',
    tactics: ['defense-evasion'],
    techniqueId: 'T1564',
  },
  {
    name: 'Netsh Helper DLL',
    id: 'T1546.007',
    reference: 'https://attack.mitre.org/techniques/T1546/007',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'Network Address Translation Traversal',
    id: 'T1599.001',
    reference: 'https://attack.mitre.org/techniques/T1599/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1599',
  },
  {
    name: 'Network Device Authentication',
    id: 'T1556.004',
    reference: 'https://attack.mitre.org/techniques/T1556/004',
    tactics: ['credential-access', 'defense-evasion'],
    techniqueId: 'T1556',
  },
  {
    name: 'Network Device CLI',
    id: 'T1059.008',
    reference: 'https://attack.mitre.org/techniques/T1059/008',
    tactics: ['execution'],
    techniqueId: 'T1059',
  },
  {
    name: 'Network Device Configuration Dump',
    id: 'T1602.002',
    reference: 'https://attack.mitre.org/techniques/T1602/002',
    tactics: ['collection'],
    techniqueId: 'T1602',
  },
  {
    name: 'Network Logon Script',
    id: 'T1037.003',
    reference: 'https://attack.mitre.org/techniques/T1037/003',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1037',
  },
  {
    name: 'Network Security Appliances',
    id: 'T1590.006',
    reference: 'https://attack.mitre.org/techniques/T1590/006',
    tactics: ['reconnaissance'],
    techniqueId: 'T1590',
  },
  {
    name: 'Network Share Connection Removal',
    id: 'T1070.005',
    reference: 'https://attack.mitre.org/techniques/T1070/005',
    tactics: ['defense-evasion'],
    techniqueId: 'T1070',
  },
  {
    name: 'Network Topology',
    id: 'T1590.004',
    reference: 'https://attack.mitre.org/techniques/T1590/004',
    tactics: ['reconnaissance'],
    techniqueId: 'T1590',
  },
  {
    name: 'Network Trust Dependencies',
    id: 'T1590.003',
    reference: 'https://attack.mitre.org/techniques/T1590/003',
    tactics: ['reconnaissance'],
    techniqueId: 'T1590',
  },
  {
    name: 'Non-Standard Encoding',
    id: 'T1132.002',
    reference: 'https://attack.mitre.org/techniques/T1132/002',
    tactics: ['command-and-control'],
    techniqueId: 'T1132',
  },
  {
    name: 'OS Exhaustion Flood',
    id: 'T1499.001',
    reference: 'https://attack.mitre.org/techniques/T1499/001',
    tactics: ['impact'],
    techniqueId: 'T1499',
  },
  {
    name: 'Odbcconf',
    id: 'T1218.008',
    reference: 'https://attack.mitre.org/techniques/T1218/008',
    tactics: ['defense-evasion'],
    techniqueId: 'T1218',
  },
  {
    name: 'Office Template Macros',
    id: 'T1137.001',
    reference: 'https://attack.mitre.org/techniques/T1137/001',
    tactics: ['persistence'],
    techniqueId: 'T1137',
  },
  {
    name: 'Office Test',
    id: 'T1137.002',
    reference: 'https://attack.mitre.org/techniques/T1137/002',
    tactics: ['persistence'],
    techniqueId: 'T1137',
  },
  {
    name: 'One-Way Communication',
    id: 'T1102.003',
    reference: 'https://attack.mitre.org/techniques/T1102/003',
    tactics: ['command-and-control'],
    techniqueId: 'T1102',
  },
  {
    name: 'Outlook Forms',
    id: 'T1137.003',
    reference: 'https://attack.mitre.org/techniques/T1137/003',
    tactics: ['persistence'],
    techniqueId: 'T1137',
  },
  {
    name: 'Outlook Home Page',
    id: 'T1137.004',
    reference: 'https://attack.mitre.org/techniques/T1137/004',
    tactics: ['persistence'],
    techniqueId: 'T1137',
  },
  {
    name: 'Outlook Rules',
    id: 'T1137.005',
    reference: 'https://attack.mitre.org/techniques/T1137/005',
    tactics: ['persistence'],
    techniqueId: 'T1137',
  },
  {
    name: 'Parent PID Spoofing',
    id: 'T1134.004',
    reference: 'https://attack.mitre.org/techniques/T1134/004',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1134',
  },
  {
    name: 'Pass the Hash',
    id: 'T1550.002',
    reference: 'https://attack.mitre.org/techniques/T1550/002',
    tactics: ['defense-evasion', 'lateral-movement'],
    techniqueId: 'T1550',
  },
  {
    name: 'Pass the Ticket',
    id: 'T1550.003',
    reference: 'https://attack.mitre.org/techniques/T1550/003',
    tactics: ['defense-evasion', 'lateral-movement'],
    techniqueId: 'T1550',
  },
  {
    name: 'Password Cracking',
    id: 'T1110.002',
    reference: 'https://attack.mitre.org/techniques/T1110/002',
    tactics: ['credential-access'],
    techniqueId: 'T1110',
  },
  {
    name: 'Password Filter DLL',
    id: 'T1556.002',
    reference: 'https://attack.mitre.org/techniques/T1556/002',
    tactics: ['credential-access', 'defense-evasion'],
    techniqueId: 'T1556',
  },
  {
    name: 'Password Guessing',
    id: 'T1110.001',
    reference: 'https://attack.mitre.org/techniques/T1110/001',
    tactics: ['credential-access'],
    techniqueId: 'T1110',
  },
  {
    name: 'Password Spraying',
    id: 'T1110.003',
    reference: 'https://attack.mitre.org/techniques/T1110/003',
    tactics: ['credential-access'],
    techniqueId: 'T1110',
  },
  {
    name: 'Patch System Image',
    id: 'T1601.001',
    reference: 'https://attack.mitre.org/techniques/T1601/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1601',
  },
  {
    name: 'Path Interception by PATH Environment Variable',
    id: 'T1574.007',
    reference: 'https://attack.mitre.org/techniques/T1574/007',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1574',
  },
  {
    name: 'Path Interception by Search Order Hijacking',
    id: 'T1574.008',
    reference: 'https://attack.mitre.org/techniques/T1574/008',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1574',
  },
  {
    name: 'Path Interception by Unquoted Path',
    id: 'T1574.009',
    reference: 'https://attack.mitre.org/techniques/T1574/009',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1574',
  },
  {
    name: 'Plist Modification',
    id: 'T1547.011',
    reference: 'https://attack.mitre.org/techniques/T1547/011',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1547',
  },
  {
    name: 'Pluggable Authentication Modules',
    id: 'T1556.003',
    reference: 'https://attack.mitre.org/techniques/T1556/003',
    tactics: ['credential-access', 'defense-evasion'],
    techniqueId: 'T1556',
  },
  {
    name: 'Port Knocking',
    id: 'T1205.001',
    reference: 'https://attack.mitre.org/techniques/T1205/001',
    tactics: ['defense-evasion', 'persistence', 'command-and-control'],
    techniqueId: 'T1205',
  },
  {
    name: 'Port Monitors',
    id: 'T1547.010',
    reference: 'https://attack.mitre.org/techniques/T1547/010',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1547',
  },
  {
    name: 'Portable Executable Injection',
    id: 'T1055.002',
    reference: 'https://attack.mitre.org/techniques/T1055/002',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1055',
  },
  {
    name: 'PowerShell',
    id: 'T1059.001',
    reference: 'https://attack.mitre.org/techniques/T1059/001',
    tactics: ['execution'],
    techniqueId: 'T1059',
  },
  {
    name: 'PowerShell Profile',
    id: 'T1546.013',
    reference: 'https://attack.mitre.org/techniques/T1546/013',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'Print Processors',
    id: 'T1547.012',
    reference: 'https://attack.mitre.org/techniques/T1547/012',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1547',
  },
  {
    name: 'Private Keys',
    id: 'T1552.004',
    reference: 'https://attack.mitre.org/techniques/T1552/004',
    tactics: ['credential-access'],
    techniqueId: 'T1552',
  },
  {
    name: 'Proc Filesystem',
    id: 'T1003.007',
    reference: 'https://attack.mitre.org/techniques/T1003/007',
    tactics: ['credential-access'],
    techniqueId: 'T1003',
  },
  {
    name: 'Proc Memory',
    id: 'T1055.009',
    reference: 'https://attack.mitre.org/techniques/T1055/009',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1055',
  },
  {
    name: 'Process Doppelgänging',
    id: 'T1055.013',
    reference: 'https://attack.mitre.org/techniques/T1055/013',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1055',
  },
  {
    name: 'Process Hollowing',
    id: 'T1055.012',
    reference: 'https://attack.mitre.org/techniques/T1055/012',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1055',
  },
  {
    name: 'Protocol Impersonation',
    id: 'T1001.003',
    reference: 'https://attack.mitre.org/techniques/T1001/003',
    tactics: ['command-and-control'],
    techniqueId: 'T1001',
  },
  {
    name: 'Ptrace System Calls',
    id: 'T1055.008',
    reference: 'https://attack.mitre.org/techniques/T1055/008',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1055',
  },
  {
    name: 'PubPrn',
    id: 'T1216.001',
    reference: 'https://attack.mitre.org/techniques/T1216/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1216',
  },
  {
    name: 'Purchase Technical Data',
    id: 'T1597.002',
    reference: 'https://attack.mitre.org/techniques/T1597/002',
    tactics: ['reconnaissance'],
    techniqueId: 'T1597',
  },
  {
    name: 'Python',
    id: 'T1059.006',
    reference: 'https://attack.mitre.org/techniques/T1059/006',
    tactics: ['execution'],
    techniqueId: 'T1059',
  },
  {
    name: 'RDP Hijacking',
    id: 'T1563.002',
    reference: 'https://attack.mitre.org/techniques/T1563/002',
    tactics: ['lateral-movement'],
    techniqueId: 'T1563',
  },
  {
    name: 'ROMMONkit',
    id: 'T1542.004',
    reference: 'https://attack.mitre.org/techniques/T1542/004',
    tactics: ['defense-evasion', 'persistence'],
    techniqueId: 'T1542',
  },
  {
    name: 'Rc.common',
    id: 'T1037.004',
    reference: 'https://attack.mitre.org/techniques/T1037/004',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1037',
  },
  {
    name: 'Re-opened Applications',
    id: 'T1547.007',
    reference: 'https://attack.mitre.org/techniques/T1547/007',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1547',
  },
  {
    name: 'Reduce Key Space',
    id: 'T1600.001',
    reference: 'https://attack.mitre.org/techniques/T1600/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1600',
  },
  {
    name: 'Reflection Amplification',
    id: 'T1498.002',
    reference: 'https://attack.mitre.org/techniques/T1498/002',
    tactics: ['impact'],
    techniqueId: 'T1498',
  },
  {
    name: 'Registry Run Keys / Startup Folder',
    id: 'T1547.001',
    reference: 'https://attack.mitre.org/techniques/T1547/001',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1547',
  },
  {
    name: 'Regsvcs/Regasm',
    id: 'T1218.009',
    reference: 'https://attack.mitre.org/techniques/T1218/009',
    tactics: ['defense-evasion'],
    techniqueId: 'T1218',
  },
  {
    name: 'Regsvr32',
    id: 'T1218.010',
    reference: 'https://attack.mitre.org/techniques/T1218/010',
    tactics: ['defense-evasion'],
    techniqueId: 'T1218',
  },
  {
    name: 'Remote Data Staging',
    id: 'T1074.002',
    reference: 'https://attack.mitre.org/techniques/T1074/002',
    tactics: ['collection'],
    techniqueId: 'T1074',
  },
  {
    name: 'Remote Desktop Protocol',
    id: 'T1021.001',
    reference: 'https://attack.mitre.org/techniques/T1021/001',
    tactics: ['lateral-movement'],
    techniqueId: 'T1021',
  },
  {
    name: 'Remote Email Collection',
    id: 'T1114.002',
    reference: 'https://attack.mitre.org/techniques/T1114/002',
    tactics: ['collection'],
    techniqueId: 'T1114',
  },
  {
    name: 'Rename System Utilities',
    id: 'T1036.003',
    reference: 'https://attack.mitre.org/techniques/T1036/003',
    tactics: ['defense-evasion'],
    techniqueId: 'T1036',
  },
  {
    name: 'Revert Cloud Instance',
    id: 'T1578.004',
    reference: 'https://attack.mitre.org/techniques/T1578/004',
    tactics: ['defense-evasion'],
    techniqueId: 'T1578',
  },
  {
    name: 'Right-to-Left Override',
    id: 'T1036.002',
    reference: 'https://attack.mitre.org/techniques/T1036/002',
    tactics: ['defense-evasion'],
    techniqueId: 'T1036',
  },
  {
    name: 'Run Virtual Instance',
    id: 'T1564.006',
    reference: 'https://attack.mitre.org/techniques/T1564/006',
    tactics: ['defense-evasion'],
    techniqueId: 'T1564',
  },
  {
    name: 'Rundll32',
    id: 'T1218.011',
    reference: 'https://attack.mitre.org/techniques/T1218/011',
    tactics: ['defense-evasion'],
    techniqueId: 'T1218',
  },
  {
    name: 'Runtime Data Manipulation',
    id: 'T1565.003',
    reference: 'https://attack.mitre.org/techniques/T1565/003',
    tactics: ['impact'],
    techniqueId: 'T1565',
  },
  {
    name: 'SID-History Injection',
    id: 'T1134.005',
    reference: 'https://attack.mitre.org/techniques/T1134/005',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1134',
  },
  {
    name: 'SIP and Trust Provider Hijacking',
    id: 'T1553.003',
    reference: 'https://attack.mitre.org/techniques/T1553/003',
    tactics: ['defense-evasion'],
    techniqueId: 'T1553',
  },
  {
    name: 'SMB/Windows Admin Shares',
    id: 'T1021.002',
    reference: 'https://attack.mitre.org/techniques/T1021/002',
    tactics: ['lateral-movement'],
    techniqueId: 'T1021',
  },
  {
    name: 'SNMP (MIB Dump)',
    id: 'T1602.001',
    reference: 'https://attack.mitre.org/techniques/T1602/001',
    tactics: ['collection'],
    techniqueId: 'T1602',
  },
  {
    name: 'SQL Stored Procedures',
    id: 'T1505.001',
    reference: 'https://attack.mitre.org/techniques/T1505/001',
    tactics: ['persistence'],
    techniqueId: 'T1505',
  },
  {
    name: 'SSH',
    id: 'T1021.004',
    reference: 'https://attack.mitre.org/techniques/T1021/004',
    tactics: ['lateral-movement'],
    techniqueId: 'T1021',
  },
  {
    name: 'SSH Authorized Keys',
    id: 'T1098.004',
    reference: 'https://attack.mitre.org/techniques/T1098/004',
    tactics: ['persistence'],
    techniqueId: 'T1098',
  },
  {
    name: 'SSH Hijacking',
    id: 'T1563.001',
    reference: 'https://attack.mitre.org/techniques/T1563/001',
    tactics: ['lateral-movement'],
    techniqueId: 'T1563',
  },
  {
    name: 'Scan Databases',
    id: 'T1596.005',
    reference: 'https://attack.mitre.org/techniques/T1596/005',
    tactics: ['reconnaissance'],
    techniqueId: 'T1596',
  },
  {
    name: 'Scanning IP Blocks',
    id: 'T1595.001',
    reference: 'https://attack.mitre.org/techniques/T1595/001',
    tactics: ['reconnaissance'],
    techniqueId: 'T1595',
  },
  {
    name: 'Scheduled Task',
    id: 'T1053.005',
    reference: 'https://attack.mitre.org/techniques/T1053/005',
    tactics: ['execution', 'persistence', 'privilege-escalation'],
    techniqueId: 'T1053',
  },
  {
    name: 'Screensaver',
    id: 'T1546.002',
    reference: 'https://attack.mitre.org/techniques/T1546/002',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'Search Engines',
    id: 'T1593.002',
    reference: 'https://attack.mitre.org/techniques/T1593/002',
    tactics: ['reconnaissance'],
    techniqueId: 'T1593',
  },
  {
    name: 'Security Account Manager',
    id: 'T1003.002',
    reference: 'https://attack.mitre.org/techniques/T1003/002',
    tactics: ['credential-access'],
    techniqueId: 'T1003',
  },
  {
    name: 'Security Software Discovery',
    id: 'T1518.001',
    reference: 'https://attack.mitre.org/techniques/T1518/001',
    tactics: ['discovery'],
    techniqueId: 'T1518',
  },
  {
    name: 'Security Support Provider',
    id: 'T1547.005',
    reference: 'https://attack.mitre.org/techniques/T1547/005',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1547',
  },
  {
    name: 'Securityd Memory',
    id: 'T1555.002',
    reference: 'https://attack.mitre.org/techniques/T1555/002',
    tactics: ['credential-access'],
    techniqueId: 'T1555',
  },
  {
    name: 'Server',
    id: 'T1583.004',
    reference: 'https://attack.mitre.org/techniques/T1583/004',
    tactics: ['resource-development'],
    techniqueId: 'T1583',
  },
  {
    name: 'Server',
    id: 'T1584.004',
    reference: 'https://attack.mitre.org/techniques/T1584/004',
    tactics: ['resource-development'],
    techniqueId: 'T1584',
  },
  {
    name: 'Service Execution',
    id: 'T1569.002',
    reference: 'https://attack.mitre.org/techniques/T1569/002',
    tactics: ['execution'],
    techniqueId: 'T1569',
  },
  {
    name: 'Service Exhaustion Flood',
    id: 'T1499.002',
    reference: 'https://attack.mitre.org/techniques/T1499/002',
    tactics: ['impact'],
    techniqueId: 'T1499',
  },
  {
    name: 'Services File Permissions Weakness',
    id: 'T1574.010',
    reference: 'https://attack.mitre.org/techniques/T1574/010',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1574',
  },
  {
    name: 'Services Registry Permissions Weakness',
    id: 'T1574.011',
    reference: 'https://attack.mitre.org/techniques/T1574/011',
    tactics: ['persistence', 'privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1574',
  },
  {
    name: 'Setuid and Setgid',
    id: 'T1548.001',
    reference: 'https://attack.mitre.org/techniques/T1548/001',
    tactics: ['privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1548',
  },
  {
    name: 'Sharepoint',
    id: 'T1213.002',
    reference: 'https://attack.mitre.org/techniques/T1213/002',
    tactics: ['collection'],
    techniqueId: 'T1213',
  },
  {
    name: 'Shortcut Modification',
    id: 'T1547.009',
    reference: 'https://attack.mitre.org/techniques/T1547/009',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1547',
  },
  {
    name: 'Silver Ticket',
    id: 'T1558.002',
    reference: 'https://attack.mitre.org/techniques/T1558/002',
    tactics: ['credential-access'],
    techniqueId: 'T1558',
  },
  {
    name: 'Social Media',
    id: 'T1593.001',
    reference: 'https://attack.mitre.org/techniques/T1593/001',
    tactics: ['reconnaissance'],
    techniqueId: 'T1593',
  },
  {
    name: 'Social Media Accounts',
    id: 'T1585.001',
    reference: 'https://attack.mitre.org/techniques/T1585/001',
    tactics: ['resource-development'],
    techniqueId: 'T1585',
  },
  {
    name: 'Social Media Accounts',
    id: 'T1586.001',
    reference: 'https://attack.mitre.org/techniques/T1586/001',
    tactics: ['resource-development'],
    techniqueId: 'T1586',
  },
  {
    name: 'Software',
    id: 'T1592.002',
    reference: 'https://attack.mitre.org/techniques/T1592/002',
    tactics: ['reconnaissance'],
    techniqueId: 'T1592',
  },
  {
    name: 'Software Packing',
    id: 'T1027.002',
    reference: 'https://attack.mitre.org/techniques/T1027/002',
    tactics: ['defense-evasion'],
    techniqueId: 'T1027',
  },
  {
    name: 'Space after Filename',
    id: 'T1036.006',
    reference: 'https://attack.mitre.org/techniques/T1036/006',
    tactics: ['defense-evasion'],
    techniqueId: 'T1036',
  },
  {
    name: 'Spearphishing Attachment',
    id: 'T1566.001',
    reference: 'https://attack.mitre.org/techniques/T1566/001',
    tactics: ['initial-access'],
    techniqueId: 'T1566',
  },
  {
    name: 'Spearphishing Attachment',
    id: 'T1598.002',
    reference: 'https://attack.mitre.org/techniques/T1598/002',
    tactics: ['reconnaissance'],
    techniqueId: 'T1598',
  },
  {
    name: 'Spearphishing Link',
    id: 'T1566.002',
    reference: 'https://attack.mitre.org/techniques/T1566/002',
    tactics: ['initial-access'],
    techniqueId: 'T1566',
  },
  {
    name: 'Spearphishing Link',
    id: 'T1598.003',
    reference: 'https://attack.mitre.org/techniques/T1598/003',
    tactics: ['reconnaissance'],
    techniqueId: 'T1598',
  },
  {
    name: 'Spearphishing Service',
    id: 'T1598.001',
    reference: 'https://attack.mitre.org/techniques/T1598/001',
    tactics: ['reconnaissance'],
    techniqueId: 'T1598',
  },
  {
    name: 'Spearphishing via Service',
    id: 'T1566.003',
    reference: 'https://attack.mitre.org/techniques/T1566/003',
    tactics: ['initial-access'],
    techniqueId: 'T1566',
  },
  {
    name: 'Standard Encoding',
    id: 'T1132.001',
    reference: 'https://attack.mitre.org/techniques/T1132/001',
    tactics: ['command-and-control'],
    techniqueId: 'T1132',
  },
  {
    name: 'Startup Items',
    id: 'T1037.005',
    reference: 'https://attack.mitre.org/techniques/T1037/005',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1037',
  },
  {
    name: 'Steganography',
    id: 'T1027.003',
    reference: 'https://attack.mitre.org/techniques/T1027/003',
    tactics: ['defense-evasion'],
    techniqueId: 'T1027',
  },
  {
    name: 'Steganography',
    id: 'T1001.002',
    reference: 'https://attack.mitre.org/techniques/T1001/002',
    tactics: ['command-and-control'],
    techniqueId: 'T1001',
  },
  {
    name: 'Stored Data Manipulation',
    id: 'T1565.001',
    reference: 'https://attack.mitre.org/techniques/T1565/001',
    tactics: ['impact'],
    techniqueId: 'T1565',
  },
  {
    name: 'Sudo and Sudo Caching',
    id: 'T1548.003',
    reference: 'https://attack.mitre.org/techniques/T1548/003',
    tactics: ['privilege-escalation', 'defense-evasion'],
    techniqueId: 'T1548',
  },
  {
    name: 'Symmetric Cryptography',
    id: 'T1573.001',
    reference: 'https://attack.mitre.org/techniques/T1573/001',
    tactics: ['command-and-control'],
    techniqueId: 'T1573',
  },
  {
    name: 'System Checks',
    id: 'T1497.001',
    reference: 'https://attack.mitre.org/techniques/T1497/001',
    tactics: ['defense-evasion', 'discovery'],
    techniqueId: 'T1497',
  },
  {
    name: 'System Firmware',
    id: 'T1542.001',
    reference: 'https://attack.mitre.org/techniques/T1542/001',
    tactics: ['persistence', 'defense-evasion'],
    techniqueId: 'T1542',
  },
  {
    name: 'Systemd Service',
    id: 'T1543.002',
    reference: 'https://attack.mitre.org/techniques/T1543/002',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1543',
  },
  {
    name: 'Systemd Timers',
    id: 'T1053.006',
    reference: 'https://attack.mitre.org/techniques/T1053/006',
    tactics: ['execution', 'persistence', 'privilege-escalation'],
    techniqueId: 'T1053',
  },
  {
    name: 'TFTP Boot',
    id: 'T1542.005',
    reference: 'https://attack.mitre.org/techniques/T1542/005',
    tactics: ['defense-evasion', 'persistence'],
    techniqueId: 'T1542',
  },
  {
    name: 'Thread Execution Hijacking',
    id: 'T1055.003',
    reference: 'https://attack.mitre.org/techniques/T1055/003',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1055',
  },
  {
    name: 'Thread Local Storage',
    id: 'T1055.005',
    reference: 'https://attack.mitre.org/techniques/T1055/005',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1055',
  },
  {
    name: 'Threat Intel Vendors',
    id: 'T1597.001',
    reference: 'https://attack.mitre.org/techniques/T1597/001',
    tactics: ['reconnaissance'],
    techniqueId: 'T1597',
  },
  {
    name: 'Time Based Evasion',
    id: 'T1497.003',
    reference: 'https://attack.mitre.org/techniques/T1497/003',
    tactics: ['defense-evasion', 'discovery'],
    techniqueId: 'T1497',
  },
  {
    name: 'Time Providers',
    id: 'T1547.003',
    reference: 'https://attack.mitre.org/techniques/T1547/003',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1547',
  },
  {
    name: 'Timestomp',
    id: 'T1070.006',
    reference: 'https://attack.mitre.org/techniques/T1070/006',
    tactics: ['defense-evasion'],
    techniqueId: 'T1070',
  },
  {
    name: 'Token Impersonation/Theft',
    id: 'T1134.001',
    reference: 'https://attack.mitre.org/techniques/T1134/001',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1134',
  },
  {
    name: 'Tool',
    id: 'T1588.002',
    reference: 'https://attack.mitre.org/techniques/T1588/002',
    tactics: ['resource-development'],
    techniqueId: 'T1588',
  },
  {
    name: 'Traffic Duplication',
    id: 'T1020.001',
    reference: 'https://attack.mitre.org/techniques/T1020/001',
    tactics: ['exfiltration'],
    techniqueId: 'T1020',
  },
  {
    name: 'Transmitted Data Manipulation',
    id: 'T1565.002',
    reference: 'https://attack.mitre.org/techniques/T1565/002',
    tactics: ['impact'],
    techniqueId: 'T1565',
  },
  {
    name: 'Transport Agent',
    id: 'T1505.002',
    reference: 'https://attack.mitre.org/techniques/T1505/002',
    tactics: ['persistence'],
    techniqueId: 'T1505',
  },
  {
    name: 'Trap',
    id: 'T1546.005',
    reference: 'https://attack.mitre.org/techniques/T1546/005',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'Unix Shell',
    id: 'T1059.004',
    reference: 'https://attack.mitre.org/techniques/T1059/004',
    tactics: ['execution'],
    techniqueId: 'T1059',
  },
  {
    name: 'User Activity Based Checks',
    id: 'T1497.002',
    reference: 'https://attack.mitre.org/techniques/T1497/002',
    tactics: ['defense-evasion', 'discovery'],
    techniqueId: 'T1497',
  },
  {
    name: 'VBA Stomping',
    id: 'T1564.007',
    reference: 'https://attack.mitre.org/techniques/T1564/007',
    tactics: ['defense-evasion'],
    techniqueId: 'T1564',
  },
  {
    name: 'VDSO Hijacking',
    id: 'T1055.014',
    reference: 'https://attack.mitre.org/techniques/T1055/014',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1055',
  },
  {
    name: 'VNC',
    id: 'T1021.005',
    reference: 'https://attack.mitre.org/techniques/T1021/005',
    tactics: ['lateral-movement'],
    techniqueId: 'T1021',
  },
  {
    name: 'Verclsid',
    id: 'T1218.012',
    reference: 'https://attack.mitre.org/techniques/T1218/012',
    tactics: ['defense-evasion'],
    techniqueId: 'T1218',
  },
  {
    name: 'Virtual Private Server',
    id: 'T1583.003',
    reference: 'https://attack.mitre.org/techniques/T1583/003',
    tactics: ['resource-development'],
    techniqueId: 'T1583',
  },
  {
    name: 'Virtual Private Server',
    id: 'T1584.003',
    reference: 'https://attack.mitre.org/techniques/T1584/003',
    tactics: ['resource-development'],
    techniqueId: 'T1584',
  },
  {
    name: 'Visual Basic',
    id: 'T1059.005',
    reference: 'https://attack.mitre.org/techniques/T1059/005',
    tactics: ['execution'],
    techniqueId: 'T1059',
  },
  {
    name: 'Vulnerabilities',
    id: 'T1588.006',
    reference: 'https://attack.mitre.org/techniques/T1588/006',
    tactics: ['resource-development'],
    techniqueId: 'T1588',
  },
  {
    name: 'Vulnerability Scanning',
    id: 'T1595.002',
    reference: 'https://attack.mitre.org/techniques/T1595/002',
    tactics: ['reconnaissance'],
    techniqueId: 'T1595',
  },
  {
    name: 'WHOIS',
    id: 'T1596.002',
    reference: 'https://attack.mitre.org/techniques/T1596/002',
    tactics: ['reconnaissance'],
    techniqueId: 'T1596',
  },
  {
    name: 'Web Portal Capture',
    id: 'T1056.003',
    reference: 'https://attack.mitre.org/techniques/T1056/003',
    tactics: ['collection', 'credential-access'],
    techniqueId: 'T1056',
  },
  {
    name: 'Web Protocols',
    id: 'T1071.001',
    reference: 'https://attack.mitre.org/techniques/T1071/001',
    tactics: ['command-and-control'],
    techniqueId: 'T1071',
  },
  {
    name: 'Web Services',
    id: 'T1583.006',
    reference: 'https://attack.mitre.org/techniques/T1583/006',
    tactics: ['resource-development'],
    techniqueId: 'T1583',
  },
  {
    name: 'Web Services',
    id: 'T1584.006',
    reference: 'https://attack.mitre.org/techniques/T1584/006',
    tactics: ['resource-development'],
    techniqueId: 'T1584',
  },
  {
    name: 'Web Session Cookie',
    id: 'T1550.004',
    reference: 'https://attack.mitre.org/techniques/T1550/004',
    tactics: ['defense-evasion', 'lateral-movement'],
    techniqueId: 'T1550',
  },
  {
    name: 'Web Shell',
    id: 'T1505.003',
    reference: 'https://attack.mitre.org/techniques/T1505/003',
    tactics: ['persistence'],
    techniqueId: 'T1505',
  },
  {
    name: 'Windows Command Shell',
    id: 'T1059.003',
    reference: 'https://attack.mitre.org/techniques/T1059/003',
    tactics: ['execution'],
    techniqueId: 'T1059',
  },
  {
    name: 'Windows File and Directory Permissions Modification',
    id: 'T1222.001',
    reference: 'https://attack.mitre.org/techniques/T1222/001',
    tactics: ['defense-evasion'],
    techniqueId: 'T1222',
  },
  {
    name: 'Windows Management Instrumentation Event Subscription',
    id: 'T1546.003',
    reference: 'https://attack.mitre.org/techniques/T1546/003',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
  {
    name: 'Windows Remote Management',
    id: 'T1021.006',
    reference: 'https://attack.mitre.org/techniques/T1021/006',
    tactics: ['lateral-movement'],
    techniqueId: 'T1021',
  },
  {
    name: 'Windows Service',
    id: 'T1543.003',
    reference: 'https://attack.mitre.org/techniques/T1543/003',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1543',
  },
  {
    name: 'Winlogon Helper DLL',
    id: 'T1547.004',
    reference: 'https://attack.mitre.org/techniques/T1547/004',
    tactics: ['persistence', 'privilege-escalation'],
    techniqueId: 'T1547',
  },
  {
    name: 'Additional Cloud Credentials',
    id: 'T1098.001',
    reference: 'https://attack.mitre.org/techniques/T1098/001',
    tactics: ['persistence'],
    techniqueId: 'T1098',
  },
  {
    name: 'Group Policy Modification',
    id: 'T1484.001',
    reference: 'https://attack.mitre.org/techniques/T1484/001',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1484',
  },
  {
    name: 'Domain Trust Modification',
    id: 'T1484.002',
    reference: 'https://attack.mitre.org/techniques/T1484/002',
    tactics: ['defense-evasion', 'privilege-escalation'],
    techniqueId: 'T1484',
  },
  {
    name: 'Web Cookies',
    id: 'T1606.001',
    reference: 'https://attack.mitre.org/techniques/T1606/001',
    tactics: ['credential-access'],
    techniqueId: 'T1606',
  },
  {
    name: 'SAML Tokens',
    id: 'T1606.002',
    reference: 'https://attack.mitre.org/techniques/T1606/002',
    tactics: ['credential-access'],
    techniqueId: 'T1606',
  },
];

export const subtechniquesOptions: MitreSubtechniquesOptions[] = [
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.bashProfileAndBashrcT1546Description',
      { defaultMessage: '.bash_profile and .bashrc (T1546.004)' }
    ),
    id: 'T1546.004',
    name: '.bash_profile and .bashrc',
    reference: 'https://attack.mitre.org/techniques/T1546/004',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'bashProfileAndBashrc',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.etcPasswdAndEtcShadowT1003Description',
      { defaultMessage: '/etc/passwd and /etc/shadow (T1003.008)' }
    ),
    id: 'T1003.008',
    name: '/etc/passwd and /etc/shadow',
    reference: 'https://attack.mitre.org/techniques/T1003/008',
    tactics: 'credential-access',
    techniqueId: 'T1003',
    value: 'etcPasswdAndEtcShadow',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.arpCachePoisoningT1557Description',
      { defaultMessage: 'ARP Cache Poisoning (T1557.002)' }
    ),
    id: 'T1557.002',
    name: 'ARP Cache Poisoning',
    reference: 'https://attack.mitre.org/techniques/T1557/002',
    tactics: 'credential-access,collection',
    techniqueId: 'T1557',
    value: 'arpCachePoisoning',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.asRepRoastingT1558Description',
      { defaultMessage: 'AS-REP Roasting (T1558.004)' }
    ),
    id: 'T1558.004',
    name: 'AS-REP Roasting',
    reference: 'https://attack.mitre.org/techniques/T1558/004',
    tactics: 'credential-access',
    techniqueId: 'T1558',
    value: 'asRepRoasting',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.accessibilityFeaturesT1546Description',
      { defaultMessage: 'Accessibility Features (T1546.008)' }
    ),
    id: 'T1546.008',
    name: 'Accessibility Features',
    reference: 'https://attack.mitre.org/techniques/T1546/008',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'accessibilityFeatures',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.addOffice365GlobalAdministratorRoleT1098Description',
      { defaultMessage: 'Add Office 365 Global Administrator Role (T1098.003)' }
    ),
    id: 'T1098.003',
    name: 'Add Office 365 Global Administrator Role',
    reference: 'https://attack.mitre.org/techniques/T1098/003',
    tactics: 'persistence',
    techniqueId: 'T1098',
    value: 'addOffice365GlobalAdministratorRole',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.addInsT1137Description',
      { defaultMessage: 'Add-ins (T1137.006)' }
    ),
    id: 'T1137.006',
    name: 'Add-ins',
    reference: 'https://attack.mitre.org/techniques/T1137/006',
    tactics: 'persistence',
    techniqueId: 'T1137',
    value: 'addIns',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.appCertDlLsT1546Description',
      { defaultMessage: 'AppCert DLLs (T1546.009)' }
    ),
    id: 'T1546.009',
    name: 'AppCert DLLs',
    reference: 'https://attack.mitre.org/techniques/T1546/009',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'appCertDlLs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.appInitDlLsT1546Description',
      { defaultMessage: 'AppInit DLLs (T1546.010)' }
    ),
    id: 'T1546.010',
    name: 'AppInit DLLs',
    reference: 'https://attack.mitre.org/techniques/T1546/010',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'appInitDlLs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.appleScriptT1059Description',
      { defaultMessage: 'AppleScript (T1059.002)' }
    ),
    id: 'T1059.002',
    name: 'AppleScript',
    reference: 'https://attack.mitre.org/techniques/T1059/002',
    tactics: 'execution',
    techniqueId: 'T1059',
    value: 'appleScript',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.applicationAccessTokenT1550Description',
      { defaultMessage: 'Application Access Token (T1550.001)' }
    ),
    id: 'T1550.001',
    name: 'Application Access Token',
    reference: 'https://attack.mitre.org/techniques/T1550/001',
    tactics: 'defense-evasion,lateral-movement',
    techniqueId: 'T1550',
    value: 'applicationAccessToken',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.applicationExhaustionFloodT1499Description',
      { defaultMessage: 'Application Exhaustion Flood (T1499.003)' }
    ),
    id: 'T1499.003',
    name: 'Application Exhaustion Flood',
    reference: 'https://attack.mitre.org/techniques/T1499/003',
    tactics: 'impact',
    techniqueId: 'T1499',
    value: 'applicationExhaustionFlood',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.applicationShimmingT1546Description',
      { defaultMessage: 'Application Shimming (T1546.011)' }
    ),
    id: 'T1546.011',
    name: 'Application Shimming',
    reference: 'https://attack.mitre.org/techniques/T1546/011',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'applicationShimming',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.applicationOrSystemExploitationT1499Description',
      { defaultMessage: 'Application or System Exploitation (T1499.004)' }
    ),
    id: 'T1499.004',
    name: 'Application or System Exploitation',
    reference: 'https://attack.mitre.org/techniques/T1499/004',
    tactics: 'impact',
    techniqueId: 'T1499',
    value: 'applicationOrSystemExploitation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.archiveViaCustomMethodT1560Description',
      { defaultMessage: 'Archive via Custom Method (T1560.003)' }
    ),
    id: 'T1560.003',
    name: 'Archive via Custom Method',
    reference: 'https://attack.mitre.org/techniques/T1560/003',
    tactics: 'collection',
    techniqueId: 'T1560',
    value: 'archiveViaCustomMethod',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.archiveViaLibraryT1560Description',
      { defaultMessage: 'Archive via Library (T1560.002)' }
    ),
    id: 'T1560.002',
    name: 'Archive via Library',
    reference: 'https://attack.mitre.org/techniques/T1560/002',
    tactics: 'collection',
    techniqueId: 'T1560',
    value: 'archiveViaLibrary',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.archiveViaUtilityT1560Description',
      { defaultMessage: 'Archive via Utility (T1560.001)' }
    ),
    id: 'T1560.001',
    name: 'Archive via Utility',
    reference: 'https://attack.mitre.org/techniques/T1560/001',
    tactics: 'collection',
    techniqueId: 'T1560',
    value: 'archiveViaUtility',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.asymmetricCryptographyT1573Description',
      { defaultMessage: 'Asymmetric Cryptography (T1573.002)' }
    ),
    id: 'T1573.002',
    name: 'Asymmetric Cryptography',
    reference: 'https://attack.mitre.org/techniques/T1573/002',
    tactics: 'command-and-control',
    techniqueId: 'T1573',
    value: 'asymmetricCryptography',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.asynchronousProcedureCallT1055Description',
      { defaultMessage: 'Asynchronous Procedure Call (T1055.004)' }
    ),
    id: 'T1055.004',
    name: 'Asynchronous Procedure Call',
    reference: 'https://attack.mitre.org/techniques/T1055/004',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1055',
    value: 'asynchronousProcedureCall',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.atLinuxT1053Description',
      { defaultMessage: 'At (Linux) (T1053.001)' }
    ),
    id: 'T1053.001',
    name: 'At (Linux)',
    reference: 'https://attack.mitre.org/techniques/T1053/001',
    tactics: 'execution,persistence,privilege-escalation',
    techniqueId: 'T1053',
    value: 'atLinux',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.atWindowsT1053Description',
      { defaultMessage: 'At (Windows) (T1053.002)' }
    ),
    id: 'T1053.002',
    name: 'At (Windows)',
    reference: 'https://attack.mitre.org/techniques/T1053/002',
    tactics: 'execution,persistence,privilege-escalation',
    techniqueId: 'T1053',
    value: 'atWindows',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.authenticationPackageT1547Description',
      { defaultMessage: 'Authentication Package (T1547.002)' }
    ),
    id: 'T1547.002',
    name: 'Authentication Package',
    reference: 'https://attack.mitre.org/techniques/T1547/002',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1547',
    value: 'authenticationPackage',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.bashHistoryT1552Description',
      { defaultMessage: 'Bash History (T1552.003)' }
    ),
    id: 'T1552.003',
    name: 'Bash History',
    reference: 'https://attack.mitre.org/techniques/T1552/003',
    tactics: 'credential-access',
    techniqueId: 'T1552',
    value: 'bashHistory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.bidirectionalCommunicationT1102Description',
      { defaultMessage: 'Bidirectional Communication (T1102.002)' }
    ),
    id: 'T1102.002',
    name: 'Bidirectional Communication',
    reference: 'https://attack.mitre.org/techniques/T1102/002',
    tactics: 'command-and-control',
    techniqueId: 'T1102',
    value: 'bidirectionalCommunication',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.binaryPaddingT1027Description',
      { defaultMessage: 'Binary Padding (T1027.001)' }
    ),
    id: 'T1027.001',
    name: 'Binary Padding',
    reference: 'https://attack.mitre.org/techniques/T1027/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1027',
    value: 'binaryPadding',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.bootkitT1542Description',
      { defaultMessage: 'Bootkit (T1542.003)' }
    ),
    id: 'T1542.003',
    name: 'Bootkit',
    reference: 'https://attack.mitre.org/techniques/T1542/003',
    tactics: 'persistence,defense-evasion',
    techniqueId: 'T1542',
    value: 'bootkit',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.botnetT1583Description',
      { defaultMessage: 'Botnet (T1583.005)' }
    ),
    id: 'T1583.005',
    name: 'Botnet',
    reference: 'https://attack.mitre.org/techniques/T1583/005',
    tactics: 'resource-development',
    techniqueId: 'T1583',
    value: 'botnet',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.botnetT1584Description',
      { defaultMessage: 'Botnet (T1584.005)' }
    ),
    id: 'T1584.005',
    name: 'Botnet',
    reference: 'https://attack.mitre.org/techniques/T1584/005',
    tactics: 'resource-development',
    techniqueId: 'T1584',
    value: 'botnet',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.businessRelationshipsT1591Description',
      { defaultMessage: 'Business Relationships (T1591.002)' }
    ),
    id: 'T1591.002',
    name: 'Business Relationships',
    reference: 'https://attack.mitre.org/techniques/T1591/002',
    tactics: 'reconnaissance',
    techniqueId: 'T1591',
    value: 'businessRelationships',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.bypassUserAccountControlT1548Description',
      { defaultMessage: 'Bypass User Account Control (T1548.002)' }
    ),
    id: 'T1548.002',
    name: 'Bypass User Account Control',
    reference: 'https://attack.mitre.org/techniques/T1548/002',
    tactics: 'privilege-escalation,defense-evasion',
    techniqueId: 'T1548',
    value: 'bypassUserAccountControl',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.cdNsT1596Description',
      { defaultMessage: 'CDNs (T1596.004)' }
    ),
    id: 'T1596.004',
    name: 'CDNs',
    reference: 'https://attack.mitre.org/techniques/T1596/004',
    tactics: 'reconnaissance',
    techniqueId: 'T1596',
    value: 'cdNs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.cmstpT1218Description',
      { defaultMessage: 'CMSTP (T1218.003)' }
    ),
    id: 'T1218.003',
    name: 'CMSTP',
    reference: 'https://attack.mitre.org/techniques/T1218/003',
    tactics: 'defense-evasion',
    techniqueId: 'T1218',
    value: 'cmstp',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.corProfilerT1574Description',
      { defaultMessage: 'COR_PROFILER (T1574.012)' }
    ),
    id: 'T1574.012',
    name: 'COR_PROFILER',
    reference: 'https://attack.mitre.org/techniques/T1574/012',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    techniqueId: 'T1574',
    value: 'corProfiler',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.cachedDomainCredentialsT1003Description',
      { defaultMessage: 'Cached Domain Credentials (T1003.005)' }
    ),
    id: 'T1003.005',
    name: 'Cached Domain Credentials',
    reference: 'https://attack.mitre.org/techniques/T1003/005',
    tactics: 'credential-access',
    techniqueId: 'T1003',
    value: 'cachedDomainCredentials',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.changeDefaultFileAssociationT1546Description',
      { defaultMessage: 'Change Default File Association (T1546.001)' }
    ),
    id: 'T1546.001',
    name: 'Change Default File Association',
    reference: 'https://attack.mitre.org/techniques/T1546/001',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'changeDefaultFileAssociation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.clearCommandHistoryT1070Description',
      { defaultMessage: 'Clear Command History (T1070.003)' }
    ),
    id: 'T1070.003',
    name: 'Clear Command History',
    reference: 'https://attack.mitre.org/techniques/T1070/003',
    tactics: 'defense-evasion',
    techniqueId: 'T1070',
    value: 'clearCommandHistory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.clearLinuxOrMacSystemLogsT1070Description',
      { defaultMessage: 'Clear Linux or Mac System Logs (T1070.002)' }
    ),
    id: 'T1070.002',
    name: 'Clear Linux or Mac System Logs',
    reference: 'https://attack.mitre.org/techniques/T1070/002',
    tactics: 'defense-evasion',
    techniqueId: 'T1070',
    value: 'clearLinuxOrMacSystemLogs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.clearWindowsEventLogsT1070Description',
      { defaultMessage: 'Clear Windows Event Logs (T1070.001)' }
    ),
    id: 'T1070.001',
    name: 'Clear Windows Event Logs',
    reference: 'https://attack.mitre.org/techniques/T1070/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1070',
    value: 'clearWindowsEventLogs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.clientConfigurationsT1592Description',
      { defaultMessage: 'Client Configurations (T1592.004)' }
    ),
    id: 'T1592.004',
    name: 'Client Configurations',
    reference: 'https://attack.mitre.org/techniques/T1592/004',
    tactics: 'reconnaissance',
    techniqueId: 'T1592',
    value: 'clientConfigurations',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.cloudAccountT1136Description',
      { defaultMessage: 'Cloud Account (T1136.003)' }
    ),
    id: 'T1136.003',
    name: 'Cloud Account',
    reference: 'https://attack.mitre.org/techniques/T1136/003',
    tactics: 'persistence',
    techniqueId: 'T1136',
    value: 'cloudAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.cloudAccountT1087Description',
      { defaultMessage: 'Cloud Account (T1087.004)' }
    ),
    id: 'T1087.004',
    name: 'Cloud Account',
    reference: 'https://attack.mitre.org/techniques/T1087/004',
    tactics: 'discovery',
    techniqueId: 'T1087',
    value: 'cloudAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.cloudAccountsT1078Description',
      { defaultMessage: 'Cloud Accounts (T1078.004)' }
    ),
    id: 'T1078.004',
    name: 'Cloud Accounts',
    reference: 'https://attack.mitre.org/techniques/T1078/004',
    tactics: 'defense-evasion,persistence,privilege-escalation,initial-access',
    techniqueId: 'T1078',
    value: 'cloudAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.cloudGroupsT1069Description',
      { defaultMessage: 'Cloud Groups (T1069.003)' }
    ),
    id: 'T1069.003',
    name: 'Cloud Groups',
    reference: 'https://attack.mitre.org/techniques/T1069/003',
    tactics: 'discovery',
    techniqueId: 'T1069',
    value: 'cloudGroups',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.cloudInstanceMetadataApiT1552Description',
      { defaultMessage: 'Cloud Instance Metadata API (T1552.005)' }
    ),
    id: 'T1552.005',
    name: 'Cloud Instance Metadata API',
    reference: 'https://attack.mitre.org/techniques/T1552/005',
    tactics: 'credential-access',
    techniqueId: 'T1552',
    value: 'cloudInstanceMetadataApi',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.codeSigningT1553Description',
      { defaultMessage: 'Code Signing (T1553.002)' }
    ),
    id: 'T1553.002',
    name: 'Code Signing',
    reference: 'https://attack.mitre.org/techniques/T1553/002',
    tactics: 'defense-evasion',
    techniqueId: 'T1553',
    value: 'codeSigning',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.codeSigningCertificatesT1587Description',
      { defaultMessage: 'Code Signing Certificates (T1587.002)' }
    ),
    id: 'T1587.002',
    name: 'Code Signing Certificates',
    reference: 'https://attack.mitre.org/techniques/T1587/002',
    tactics: 'resource-development',
    techniqueId: 'T1587',
    value: 'codeSigningCertificates',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.codeSigningCertificatesT1588Description',
      { defaultMessage: 'Code Signing Certificates (T1588.003)' }
    ),
    id: 'T1588.003',
    name: 'Code Signing Certificates',
    reference: 'https://attack.mitre.org/techniques/T1588/003',
    tactics: 'resource-development',
    techniqueId: 'T1588',
    value: 'codeSigningCertificates',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.compileAfterDeliveryT1027Description',
      { defaultMessage: 'Compile After Delivery (T1027.004)' }
    ),
    id: 'T1027.004',
    name: 'Compile After Delivery',
    reference: 'https://attack.mitre.org/techniques/T1027/004',
    tactics: 'defense-evasion',
    techniqueId: 'T1027',
    value: 'compileAfterDelivery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.compiledHtmlFileT1218Description',
      { defaultMessage: 'Compiled HTML File (T1218.001)' }
    ),
    id: 'T1218.001',
    name: 'Compiled HTML File',
    reference: 'https://attack.mitre.org/techniques/T1218/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1218',
    value: 'compiledHtmlFile',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.componentFirmwareT1542Description',
      { defaultMessage: 'Component Firmware (T1542.002)' }
    ),
    id: 'T1542.002',
    name: 'Component Firmware',
    reference: 'https://attack.mitre.org/techniques/T1542/002',
    tactics: 'persistence,defense-evasion',
    techniqueId: 'T1542',
    value: 'componentFirmware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.componentObjectModelT1559Description',
      { defaultMessage: 'Component Object Model (T1559.001)' }
    ),
    id: 'T1559.001',
    name: 'Component Object Model',
    reference: 'https://attack.mitre.org/techniques/T1559/001',
    tactics: 'execution',
    techniqueId: 'T1559',
    value: 'componentObjectModel',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.componentObjectModelHijackingT1546Description',
      { defaultMessage: 'Component Object Model Hijacking (T1546.015)' }
    ),
    id: 'T1546.015',
    name: 'Component Object Model Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1546/015',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'componentObjectModelHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.compromiseHardwareSupplyChainT1195Description',
      { defaultMessage: 'Compromise Hardware Supply Chain (T1195.003)' }
    ),
    id: 'T1195.003',
    name: 'Compromise Hardware Supply Chain',
    reference: 'https://attack.mitre.org/techniques/T1195/003',
    tactics: 'initial-access',
    techniqueId: 'T1195',
    value: 'compromiseHardwareSupplyChain',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.compromiseSoftwareDependenciesAndDevelopmentToolsT1195Description',
      { defaultMessage: 'Compromise Software Dependencies and Development Tools (T1195.001)' }
    ),
    id: 'T1195.001',
    name: 'Compromise Software Dependencies and Development Tools',
    reference: 'https://attack.mitre.org/techniques/T1195/001',
    tactics: 'initial-access',
    techniqueId: 'T1195',
    value: 'compromiseSoftwareDependenciesAndDevelopmentTools',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.compromiseSoftwareSupplyChainT1195Description',
      { defaultMessage: 'Compromise Software Supply Chain (T1195.002)' }
    ),
    id: 'T1195.002',
    name: 'Compromise Software Supply Chain',
    reference: 'https://attack.mitre.org/techniques/T1195/002',
    tactics: 'initial-access',
    techniqueId: 'T1195',
    value: 'compromiseSoftwareSupplyChain',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.confluenceT1213Description',
      { defaultMessage: 'Confluence (T1213.001)' }
    ),
    id: 'T1213.001',
    name: 'Confluence',
    reference: 'https://attack.mitre.org/techniques/T1213/001',
    tactics: 'collection',
    techniqueId: 'T1213',
    value: 'confluence',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.controlPanelT1218Description',
      { defaultMessage: 'Control Panel (T1218.002)' }
    ),
    id: 'T1218.002',
    name: 'Control Panel',
    reference: 'https://attack.mitre.org/techniques/T1218/002',
    tactics: 'defense-evasion',
    techniqueId: 'T1218',
    value: 'controlPanel',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.createCloudInstanceT1578Description',
      { defaultMessage: 'Create Cloud Instance (T1578.002)' }
    ),
    id: 'T1578.002',
    name: 'Create Cloud Instance',
    reference: 'https://attack.mitre.org/techniques/T1578/002',
    tactics: 'defense-evasion',
    techniqueId: 'T1578',
    value: 'createCloudInstance',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.createProcessWithTokenT1134Description',
      { defaultMessage: 'Create Process with Token (T1134.002)' }
    ),
    id: 'T1134.002',
    name: 'Create Process with Token',
    reference: 'https://attack.mitre.org/techniques/T1134/002',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1134',
    value: 'createProcessWithToken',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.createSnapshotT1578Description',
      { defaultMessage: 'Create Snapshot (T1578.001)' }
    ),
    id: 'T1578.001',
    name: 'Create Snapshot',
    reference: 'https://attack.mitre.org/techniques/T1578/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1578',
    value: 'createSnapshot',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.credentialApiHookingT1056Description',
      { defaultMessage: 'Credential API Hooking (T1056.004)' }
    ),
    id: 'T1056.004',
    name: 'Credential API Hooking',
    reference: 'https://attack.mitre.org/techniques/T1056/004',
    tactics: 'collection,credential-access',
    techniqueId: 'T1056',
    value: 'credentialApiHooking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.credentialStuffingT1110Description',
      { defaultMessage: 'Credential Stuffing (T1110.004)' }
    ),
    id: 'T1110.004',
    name: 'Credential Stuffing',
    reference: 'https://attack.mitre.org/techniques/T1110/004',
    tactics: 'credential-access',
    techniqueId: 'T1110',
    value: 'credentialStuffing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.credentialsT1589Description',
      { defaultMessage: 'Credentials (T1589.001)' }
    ),
    id: 'T1589.001',
    name: 'Credentials',
    reference: 'https://attack.mitre.org/techniques/T1589/001',
    tactics: 'reconnaissance',
    techniqueId: 'T1589',
    value: 'credentials',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.credentialsInFilesT1552Description',
      { defaultMessage: 'Credentials In Files (T1552.001)' }
    ),
    id: 'T1552.001',
    name: 'Credentials In Files',
    reference: 'https://attack.mitre.org/techniques/T1552/001',
    tactics: 'credential-access',
    techniqueId: 'T1552',
    value: 'credentialsInFiles',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.credentialsFromWebBrowsersT1555Description',
      { defaultMessage: 'Credentials from Web Browsers (T1555.003)' }
    ),
    id: 'T1555.003',
    name: 'Credentials from Web Browsers',
    reference: 'https://attack.mitre.org/techniques/T1555/003',
    tactics: 'credential-access',
    techniqueId: 'T1555',
    value: 'credentialsFromWebBrowsers',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.credentialsInRegistryT1552Description',
      { defaultMessage: 'Credentials in Registry (T1552.002)' }
    ),
    id: 'T1552.002',
    name: 'Credentials in Registry',
    reference: 'https://attack.mitre.org/techniques/T1552/002',
    tactics: 'credential-access',
    techniqueId: 'T1552',
    value: 'credentialsInRegistry',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.cronT1053Description',
      { defaultMessage: 'Cron (T1053.003)' }
    ),
    id: 'T1053.003',
    name: 'Cron',
    reference: 'https://attack.mitre.org/techniques/T1053/003',
    tactics: 'execution,persistence,privilege-escalation',
    techniqueId: 'T1053',
    value: 'cron',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.dcSyncT1003Description',
      { defaultMessage: 'DCSync (T1003.006)' }
    ),
    id: 'T1003.006',
    name: 'DCSync',
    reference: 'https://attack.mitre.org/techniques/T1003/006',
    tactics: 'credential-access',
    techniqueId: 'T1003',
    value: 'dcSync',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.dllSearchOrderHijackingT1574Description',
      { defaultMessage: 'DLL Search Order Hijacking (T1574.001)' }
    ),
    id: 'T1574.001',
    name: 'DLL Search Order Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1574/001',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    techniqueId: 'T1574',
    value: 'dllSearchOrderHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.dllSideLoadingT1574Description',
      { defaultMessage: 'DLL Side-Loading (T1574.002)' }
    ),
    id: 'T1574.002',
    name: 'DLL Side-Loading',
    reference: 'https://attack.mitre.org/techniques/T1574/002',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    techniqueId: 'T1574',
    value: 'dllSideLoading',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.dnsT1071Description',
      { defaultMessage: 'DNS (T1071.004)' }
    ),
    id: 'T1071.004',
    name: 'DNS',
    reference: 'https://attack.mitre.org/techniques/T1071/004',
    tactics: 'command-and-control',
    techniqueId: 'T1071',
    value: 'dns',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.dnsT1590Description',
      { defaultMessage: 'DNS (T1590.002)' }
    ),
    id: 'T1590.002',
    name: 'DNS',
    reference: 'https://attack.mitre.org/techniques/T1590/002',
    tactics: 'reconnaissance',
    techniqueId: 'T1590',
    value: 'dns',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.dnsCalculationT1568Description',
      { defaultMessage: 'DNS Calculation (T1568.003)' }
    ),
    id: 'T1568.003',
    name: 'DNS Calculation',
    reference: 'https://attack.mitre.org/techniques/T1568/003',
    tactics: 'command-and-control',
    techniqueId: 'T1568',
    value: 'dnsCalculation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.dnsServerT1583Description',
      { defaultMessage: 'DNS Server (T1583.002)' }
    ),
    id: 'T1583.002',
    name: 'DNS Server',
    reference: 'https://attack.mitre.org/techniques/T1583/002',
    tactics: 'resource-development',
    techniqueId: 'T1583',
    value: 'dnsServer',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.dnsServerT1584Description',
      { defaultMessage: 'DNS Server (T1584.002)' }
    ),
    id: 'T1584.002',
    name: 'DNS Server',
    reference: 'https://attack.mitre.org/techniques/T1584/002',
    tactics: 'resource-development',
    techniqueId: 'T1584',
    value: 'dnsServer',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.dnsPassiveDnsT1596Description',
      { defaultMessage: 'DNS/Passive DNS (T1596.001)' }
    ),
    id: 'T1596.001',
    name: 'DNS/Passive DNS',
    reference: 'https://attack.mitre.org/techniques/T1596/001',
    tactics: 'reconnaissance',
    techniqueId: 'T1596',
    value: 'dnsPassiveDns',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.deadDropResolverT1102Description',
      { defaultMessage: 'Dead Drop Resolver (T1102.001)' }
    ),
    id: 'T1102.001',
    name: 'Dead Drop Resolver',
    reference: 'https://attack.mitre.org/techniques/T1102/001',
    tactics: 'command-and-control',
    techniqueId: 'T1102',
    value: 'deadDropResolver',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.defaultAccountsT1078Description',
      { defaultMessage: 'Default Accounts (T1078.001)' }
    ),
    id: 'T1078.001',
    name: 'Default Accounts',
    reference: 'https://attack.mitre.org/techniques/T1078/001',
    tactics: 'defense-evasion,persistence,privilege-escalation,initial-access',
    techniqueId: 'T1078',
    value: 'defaultAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.deleteCloudInstanceT1578Description',
      { defaultMessage: 'Delete Cloud Instance (T1578.003)' }
    ),
    id: 'T1578.003',
    name: 'Delete Cloud Instance',
    reference: 'https://attack.mitre.org/techniques/T1578/003',
    tactics: 'defense-evasion',
    techniqueId: 'T1578',
    value: 'deleteCloudInstance',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.determinePhysicalLocationsT1591Description',
      { defaultMessage: 'Determine Physical Locations (T1591.001)' }
    ),
    id: 'T1591.001',
    name: 'Determine Physical Locations',
    reference: 'https://attack.mitre.org/techniques/T1591/001',
    tactics: 'reconnaissance',
    techniqueId: 'T1591',
    value: 'determinePhysicalLocations',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.digitalCertificatesT1587Description',
      { defaultMessage: 'Digital Certificates (T1587.003)' }
    ),
    id: 'T1587.003',
    name: 'Digital Certificates',
    reference: 'https://attack.mitre.org/techniques/T1587/003',
    tactics: 'resource-development',
    techniqueId: 'T1587',
    value: 'digitalCertificates',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.digitalCertificatesT1588Description',
      { defaultMessage: 'Digital Certificates (T1588.004)' }
    ),
    id: 'T1588.004',
    name: 'Digital Certificates',
    reference: 'https://attack.mitre.org/techniques/T1588/004',
    tactics: 'resource-development',
    techniqueId: 'T1588',
    value: 'digitalCertificates',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.digitalCertificatesT1596Description',
      { defaultMessage: 'Digital Certificates (T1596.003)' }
    ),
    id: 'T1596.003',
    name: 'Digital Certificates',
    reference: 'https://attack.mitre.org/techniques/T1596/003',
    tactics: 'reconnaissance',
    techniqueId: 'T1596',
    value: 'digitalCertificates',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.directNetworkFloodT1498Description',
      { defaultMessage: 'Direct Network Flood (T1498.001)' }
    ),
    id: 'T1498.001',
    name: 'Direct Network Flood',
    reference: 'https://attack.mitre.org/techniques/T1498/001',
    tactics: 'impact',
    techniqueId: 'T1498',
    value: 'directNetworkFlood',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.disableCloudLogsT1562Description',
      { defaultMessage: 'Disable Cloud Logs (T1562.008)' }
    ),
    id: 'T1562.008',
    name: 'Disable Cloud Logs',
    reference: 'https://attack.mitre.org/techniques/T1562/008',
    tactics: 'defense-evasion',
    techniqueId: 'T1562',
    value: 'disableCloudLogs',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.disableCryptoHardwareT1600Description',
      { defaultMessage: 'Disable Crypto Hardware (T1600.002)' }
    ),
    id: 'T1600.002',
    name: 'Disable Crypto Hardware',
    reference: 'https://attack.mitre.org/techniques/T1600/002',
    tactics: 'defense-evasion',
    techniqueId: 'T1600',
    value: 'disableCryptoHardware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.disableWindowsEventLoggingT1562Description',
      { defaultMessage: 'Disable Windows Event Logging (T1562.002)' }
    ),
    id: 'T1562.002',
    name: 'Disable Windows Event Logging',
    reference: 'https://attack.mitre.org/techniques/T1562/002',
    tactics: 'defense-evasion',
    techniqueId: 'T1562',
    value: 'disableWindowsEventLogging',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.disableOrModifyCloudFirewallT1562Description',
      { defaultMessage: 'Disable or Modify Cloud Firewall (T1562.007)' }
    ),
    id: 'T1562.007',
    name: 'Disable or Modify Cloud Firewall',
    reference: 'https://attack.mitre.org/techniques/T1562/007',
    tactics: 'defense-evasion',
    techniqueId: 'T1562',
    value: 'disableOrModifyCloudFirewall',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.disableOrModifySystemFirewallT1562Description',
      { defaultMessage: 'Disable or Modify System Firewall (T1562.004)' }
    ),
    id: 'T1562.004',
    name: 'Disable or Modify System Firewall',
    reference: 'https://attack.mitre.org/techniques/T1562/004',
    tactics: 'defense-evasion',
    techniqueId: 'T1562',
    value: 'disableOrModifySystemFirewall',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.disableOrModifyToolsT1562Description',
      { defaultMessage: 'Disable or Modify Tools (T1562.001)' }
    ),
    id: 'T1562.001',
    name: 'Disable or Modify Tools',
    reference: 'https://attack.mitre.org/techniques/T1562/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1562',
    value: 'disableOrModifyTools',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.diskContentWipeT1561Description',
      { defaultMessage: 'Disk Content Wipe (T1561.001)' }
    ),
    id: 'T1561.001',
    name: 'Disk Content Wipe',
    reference: 'https://attack.mitre.org/techniques/T1561/001',
    tactics: 'impact',
    techniqueId: 'T1561',
    value: 'diskContentWipe',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.diskStructureWipeT1561Description',
      { defaultMessage: 'Disk Structure Wipe (T1561.002)' }
    ),
    id: 'T1561.002',
    name: 'Disk Structure Wipe',
    reference: 'https://attack.mitre.org/techniques/T1561/002',
    tactics: 'impact',
    techniqueId: 'T1561',
    value: 'diskStructureWipe',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.distributedComponentObjectModelT1021Description',
      { defaultMessage: 'Distributed Component Object Model (T1021.003)' }
    ),
    id: 'T1021.003',
    name: 'Distributed Component Object Model',
    reference: 'https://attack.mitre.org/techniques/T1021/003',
    tactics: 'lateral-movement',
    techniqueId: 'T1021',
    value: 'distributedComponentObjectModel',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.domainAccountT1136Description',
      { defaultMessage: 'Domain Account (T1136.002)' }
    ),
    id: 'T1136.002',
    name: 'Domain Account',
    reference: 'https://attack.mitre.org/techniques/T1136/002',
    tactics: 'persistence',
    techniqueId: 'T1136',
    value: 'domainAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.domainAccountT1087Description',
      { defaultMessage: 'Domain Account (T1087.002)' }
    ),
    id: 'T1087.002',
    name: 'Domain Account',
    reference: 'https://attack.mitre.org/techniques/T1087/002',
    tactics: 'discovery',
    techniqueId: 'T1087',
    value: 'domainAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.domainAccountsT1078Description',
      { defaultMessage: 'Domain Accounts (T1078.002)' }
    ),
    id: 'T1078.002',
    name: 'Domain Accounts',
    reference: 'https://attack.mitre.org/techniques/T1078/002',
    tactics: 'defense-evasion,persistence,privilege-escalation,initial-access',
    techniqueId: 'T1078',
    value: 'domainAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.domainControllerAuthenticationT1556Description',
      { defaultMessage: 'Domain Controller Authentication (T1556.001)' }
    ),
    id: 'T1556.001',
    name: 'Domain Controller Authentication',
    reference: 'https://attack.mitre.org/techniques/T1556/001',
    tactics: 'credential-access,defense-evasion',
    techniqueId: 'T1556',
    value: 'domainControllerAuthentication',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.domainFrontingT1090Description',
      { defaultMessage: 'Domain Fronting (T1090.004)' }
    ),
    id: 'T1090.004',
    name: 'Domain Fronting',
    reference: 'https://attack.mitre.org/techniques/T1090/004',
    tactics: 'command-and-control',
    techniqueId: 'T1090',
    value: 'domainFronting',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.domainGenerationAlgorithmsT1568Description',
      { defaultMessage: 'Domain Generation Algorithms (T1568.002)' }
    ),
    id: 'T1568.002',
    name: 'Domain Generation Algorithms',
    reference: 'https://attack.mitre.org/techniques/T1568/002',
    tactics: 'command-and-control',
    techniqueId: 'T1568',
    value: 'domainGenerationAlgorithms',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.domainGroupsT1069Description',
      { defaultMessage: 'Domain Groups (T1069.002)' }
    ),
    id: 'T1069.002',
    name: 'Domain Groups',
    reference: 'https://attack.mitre.org/techniques/T1069/002',
    tactics: 'discovery',
    techniqueId: 'T1069',
    value: 'domainGroups',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.domainPropertiesT1590Description',
      { defaultMessage: 'Domain Properties (T1590.001)' }
    ),
    id: 'T1590.001',
    name: 'Domain Properties',
    reference: 'https://attack.mitre.org/techniques/T1590/001',
    tactics: 'reconnaissance',
    techniqueId: 'T1590',
    value: 'domainProperties',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.domainsT1583Description',
      { defaultMessage: 'Domains (T1583.001)' }
    ),
    id: 'T1583.001',
    name: 'Domains',
    reference: 'https://attack.mitre.org/techniques/T1583/001',
    tactics: 'resource-development',
    techniqueId: 'T1583',
    value: 'domains',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.domainsT1584Description',
      { defaultMessage: 'Domains (T1584.001)' }
    ),
    id: 'T1584.001',
    name: 'Domains',
    reference: 'https://attack.mitre.org/techniques/T1584/001',
    tactics: 'resource-development',
    techniqueId: 'T1584',
    value: 'domains',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.downgradeSystemImageT1601Description',
      { defaultMessage: 'Downgrade System Image (T1601.002)' }
    ),
    id: 'T1601.002',
    name: 'Downgrade System Image',
    reference: 'https://attack.mitre.org/techniques/T1601/002',
    tactics: 'defense-evasion',
    techniqueId: 'T1601',
    value: 'downgradeSystemImage',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.dylibHijackingT1574Description',
      { defaultMessage: 'Dylib Hijacking (T1574.004)' }
    ),
    id: 'T1574.004',
    name: 'Dylib Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1574/004',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    techniqueId: 'T1574',
    value: 'dylibHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.dynamicDataExchangeT1559Description',
      { defaultMessage: 'Dynamic Data Exchange (T1559.002)' }
    ),
    id: 'T1559.002',
    name: 'Dynamic Data Exchange',
    reference: 'https://attack.mitre.org/techniques/T1559/002',
    tactics: 'execution',
    techniqueId: 'T1559',
    value: 'dynamicDataExchange',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.dynamicLinkLibraryInjectionT1055Description',
      { defaultMessage: 'Dynamic-link Library Injection (T1055.001)' }
    ),
    id: 'T1055.001',
    name: 'Dynamic-link Library Injection',
    reference: 'https://attack.mitre.org/techniques/T1055/001',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1055',
    value: 'dynamicLinkLibraryInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.elevatedExecutionWithPromptT1548Description',
      { defaultMessage: 'Elevated Execution with Prompt (T1548.004)' }
    ),
    id: 'T1548.004',
    name: 'Elevated Execution with Prompt',
    reference: 'https://attack.mitre.org/techniques/T1548/004',
    tactics: 'privilege-escalation,defense-evasion',
    techniqueId: 'T1548',
    value: 'elevatedExecutionWithPrompt',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.emailAccountT1087Description',
      { defaultMessage: 'Email Account (T1087.003)' }
    ),
    id: 'T1087.003',
    name: 'Email Account',
    reference: 'https://attack.mitre.org/techniques/T1087/003',
    tactics: 'discovery',
    techniqueId: 'T1087',
    value: 'emailAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.emailAccountsT1585Description',
      { defaultMessage: 'Email Accounts (T1585.002)' }
    ),
    id: 'T1585.002',
    name: 'Email Accounts',
    reference: 'https://attack.mitre.org/techniques/T1585/002',
    tactics: 'resource-development',
    techniqueId: 'T1585',
    value: 'emailAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.emailAccountsT1586Description',
      { defaultMessage: 'Email Accounts (T1586.002)' }
    ),
    id: 'T1586.002',
    name: 'Email Accounts',
    reference: 'https://attack.mitre.org/techniques/T1586/002',
    tactics: 'resource-development',
    techniqueId: 'T1586',
    value: 'emailAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.emailAddressesT1589Description',
      { defaultMessage: 'Email Addresses (T1589.002)' }
    ),
    id: 'T1589.002',
    name: 'Email Addresses',
    reference: 'https://attack.mitre.org/techniques/T1589/002',
    tactics: 'reconnaissance',
    techniqueId: 'T1589',
    value: 'emailAddresses',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.emailForwardingRuleT1114Description',
      { defaultMessage: 'Email Forwarding Rule (T1114.003)' }
    ),
    id: 'T1114.003',
    name: 'Email Forwarding Rule',
    reference: 'https://attack.mitre.org/techniques/T1114/003',
    tactics: 'collection',
    techniqueId: 'T1114',
    value: 'emailForwardingRule',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.emondT1546Description',
      { defaultMessage: 'Emond (T1546.014)' }
    ),
    id: 'T1546.014',
    name: 'Emond',
    reference: 'https://attack.mitre.org/techniques/T1546/014',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'emond',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.employeeNamesT1589Description',
      { defaultMessage: 'Employee Names (T1589.003)' }
    ),
    id: 'T1589.003',
    name: 'Employee Names',
    reference: 'https://attack.mitre.org/techniques/T1589/003',
    tactics: 'reconnaissance',
    techniqueId: 'T1589',
    value: 'employeeNames',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.environmentalKeyingT1480Description',
      { defaultMessage: 'Environmental Keying (T1480.001)' }
    ),
    id: 'T1480.001',
    name: 'Environmental Keying',
    reference: 'https://attack.mitre.org/techniques/T1480/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1480',
    value: 'environmentalKeying',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.exchangeEmailDelegatePermissionsT1098Description',
      { defaultMessage: 'Exchange Email Delegate Permissions (T1098.002)' }
    ),
    id: 'T1098.002',
    name: 'Exchange Email Delegate Permissions',
    reference: 'https://attack.mitre.org/techniques/T1098/002',
    tactics: 'persistence',
    techniqueId: 'T1098',
    value: 'exchangeEmailDelegatePermissions',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.executableInstallerFilePermissionsWeaknessT1574Description',
      { defaultMessage: 'Executable Installer File Permissions Weakness (T1574.005)' }
    ),
    id: 'T1574.005',
    name: 'Executable Installer File Permissions Weakness',
    reference: 'https://attack.mitre.org/techniques/T1574/005',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    techniqueId: 'T1574',
    value: 'executableInstallerFilePermissionsWeakness',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.exfiltrationOverAsymmetricEncryptedNonC2ProtocolT1048Description',
      { defaultMessage: 'Exfiltration Over Asymmetric Encrypted Non-C2 Protocol (T1048.002)' }
    ),
    id: 'T1048.002',
    name: 'Exfiltration Over Asymmetric Encrypted Non-C2 Protocol',
    reference: 'https://attack.mitre.org/techniques/T1048/002',
    tactics: 'exfiltration',
    techniqueId: 'T1048',
    value: 'exfiltrationOverAsymmetricEncryptedNonC2Protocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.exfiltrationOverBluetoothT1011Description',
      { defaultMessage: 'Exfiltration Over Bluetooth (T1011.001)' }
    ),
    id: 'T1011.001',
    name: 'Exfiltration Over Bluetooth',
    reference: 'https://attack.mitre.org/techniques/T1011/001',
    tactics: 'exfiltration',
    techniqueId: 'T1011',
    value: 'exfiltrationOverBluetooth',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.exfiltrationOverSymmetricEncryptedNonC2ProtocolT1048Description',
      { defaultMessage: 'Exfiltration Over Symmetric Encrypted Non-C2 Protocol (T1048.001)' }
    ),
    id: 'T1048.001',
    name: 'Exfiltration Over Symmetric Encrypted Non-C2 Protocol',
    reference: 'https://attack.mitre.org/techniques/T1048/001',
    tactics: 'exfiltration',
    techniqueId: 'T1048',
    value: 'exfiltrationOverSymmetricEncryptedNonC2Protocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.exfiltrationOverUnencryptedObfuscatedNonC2ProtocolT1048Description',
      { defaultMessage: 'Exfiltration Over Unencrypted/Obfuscated Non-C2 Protocol (T1048.003)' }
    ),
    id: 'T1048.003',
    name: 'Exfiltration Over Unencrypted/Obfuscated Non-C2 Protocol',
    reference: 'https://attack.mitre.org/techniques/T1048/003',
    tactics: 'exfiltration',
    techniqueId: 'T1048',
    value: 'exfiltrationOverUnencryptedObfuscatedNonC2Protocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.exfiltrationOverUsbT1052Description',
      { defaultMessage: 'Exfiltration over USB (T1052.001)' }
    ),
    id: 'T1052.001',
    name: 'Exfiltration over USB',
    reference: 'https://attack.mitre.org/techniques/T1052/001',
    tactics: 'exfiltration',
    techniqueId: 'T1052',
    value: 'exfiltrationOverUsb',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.exfiltrationToCloudStorageT1567Description',
      { defaultMessage: 'Exfiltration to Cloud Storage (T1567.002)' }
    ),
    id: 'T1567.002',
    name: 'Exfiltration to Cloud Storage',
    reference: 'https://attack.mitre.org/techniques/T1567/002',
    tactics: 'exfiltration',
    techniqueId: 'T1567',
    value: 'exfiltrationToCloudStorage',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.exfiltrationToCodeRepositoryT1567Description',
      { defaultMessage: 'Exfiltration to Code Repository (T1567.001)' }
    ),
    id: 'T1567.001',
    name: 'Exfiltration to Code Repository',
    reference: 'https://attack.mitre.org/techniques/T1567/001',
    tactics: 'exfiltration',
    techniqueId: 'T1567',
    value: 'exfiltrationToCodeRepository',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.exploitsT1587Description',
      { defaultMessage: 'Exploits (T1587.004)' }
    ),
    id: 'T1587.004',
    name: 'Exploits',
    reference: 'https://attack.mitre.org/techniques/T1587/004',
    tactics: 'resource-development',
    techniqueId: 'T1587',
    value: 'exploits',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.exploitsT1588Description',
      { defaultMessage: 'Exploits (T1588.005)' }
    ),
    id: 'T1588.005',
    name: 'Exploits',
    reference: 'https://attack.mitre.org/techniques/T1588/005',
    tactics: 'resource-development',
    techniqueId: 'T1588',
    value: 'exploits',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.externalDefacementT1491Description',
      { defaultMessage: 'External Defacement (T1491.002)' }
    ),
    id: 'T1491.002',
    name: 'External Defacement',
    reference: 'https://attack.mitre.org/techniques/T1491/002',
    tactics: 'impact',
    techniqueId: 'T1491',
    value: 'externalDefacement',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.externalProxyT1090Description',
      { defaultMessage: 'External Proxy (T1090.002)' }
    ),
    id: 'T1090.002',
    name: 'External Proxy',
    reference: 'https://attack.mitre.org/techniques/T1090/002',
    tactics: 'command-and-control',
    techniqueId: 'T1090',
    value: 'externalProxy',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.extraWindowMemoryInjectionT1055Description',
      { defaultMessage: 'Extra Window Memory Injection (T1055.011)' }
    ),
    id: 'T1055.011',
    name: 'Extra Window Memory Injection',
    reference: 'https://attack.mitre.org/techniques/T1055/011',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1055',
    value: 'extraWindowMemoryInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.fastFluxDnsT1568Description',
      { defaultMessage: 'Fast Flux DNS (T1568.001)' }
    ),
    id: 'T1568.001',
    name: 'Fast Flux DNS',
    reference: 'https://attack.mitre.org/techniques/T1568/001',
    tactics: 'command-and-control',
    techniqueId: 'T1568',
    value: 'fastFluxDns',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.fileDeletionT1070Description',
      { defaultMessage: 'File Deletion (T1070.004)' }
    ),
    id: 'T1070.004',
    name: 'File Deletion',
    reference: 'https://attack.mitre.org/techniques/T1070/004',
    tactics: 'defense-evasion',
    techniqueId: 'T1070',
    value: 'fileDeletion',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.fileTransferProtocolsT1071Description',
      { defaultMessage: 'File Transfer Protocols (T1071.002)' }
    ),
    id: 'T1071.002',
    name: 'File Transfer Protocols',
    reference: 'https://attack.mitre.org/techniques/T1071/002',
    tactics: 'command-and-control',
    techniqueId: 'T1071',
    value: 'fileTransferProtocols',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.firmwareT1592Description',
      { defaultMessage: 'Firmware (T1592.003)' }
    ),
    id: 'T1592.003',
    name: 'Firmware',
    reference: 'https://attack.mitre.org/techniques/T1592/003',
    tactics: 'reconnaissance',
    techniqueId: 'T1592',
    value: 'firmware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.guiInputCaptureT1056Description',
      { defaultMessage: 'GUI Input Capture (T1056.002)' }
    ),
    id: 'T1056.002',
    name: 'GUI Input Capture',
    reference: 'https://attack.mitre.org/techniques/T1056/002',
    tactics: 'collection,credential-access',
    techniqueId: 'T1056',
    value: 'guiInputCapture',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.gatekeeperBypassT1553Description',
      { defaultMessage: 'Gatekeeper Bypass (T1553.001)' }
    ),
    id: 'T1553.001',
    name: 'Gatekeeper Bypass',
    reference: 'https://attack.mitre.org/techniques/T1553/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1553',
    value: 'gatekeeperBypass',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.goldenTicketT1558Description',
      { defaultMessage: 'Golden Ticket (T1558.001)' }
    ),
    id: 'T1558.001',
    name: 'Golden Ticket',
    reference: 'https://attack.mitre.org/techniques/T1558/001',
    tactics: 'credential-access',
    techniqueId: 'T1558',
    value: 'goldenTicket',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.groupPolicyPreferencesT1552Description',
      { defaultMessage: 'Group Policy Preferences (T1552.006)' }
    ),
    id: 'T1552.006',
    name: 'Group Policy Preferences',
    reference: 'https://attack.mitre.org/techniques/T1552/006',
    tactics: 'credential-access',
    techniqueId: 'T1552',
    value: 'groupPolicyPreferences',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.hardwareT1592Description',
      { defaultMessage: 'Hardware (T1592.001)' }
    ),
    id: 'T1592.001',
    name: 'Hardware',
    reference: 'https://attack.mitre.org/techniques/T1592/001',
    tactics: 'reconnaissance',
    techniqueId: 'T1592',
    value: 'hardware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.hiddenFileSystemT1564Description',
      { defaultMessage: 'Hidden File System (T1564.005)' }
    ),
    id: 'T1564.005',
    name: 'Hidden File System',
    reference: 'https://attack.mitre.org/techniques/T1564/005',
    tactics: 'defense-evasion',
    techniqueId: 'T1564',
    value: 'hiddenFileSystem',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.hiddenFilesAndDirectoriesT1564Description',
      { defaultMessage: 'Hidden Files and Directories (T1564.001)' }
    ),
    id: 'T1564.001',
    name: 'Hidden Files and Directories',
    reference: 'https://attack.mitre.org/techniques/T1564/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1564',
    value: 'hiddenFilesAndDirectories',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.hiddenUsersT1564Description',
      { defaultMessage: 'Hidden Users (T1564.002)' }
    ),
    id: 'T1564.002',
    name: 'Hidden Users',
    reference: 'https://attack.mitre.org/techniques/T1564/002',
    tactics: 'defense-evasion',
    techniqueId: 'T1564',
    value: 'hiddenUsers',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.hiddenWindowT1564Description',
      { defaultMessage: 'Hidden Window (T1564.003)' }
    ),
    id: 'T1564.003',
    name: 'Hidden Window',
    reference: 'https://attack.mitre.org/techniques/T1564/003',
    tactics: 'defense-evasion',
    techniqueId: 'T1564',
    value: 'hiddenWindow',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.ipAddressesT1590Description',
      { defaultMessage: 'IP Addresses (T1590.005)' }
    ),
    id: 'T1590.005',
    name: 'IP Addresses',
    reference: 'https://attack.mitre.org/techniques/T1590/005',
    tactics: 'reconnaissance',
    techniqueId: 'T1590',
    value: 'ipAddresses',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.identifyBusinessTempoT1591Description',
      { defaultMessage: 'Identify Business Tempo (T1591.003)' }
    ),
    id: 'T1591.003',
    name: 'Identify Business Tempo',
    reference: 'https://attack.mitre.org/techniques/T1591/003',
    tactics: 'reconnaissance',
    techniqueId: 'T1591',
    value: 'identifyBusinessTempo',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.identifyRolesT1591Description',
      { defaultMessage: 'Identify Roles (T1591.004)' }
    ),
    id: 'T1591.004',
    name: 'Identify Roles',
    reference: 'https://attack.mitre.org/techniques/T1591/004',
    tactics: 'reconnaissance',
    techniqueId: 'T1591',
    value: 'identifyRoles',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.imageFileExecutionOptionsInjectionT1546Description',
      { defaultMessage: 'Image File Execution Options Injection (T1546.012)' }
    ),
    id: 'T1546.012',
    name: 'Image File Execution Options Injection',
    reference: 'https://attack.mitre.org/techniques/T1546/012',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'imageFileExecutionOptionsInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.impairCommandHistoryLoggingT1562Description',
      { defaultMessage: 'Impair Command History Logging (T1562.003)' }
    ),
    id: 'T1562.003',
    name: 'Impair Command History Logging',
    reference: 'https://attack.mitre.org/techniques/T1562/003',
    tactics: 'defense-evasion',
    techniqueId: 'T1562',
    value: 'impairCommandHistoryLogging',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.indicatorBlockingT1562Description',
      { defaultMessage: 'Indicator Blocking (T1562.006)' }
    ),
    id: 'T1562.006',
    name: 'Indicator Blocking',
    reference: 'https://attack.mitre.org/techniques/T1562/006',
    tactics: 'defense-evasion',
    techniqueId: 'T1562',
    value: 'indicatorBlocking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.indicatorRemovalFromToolsT1027Description',
      { defaultMessage: 'Indicator Removal from Tools (T1027.005)' }
    ),
    id: 'T1027.005',
    name: 'Indicator Removal from Tools',
    reference: 'https://attack.mitre.org/techniques/T1027/005',
    tactics: 'defense-evasion',
    techniqueId: 'T1027',
    value: 'indicatorRemovalFromTools',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.installRootCertificateT1553Description',
      { defaultMessage: 'Install Root Certificate (T1553.004)' }
    ),
    id: 'T1553.004',
    name: 'Install Root Certificate',
    reference: 'https://attack.mitre.org/techniques/T1553/004',
    tactics: 'defense-evasion',
    techniqueId: 'T1553',
    value: 'installRootCertificate',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.installUtilT1218Description',
      { defaultMessage: 'InstallUtil (T1218.004)' }
    ),
    id: 'T1218.004',
    name: 'InstallUtil',
    reference: 'https://attack.mitre.org/techniques/T1218/004',
    tactics: 'defense-evasion',
    techniqueId: 'T1218',
    value: 'installUtil',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.internalDefacementT1491Description',
      { defaultMessage: 'Internal Defacement (T1491.001)' }
    ),
    id: 'T1491.001',
    name: 'Internal Defacement',
    reference: 'https://attack.mitre.org/techniques/T1491/001',
    tactics: 'impact',
    techniqueId: 'T1491',
    value: 'internalDefacement',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.internalProxyT1090Description',
      { defaultMessage: 'Internal Proxy (T1090.001)' }
    ),
    id: 'T1090.001',
    name: 'Internal Proxy',
    reference: 'https://attack.mitre.org/techniques/T1090/001',
    tactics: 'command-and-control',
    techniqueId: 'T1090',
    value: 'internalProxy',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.invalidCodeSignatureT1036Description',
      { defaultMessage: 'Invalid Code Signature (T1036.001)' }
    ),
    id: 'T1036.001',
    name: 'Invalid Code Signature',
    reference: 'https://attack.mitre.org/techniques/T1036/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1036',
    value: 'invalidCodeSignature',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.javaScriptJScriptT1059Description',
      { defaultMessage: 'JavaScript/JScript (T1059.007)' }
    ),
    id: 'T1059.007',
    name: 'JavaScript/JScript',
    reference: 'https://attack.mitre.org/techniques/T1059/007',
    tactics: 'execution',
    techniqueId: 'T1059',
    value: 'javaScriptJScript',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.junkDataT1001Description',
      { defaultMessage: 'Junk Data (T1001.001)' }
    ),
    id: 'T1001.001',
    name: 'Junk Data',
    reference: 'https://attack.mitre.org/techniques/T1001/001',
    tactics: 'command-and-control',
    techniqueId: 'T1001',
    value: 'junkData',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.kerberoastingT1558Description',
      { defaultMessage: 'Kerberoasting (T1558.003)' }
    ),
    id: 'T1558.003',
    name: 'Kerberoasting',
    reference: 'https://attack.mitre.org/techniques/T1558/003',
    tactics: 'credential-access',
    techniqueId: 'T1558',
    value: 'kerberoasting',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.kernelModulesAndExtensionsT1547Description',
      { defaultMessage: 'Kernel Modules and Extensions (T1547.006)' }
    ),
    id: 'T1547.006',
    name: 'Kernel Modules and Extensions',
    reference: 'https://attack.mitre.org/techniques/T1547/006',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1547',
    value: 'kernelModulesAndExtensions',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.keychainT1555Description',
      { defaultMessage: 'Keychain (T1555.001)' }
    ),
    id: 'T1555.001',
    name: 'Keychain',
    reference: 'https://attack.mitre.org/techniques/T1555/001',
    tactics: 'credential-access',
    techniqueId: 'T1555',
    value: 'keychain',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.keyloggingT1056Description',
      { defaultMessage: 'Keylogging (T1056.001)' }
    ),
    id: 'T1056.001',
    name: 'Keylogging',
    reference: 'https://attack.mitre.org/techniques/T1056/001',
    tactics: 'collection,credential-access',
    techniqueId: 'T1056',
    value: 'keylogging',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.lcLoadDylibAdditionT1546Description',
      { defaultMessage: 'LC_LOAD_DYLIB Addition (T1546.006)' }
    ),
    id: 'T1546.006',
    name: 'LC_LOAD_DYLIB Addition',
    reference: 'https://attack.mitre.org/techniques/T1546/006',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'lcLoadDylibAddition',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.ldPreloadT1574Description',
      { defaultMessage: 'LD_PRELOAD (T1574.006)' }
    ),
    id: 'T1574.006',
    name: 'LD_PRELOAD',
    reference: 'https://attack.mitre.org/techniques/T1574/006',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    techniqueId: 'T1574',
    value: 'ldPreload',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.llmnrNbtNsPoisoningAndSmbRelayT1557Description',
      { defaultMessage: 'LLMNR/NBT-NS Poisoning and SMB Relay (T1557.001)' }
    ),
    id: 'T1557.001',
    name: 'LLMNR/NBT-NS Poisoning and SMB Relay',
    reference: 'https://attack.mitre.org/techniques/T1557/001',
    tactics: 'credential-access,collection',
    techniqueId: 'T1557',
    value: 'llmnrNbtNsPoisoningAndSmbRelay',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.lsaSecretsT1003Description',
      { defaultMessage: 'LSA Secrets (T1003.004)' }
    ),
    id: 'T1003.004',
    name: 'LSA Secrets',
    reference: 'https://attack.mitre.org/techniques/T1003/004',
    tactics: 'credential-access',
    techniqueId: 'T1003',
    value: 'lsaSecrets',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.lsassDriverT1547Description',
      { defaultMessage: 'LSASS Driver (T1547.008)' }
    ),
    id: 'T1547.008',
    name: 'LSASS Driver',
    reference: 'https://attack.mitre.org/techniques/T1547/008',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1547',
    value: 'lsassDriver',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.lsassMemoryT1003Description',
      { defaultMessage: 'LSASS Memory (T1003.001)' }
    ),
    id: 'T1003.001',
    name: 'LSASS Memory',
    reference: 'https://attack.mitre.org/techniques/T1003/001',
    tactics: 'credential-access',
    techniqueId: 'T1003',
    value: 'lsassMemory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.launchAgentT1543Description',
      { defaultMessage: 'Launch Agent (T1543.001)' }
    ),
    id: 'T1543.001',
    name: 'Launch Agent',
    reference: 'https://attack.mitre.org/techniques/T1543/001',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1543',
    value: 'launchAgent',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.launchDaemonT1543Description',
      { defaultMessage: 'Launch Daemon (T1543.004)' }
    ),
    id: 'T1543.004',
    name: 'Launch Daemon',
    reference: 'https://attack.mitre.org/techniques/T1543/004',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1543',
    value: 'launchDaemon',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.launchctlT1569Description',
      { defaultMessage: 'Launchctl (T1569.001)' }
    ),
    id: 'T1569.001',
    name: 'Launchctl',
    reference: 'https://attack.mitre.org/techniques/T1569/001',
    tactics: 'execution',
    techniqueId: 'T1569',
    value: 'launchctl',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.launchdT1053Description',
      { defaultMessage: 'Launchd (T1053.004)' }
    ),
    id: 'T1053.004',
    name: 'Launchd',
    reference: 'https://attack.mitre.org/techniques/T1053/004',
    tactics: 'execution,persistence,privilege-escalation',
    techniqueId: 'T1053',
    value: 'launchd',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.linuxAndMacFileAndDirectoryPermissionsModificationT1222Description',
      { defaultMessage: 'Linux and Mac File and Directory Permissions Modification (T1222.002)' }
    ),
    id: 'T1222.002',
    name: 'Linux and Mac File and Directory Permissions Modification',
    reference: 'https://attack.mitre.org/techniques/T1222/002',
    tactics: 'defense-evasion',
    techniqueId: 'T1222',
    value: 'linuxAndMacFileAndDirectoryPermissionsModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.localAccountT1136Description',
      { defaultMessage: 'Local Account (T1136.001)' }
    ),
    id: 'T1136.001',
    name: 'Local Account',
    reference: 'https://attack.mitre.org/techniques/T1136/001',
    tactics: 'persistence',
    techniqueId: 'T1136',
    value: 'localAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.localAccountT1087Description',
      { defaultMessage: 'Local Account (T1087.001)' }
    ),
    id: 'T1087.001',
    name: 'Local Account',
    reference: 'https://attack.mitre.org/techniques/T1087/001',
    tactics: 'discovery',
    techniqueId: 'T1087',
    value: 'localAccount',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.localAccountsT1078Description',
      { defaultMessage: 'Local Accounts (T1078.003)' }
    ),
    id: 'T1078.003',
    name: 'Local Accounts',
    reference: 'https://attack.mitre.org/techniques/T1078/003',
    tactics: 'defense-evasion,persistence,privilege-escalation,initial-access',
    techniqueId: 'T1078',
    value: 'localAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.localDataStagingT1074Description',
      { defaultMessage: 'Local Data Staging (T1074.001)' }
    ),
    id: 'T1074.001',
    name: 'Local Data Staging',
    reference: 'https://attack.mitre.org/techniques/T1074/001',
    tactics: 'collection',
    techniqueId: 'T1074',
    value: 'localDataStaging',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.localEmailCollectionT1114Description',
      { defaultMessage: 'Local Email Collection (T1114.001)' }
    ),
    id: 'T1114.001',
    name: 'Local Email Collection',
    reference: 'https://attack.mitre.org/techniques/T1114/001',
    tactics: 'collection',
    techniqueId: 'T1114',
    value: 'localEmailCollection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.localGroupsT1069Description',
      { defaultMessage: 'Local Groups (T1069.001)' }
    ),
    id: 'T1069.001',
    name: 'Local Groups',
    reference: 'https://attack.mitre.org/techniques/T1069/001',
    tactics: 'discovery',
    techniqueId: 'T1069',
    value: 'localGroups',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.logonScriptMacT1037Description',
      { defaultMessage: 'Logon Script (Mac) (T1037.002)' }
    ),
    id: 'T1037.002',
    name: 'Logon Script (Mac)',
    reference: 'https://attack.mitre.org/techniques/T1037/002',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1037',
    value: 'logonScriptMac',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.logonScriptWindowsT1037Description',
      { defaultMessage: 'Logon Script (Windows) (T1037.001)' }
    ),
    id: 'T1037.001',
    name: 'Logon Script (Windows)',
    reference: 'https://attack.mitre.org/techniques/T1037/001',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1037',
    value: 'logonScriptWindows',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.msBuildT1127Description',
      { defaultMessage: 'MSBuild (T1127.001)' }
    ),
    id: 'T1127.001',
    name: 'MSBuild',
    reference: 'https://attack.mitre.org/techniques/T1127/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1127',
    value: 'msBuild',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.mailProtocolsT1071Description',
      { defaultMessage: 'Mail Protocols (T1071.003)' }
    ),
    id: 'T1071.003',
    name: 'Mail Protocols',
    reference: 'https://attack.mitre.org/techniques/T1071/003',
    tactics: 'command-and-control',
    techniqueId: 'T1071',
    value: 'mailProtocols',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.makeAndImpersonateTokenT1134Description',
      { defaultMessage: 'Make and Impersonate Token (T1134.003)' }
    ),
    id: 'T1134.003',
    name: 'Make and Impersonate Token',
    reference: 'https://attack.mitre.org/techniques/T1134/003',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1134',
    value: 'makeAndImpersonateToken',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.maliciousFileT1204Description',
      { defaultMessage: 'Malicious File (T1204.002)' }
    ),
    id: 'T1204.002',
    name: 'Malicious File',
    reference: 'https://attack.mitre.org/techniques/T1204/002',
    tactics: 'execution',
    techniqueId: 'T1204',
    value: 'maliciousFile',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.maliciousLinkT1204Description',
      { defaultMessage: 'Malicious Link (T1204.001)' }
    ),
    id: 'T1204.001',
    name: 'Malicious Link',
    reference: 'https://attack.mitre.org/techniques/T1204/001',
    tactics: 'execution',
    techniqueId: 'T1204',
    value: 'maliciousLink',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.malwareT1587Description',
      { defaultMessage: 'Malware (T1587.001)' }
    ),
    id: 'T1587.001',
    name: 'Malware',
    reference: 'https://attack.mitre.org/techniques/T1587/001',
    tactics: 'resource-development',
    techniqueId: 'T1587',
    value: 'malware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.malwareT1588Description',
      { defaultMessage: 'Malware (T1588.001)' }
    ),
    id: 'T1588.001',
    name: 'Malware',
    reference: 'https://attack.mitre.org/techniques/T1588/001',
    tactics: 'resource-development',
    techniqueId: 'T1588',
    value: 'malware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.masqueradeTaskOrServiceT1036Description',
      { defaultMessage: 'Masquerade Task or Service (T1036.004)' }
    ),
    id: 'T1036.004',
    name: 'Masquerade Task or Service',
    reference: 'https://attack.mitre.org/techniques/T1036/004',
    tactics: 'defense-evasion',
    techniqueId: 'T1036',
    value: 'masqueradeTaskOrService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.matchLegitimateNameOrLocationT1036Description',
      { defaultMessage: 'Match Legitimate Name or Location (T1036.005)' }
    ),
    id: 'T1036.005',
    name: 'Match Legitimate Name or Location',
    reference: 'https://attack.mitre.org/techniques/T1036/005',
    tactics: 'defense-evasion',
    techniqueId: 'T1036',
    value: 'matchLegitimateNameOrLocation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.mshtaT1218Description',
      { defaultMessage: 'Mshta (T1218.005)' }
    ),
    id: 'T1218.005',
    name: 'Mshta',
    reference: 'https://attack.mitre.org/techniques/T1218/005',
    tactics: 'defense-evasion',
    techniqueId: 'T1218',
    value: 'mshta',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.msiexecT1218Description',
      { defaultMessage: 'Msiexec (T1218.007)' }
    ),
    id: 'T1218.007',
    name: 'Msiexec',
    reference: 'https://attack.mitre.org/techniques/T1218/007',
    tactics: 'defense-evasion',
    techniqueId: 'T1218',
    value: 'msiexec',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.multiHopProxyT1090Description',
      { defaultMessage: 'Multi-hop Proxy (T1090.003)' }
    ),
    id: 'T1090.003',
    name: 'Multi-hop Proxy',
    reference: 'https://attack.mitre.org/techniques/T1090/003',
    tactics: 'command-and-control',
    techniqueId: 'T1090',
    value: 'multiHopProxy',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.ntdsT1003Description',
      { defaultMessage: 'NTDS (T1003.003)' }
    ),
    id: 'T1003.003',
    name: 'NTDS',
    reference: 'https://attack.mitre.org/techniques/T1003/003',
    tactics: 'credential-access',
    techniqueId: 'T1003',
    value: 'ntds',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.ntfsFileAttributesT1564Description',
      { defaultMessage: 'NTFS File Attributes (T1564.004)' }
    ),
    id: 'T1564.004',
    name: 'NTFS File Attributes',
    reference: 'https://attack.mitre.org/techniques/T1564/004',
    tactics: 'defense-evasion',
    techniqueId: 'T1564',
    value: 'ntfsFileAttributes',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.netshHelperDllT1546Description',
      { defaultMessage: 'Netsh Helper DLL (T1546.007)' }
    ),
    id: 'T1546.007',
    name: 'Netsh Helper DLL',
    reference: 'https://attack.mitre.org/techniques/T1546/007',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'netshHelperDll',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.networkAddressTranslationTraversalT1599Description',
      { defaultMessage: 'Network Address Translation Traversal (T1599.001)' }
    ),
    id: 'T1599.001',
    name: 'Network Address Translation Traversal',
    reference: 'https://attack.mitre.org/techniques/T1599/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1599',
    value: 'networkAddressTranslationTraversal',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.networkDeviceAuthenticationT1556Description',
      { defaultMessage: 'Network Device Authentication (T1556.004)' }
    ),
    id: 'T1556.004',
    name: 'Network Device Authentication',
    reference: 'https://attack.mitre.org/techniques/T1556/004',
    tactics: 'credential-access,defense-evasion',
    techniqueId: 'T1556',
    value: 'networkDeviceAuthentication',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.networkDeviceCliT1059Description',
      { defaultMessage: 'Network Device CLI (T1059.008)' }
    ),
    id: 'T1059.008',
    name: 'Network Device CLI',
    reference: 'https://attack.mitre.org/techniques/T1059/008',
    tactics: 'execution',
    techniqueId: 'T1059',
    value: 'networkDeviceCli',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.networkDeviceConfigurationDumpT1602Description',
      { defaultMessage: 'Network Device Configuration Dump (T1602.002)' }
    ),
    id: 'T1602.002',
    name: 'Network Device Configuration Dump',
    reference: 'https://attack.mitre.org/techniques/T1602/002',
    tactics: 'collection',
    techniqueId: 'T1602',
    value: 'networkDeviceConfigurationDump',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.networkLogonScriptT1037Description',
      { defaultMessage: 'Network Logon Script (T1037.003)' }
    ),
    id: 'T1037.003',
    name: 'Network Logon Script',
    reference: 'https://attack.mitre.org/techniques/T1037/003',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1037',
    value: 'networkLogonScript',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.networkSecurityAppliancesT1590Description',
      { defaultMessage: 'Network Security Appliances (T1590.006)' }
    ),
    id: 'T1590.006',
    name: 'Network Security Appliances',
    reference: 'https://attack.mitre.org/techniques/T1590/006',
    tactics: 'reconnaissance',
    techniqueId: 'T1590',
    value: 'networkSecurityAppliances',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.networkShareConnectionRemovalT1070Description',
      { defaultMessage: 'Network Share Connection Removal (T1070.005)' }
    ),
    id: 'T1070.005',
    name: 'Network Share Connection Removal',
    reference: 'https://attack.mitre.org/techniques/T1070/005',
    tactics: 'defense-evasion',
    techniqueId: 'T1070',
    value: 'networkShareConnectionRemoval',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.networkTopologyT1590Description',
      { defaultMessage: 'Network Topology (T1590.004)' }
    ),
    id: 'T1590.004',
    name: 'Network Topology',
    reference: 'https://attack.mitre.org/techniques/T1590/004',
    tactics: 'reconnaissance',
    techniqueId: 'T1590',
    value: 'networkTopology',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.networkTrustDependenciesT1590Description',
      { defaultMessage: 'Network Trust Dependencies (T1590.003)' }
    ),
    id: 'T1590.003',
    name: 'Network Trust Dependencies',
    reference: 'https://attack.mitre.org/techniques/T1590/003',
    tactics: 'reconnaissance',
    techniqueId: 'T1590',
    value: 'networkTrustDependencies',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.nonStandardEncodingT1132Description',
      { defaultMessage: 'Non-Standard Encoding (T1132.002)' }
    ),
    id: 'T1132.002',
    name: 'Non-Standard Encoding',
    reference: 'https://attack.mitre.org/techniques/T1132/002',
    tactics: 'command-and-control',
    techniqueId: 'T1132',
    value: 'nonStandardEncoding',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.osExhaustionFloodT1499Description',
      { defaultMessage: 'OS Exhaustion Flood (T1499.001)' }
    ),
    id: 'T1499.001',
    name: 'OS Exhaustion Flood',
    reference: 'https://attack.mitre.org/techniques/T1499/001',
    tactics: 'impact',
    techniqueId: 'T1499',
    value: 'osExhaustionFlood',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.odbcconfT1218Description',
      { defaultMessage: 'Odbcconf (T1218.008)' }
    ),
    id: 'T1218.008',
    name: 'Odbcconf',
    reference: 'https://attack.mitre.org/techniques/T1218/008',
    tactics: 'defense-evasion',
    techniqueId: 'T1218',
    value: 'odbcconf',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.officeTemplateMacrosT1137Description',
      { defaultMessage: 'Office Template Macros (T1137.001)' }
    ),
    id: 'T1137.001',
    name: 'Office Template Macros',
    reference: 'https://attack.mitre.org/techniques/T1137/001',
    tactics: 'persistence',
    techniqueId: 'T1137',
    value: 'officeTemplateMacros',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.officeTestT1137Description',
      { defaultMessage: 'Office Test (T1137.002)' }
    ),
    id: 'T1137.002',
    name: 'Office Test',
    reference: 'https://attack.mitre.org/techniques/T1137/002',
    tactics: 'persistence',
    techniqueId: 'T1137',
    value: 'officeTest',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.oneWayCommunicationT1102Description',
      { defaultMessage: 'One-Way Communication (T1102.003)' }
    ),
    id: 'T1102.003',
    name: 'One-Way Communication',
    reference: 'https://attack.mitre.org/techniques/T1102/003',
    tactics: 'command-and-control',
    techniqueId: 'T1102',
    value: 'oneWayCommunication',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.outlookFormsT1137Description',
      { defaultMessage: 'Outlook Forms (T1137.003)' }
    ),
    id: 'T1137.003',
    name: 'Outlook Forms',
    reference: 'https://attack.mitre.org/techniques/T1137/003',
    tactics: 'persistence',
    techniqueId: 'T1137',
    value: 'outlookForms',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.outlookHomePageT1137Description',
      { defaultMessage: 'Outlook Home Page (T1137.004)' }
    ),
    id: 'T1137.004',
    name: 'Outlook Home Page',
    reference: 'https://attack.mitre.org/techniques/T1137/004',
    tactics: 'persistence',
    techniqueId: 'T1137',
    value: 'outlookHomePage',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.outlookRulesT1137Description',
      { defaultMessage: 'Outlook Rules (T1137.005)' }
    ),
    id: 'T1137.005',
    name: 'Outlook Rules',
    reference: 'https://attack.mitre.org/techniques/T1137/005',
    tactics: 'persistence',
    techniqueId: 'T1137',
    value: 'outlookRules',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.parentPidSpoofingT1134Description',
      { defaultMessage: 'Parent PID Spoofing (T1134.004)' }
    ),
    id: 'T1134.004',
    name: 'Parent PID Spoofing',
    reference: 'https://attack.mitre.org/techniques/T1134/004',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1134',
    value: 'parentPidSpoofing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.passTheHashT1550Description',
      { defaultMessage: 'Pass the Hash (T1550.002)' }
    ),
    id: 'T1550.002',
    name: 'Pass the Hash',
    reference: 'https://attack.mitre.org/techniques/T1550/002',
    tactics: 'defense-evasion,lateral-movement',
    techniqueId: 'T1550',
    value: 'passTheHash',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.passTheTicketT1550Description',
      { defaultMessage: 'Pass the Ticket (T1550.003)' }
    ),
    id: 'T1550.003',
    name: 'Pass the Ticket',
    reference: 'https://attack.mitre.org/techniques/T1550/003',
    tactics: 'defense-evasion,lateral-movement',
    techniqueId: 'T1550',
    value: 'passTheTicket',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.passwordCrackingT1110Description',
      { defaultMessage: 'Password Cracking (T1110.002)' }
    ),
    id: 'T1110.002',
    name: 'Password Cracking',
    reference: 'https://attack.mitre.org/techniques/T1110/002',
    tactics: 'credential-access',
    techniqueId: 'T1110',
    value: 'passwordCracking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.passwordFilterDllT1556Description',
      { defaultMessage: 'Password Filter DLL (T1556.002)' }
    ),
    id: 'T1556.002',
    name: 'Password Filter DLL',
    reference: 'https://attack.mitre.org/techniques/T1556/002',
    tactics: 'credential-access,defense-evasion',
    techniqueId: 'T1556',
    value: 'passwordFilterDll',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.passwordGuessingT1110Description',
      { defaultMessage: 'Password Guessing (T1110.001)' }
    ),
    id: 'T1110.001',
    name: 'Password Guessing',
    reference: 'https://attack.mitre.org/techniques/T1110/001',
    tactics: 'credential-access',
    techniqueId: 'T1110',
    value: 'passwordGuessing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.passwordSprayingT1110Description',
      { defaultMessage: 'Password Spraying (T1110.003)' }
    ),
    id: 'T1110.003',
    name: 'Password Spraying',
    reference: 'https://attack.mitre.org/techniques/T1110/003',
    tactics: 'credential-access',
    techniqueId: 'T1110',
    value: 'passwordSpraying',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.patchSystemImageT1601Description',
      { defaultMessage: 'Patch System Image (T1601.001)' }
    ),
    id: 'T1601.001',
    name: 'Patch System Image',
    reference: 'https://attack.mitre.org/techniques/T1601/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1601',
    value: 'patchSystemImage',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.pathInterceptionByPathEnvironmentVariableT1574Description',
      { defaultMessage: 'Path Interception by PATH Environment Variable (T1574.007)' }
    ),
    id: 'T1574.007',
    name: 'Path Interception by PATH Environment Variable',
    reference: 'https://attack.mitre.org/techniques/T1574/007',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    techniqueId: 'T1574',
    value: 'pathInterceptionByPathEnvironmentVariable',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.pathInterceptionBySearchOrderHijackingT1574Description',
      { defaultMessage: 'Path Interception by Search Order Hijacking (T1574.008)' }
    ),
    id: 'T1574.008',
    name: 'Path Interception by Search Order Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1574/008',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    techniqueId: 'T1574',
    value: 'pathInterceptionBySearchOrderHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.pathInterceptionByUnquotedPathT1574Description',
      { defaultMessage: 'Path Interception by Unquoted Path (T1574.009)' }
    ),
    id: 'T1574.009',
    name: 'Path Interception by Unquoted Path',
    reference: 'https://attack.mitre.org/techniques/T1574/009',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    techniqueId: 'T1574',
    value: 'pathInterceptionByUnquotedPath',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.plistModificationT1547Description',
      { defaultMessage: 'Plist Modification (T1547.011)' }
    ),
    id: 'T1547.011',
    name: 'Plist Modification',
    reference: 'https://attack.mitre.org/techniques/T1547/011',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1547',
    value: 'plistModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.pluggableAuthenticationModulesT1556Description',
      { defaultMessage: 'Pluggable Authentication Modules (T1556.003)' }
    ),
    id: 'T1556.003',
    name: 'Pluggable Authentication Modules',
    reference: 'https://attack.mitre.org/techniques/T1556/003',
    tactics: 'credential-access,defense-evasion',
    techniqueId: 'T1556',
    value: 'pluggableAuthenticationModules',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.portKnockingT1205Description',
      { defaultMessage: 'Port Knocking (T1205.001)' }
    ),
    id: 'T1205.001',
    name: 'Port Knocking',
    reference: 'https://attack.mitre.org/techniques/T1205/001',
    tactics: 'defense-evasion,persistence,command-and-control',
    techniqueId: 'T1205',
    value: 'portKnocking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.portMonitorsT1547Description',
      { defaultMessage: 'Port Monitors (T1547.010)' }
    ),
    id: 'T1547.010',
    name: 'Port Monitors',
    reference: 'https://attack.mitre.org/techniques/T1547/010',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1547',
    value: 'portMonitors',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.portableExecutableInjectionT1055Description',
      { defaultMessage: 'Portable Executable Injection (T1055.002)' }
    ),
    id: 'T1055.002',
    name: 'Portable Executable Injection',
    reference: 'https://attack.mitre.org/techniques/T1055/002',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1055',
    value: 'portableExecutableInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.powerShellT1059Description',
      { defaultMessage: 'PowerShell (T1059.001)' }
    ),
    id: 'T1059.001',
    name: 'PowerShell',
    reference: 'https://attack.mitre.org/techniques/T1059/001',
    tactics: 'execution',
    techniqueId: 'T1059',
    value: 'powerShell',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.powerShellProfileT1546Description',
      { defaultMessage: 'PowerShell Profile (T1546.013)' }
    ),
    id: 'T1546.013',
    name: 'PowerShell Profile',
    reference: 'https://attack.mitre.org/techniques/T1546/013',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'powerShellProfile',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.printProcessorsT1547Description',
      { defaultMessage: 'Print Processors (T1547.012)' }
    ),
    id: 'T1547.012',
    name: 'Print Processors',
    reference: 'https://attack.mitre.org/techniques/T1547/012',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1547',
    value: 'printProcessors',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.privateKeysT1552Description',
      { defaultMessage: 'Private Keys (T1552.004)' }
    ),
    id: 'T1552.004',
    name: 'Private Keys',
    reference: 'https://attack.mitre.org/techniques/T1552/004',
    tactics: 'credential-access',
    techniqueId: 'T1552',
    value: 'privateKeys',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.procFilesystemT1003Description',
      { defaultMessage: 'Proc Filesystem (T1003.007)' }
    ),
    id: 'T1003.007',
    name: 'Proc Filesystem',
    reference: 'https://attack.mitre.org/techniques/T1003/007',
    tactics: 'credential-access',
    techniqueId: 'T1003',
    value: 'procFilesystem',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.procMemoryT1055Description',
      { defaultMessage: 'Proc Memory (T1055.009)' }
    ),
    id: 'T1055.009',
    name: 'Proc Memory',
    reference: 'https://attack.mitre.org/techniques/T1055/009',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1055',
    value: 'procMemory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.processDoppelgangingT1055Description',
      { defaultMessage: 'Process Doppelgänging (T1055.013)' }
    ),
    id: 'T1055.013',
    name: 'Process Doppelgänging',
    reference: 'https://attack.mitre.org/techniques/T1055/013',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1055',
    value: 'processDoppelganging',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.processHollowingT1055Description',
      { defaultMessage: 'Process Hollowing (T1055.012)' }
    ),
    id: 'T1055.012',
    name: 'Process Hollowing',
    reference: 'https://attack.mitre.org/techniques/T1055/012',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1055',
    value: 'processHollowing',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.protocolImpersonationT1001Description',
      { defaultMessage: 'Protocol Impersonation (T1001.003)' }
    ),
    id: 'T1001.003',
    name: 'Protocol Impersonation',
    reference: 'https://attack.mitre.org/techniques/T1001/003',
    tactics: 'command-and-control',
    techniqueId: 'T1001',
    value: 'protocolImpersonation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.ptraceSystemCallsT1055Description',
      { defaultMessage: 'Ptrace System Calls (T1055.008)' }
    ),
    id: 'T1055.008',
    name: 'Ptrace System Calls',
    reference: 'https://attack.mitre.org/techniques/T1055/008',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1055',
    value: 'ptraceSystemCalls',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.pubPrnT1216Description',
      { defaultMessage: 'PubPrn (T1216.001)' }
    ),
    id: 'T1216.001',
    name: 'PubPrn',
    reference: 'https://attack.mitre.org/techniques/T1216/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1216',
    value: 'pubPrn',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.purchaseTechnicalDataT1597Description',
      { defaultMessage: 'Purchase Technical Data (T1597.002)' }
    ),
    id: 'T1597.002',
    name: 'Purchase Technical Data',
    reference: 'https://attack.mitre.org/techniques/T1597/002',
    tactics: 'reconnaissance',
    techniqueId: 'T1597',
    value: 'purchaseTechnicalData',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.pythonT1059Description',
      { defaultMessage: 'Python (T1059.006)' }
    ),
    id: 'T1059.006',
    name: 'Python',
    reference: 'https://attack.mitre.org/techniques/T1059/006',
    tactics: 'execution',
    techniqueId: 'T1059',
    value: 'python',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.rdpHijackingT1563Description',
      { defaultMessage: 'RDP Hijacking (T1563.002)' }
    ),
    id: 'T1563.002',
    name: 'RDP Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1563/002',
    tactics: 'lateral-movement',
    techniqueId: 'T1563',
    value: 'rdpHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.rommoNkitT1542Description',
      { defaultMessage: 'ROMMONkit (T1542.004)' }
    ),
    id: 'T1542.004',
    name: 'ROMMONkit',
    reference: 'https://attack.mitre.org/techniques/T1542/004',
    tactics: 'defense-evasion,persistence',
    techniqueId: 'T1542',
    value: 'rommoNkit',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.rcCommonT1037Description',
      { defaultMessage: 'Rc.common (T1037.004)' }
    ),
    id: 'T1037.004',
    name: 'Rc.common',
    reference: 'https://attack.mitre.org/techniques/T1037/004',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1037',
    value: 'rcCommon',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.reOpenedApplicationsT1547Description',
      { defaultMessage: 'Re-opened Applications (T1547.007)' }
    ),
    id: 'T1547.007',
    name: 'Re-opened Applications',
    reference: 'https://attack.mitre.org/techniques/T1547/007',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1547',
    value: 'reOpenedApplications',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.reduceKeySpaceT1600Description',
      { defaultMessage: 'Reduce Key Space (T1600.001)' }
    ),
    id: 'T1600.001',
    name: 'Reduce Key Space',
    reference: 'https://attack.mitre.org/techniques/T1600/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1600',
    value: 'reduceKeySpace',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.reflectionAmplificationT1498Description',
      { defaultMessage: 'Reflection Amplification (T1498.002)' }
    ),
    id: 'T1498.002',
    name: 'Reflection Amplification',
    reference: 'https://attack.mitre.org/techniques/T1498/002',
    tactics: 'impact',
    techniqueId: 'T1498',
    value: 'reflectionAmplification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.registryRunKeysStartupFolderT1547Description',
      { defaultMessage: 'Registry Run Keys / Startup Folder (T1547.001)' }
    ),
    id: 'T1547.001',
    name: 'Registry Run Keys / Startup Folder',
    reference: 'https://attack.mitre.org/techniques/T1547/001',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1547',
    value: 'registryRunKeysStartupFolder',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.regsvcsRegasmT1218Description',
      { defaultMessage: 'Regsvcs/Regasm (T1218.009)' }
    ),
    id: 'T1218.009',
    name: 'Regsvcs/Regasm',
    reference: 'https://attack.mitre.org/techniques/T1218/009',
    tactics: 'defense-evasion',
    techniqueId: 'T1218',
    value: 'regsvcsRegasm',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.regsvr32T1218Description',
      { defaultMessage: 'Regsvr32 (T1218.010)' }
    ),
    id: 'T1218.010',
    name: 'Regsvr32',
    reference: 'https://attack.mitre.org/techniques/T1218/010',
    tactics: 'defense-evasion',
    techniqueId: 'T1218',
    value: 'regsvr32',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.remoteDataStagingT1074Description',
      { defaultMessage: 'Remote Data Staging (T1074.002)' }
    ),
    id: 'T1074.002',
    name: 'Remote Data Staging',
    reference: 'https://attack.mitre.org/techniques/T1074/002',
    tactics: 'collection',
    techniqueId: 'T1074',
    value: 'remoteDataStaging',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.remoteDesktopProtocolT1021Description',
      { defaultMessage: 'Remote Desktop Protocol (T1021.001)' }
    ),
    id: 'T1021.001',
    name: 'Remote Desktop Protocol',
    reference: 'https://attack.mitre.org/techniques/T1021/001',
    tactics: 'lateral-movement',
    techniqueId: 'T1021',
    value: 'remoteDesktopProtocol',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.remoteEmailCollectionT1114Description',
      { defaultMessage: 'Remote Email Collection (T1114.002)' }
    ),
    id: 'T1114.002',
    name: 'Remote Email Collection',
    reference: 'https://attack.mitre.org/techniques/T1114/002',
    tactics: 'collection',
    techniqueId: 'T1114',
    value: 'remoteEmailCollection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.renameSystemUtilitiesT1036Description',
      { defaultMessage: 'Rename System Utilities (T1036.003)' }
    ),
    id: 'T1036.003',
    name: 'Rename System Utilities',
    reference: 'https://attack.mitre.org/techniques/T1036/003',
    tactics: 'defense-evasion',
    techniqueId: 'T1036',
    value: 'renameSystemUtilities',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.revertCloudInstanceT1578Description',
      { defaultMessage: 'Revert Cloud Instance (T1578.004)' }
    ),
    id: 'T1578.004',
    name: 'Revert Cloud Instance',
    reference: 'https://attack.mitre.org/techniques/T1578/004',
    tactics: 'defense-evasion',
    techniqueId: 'T1578',
    value: 'revertCloudInstance',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.rightToLeftOverrideT1036Description',
      { defaultMessage: 'Right-to-Left Override (T1036.002)' }
    ),
    id: 'T1036.002',
    name: 'Right-to-Left Override',
    reference: 'https://attack.mitre.org/techniques/T1036/002',
    tactics: 'defense-evasion',
    techniqueId: 'T1036',
    value: 'rightToLeftOverride',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.runVirtualInstanceT1564Description',
      { defaultMessage: 'Run Virtual Instance (T1564.006)' }
    ),
    id: 'T1564.006',
    name: 'Run Virtual Instance',
    reference: 'https://attack.mitre.org/techniques/T1564/006',
    tactics: 'defense-evasion',
    techniqueId: 'T1564',
    value: 'runVirtualInstance',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.rundll32T1218Description',
      { defaultMessage: 'Rundll32 (T1218.011)' }
    ),
    id: 'T1218.011',
    name: 'Rundll32',
    reference: 'https://attack.mitre.org/techniques/T1218/011',
    tactics: 'defense-evasion',
    techniqueId: 'T1218',
    value: 'rundll32',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.runtimeDataManipulationT1565Description',
      { defaultMessage: 'Runtime Data Manipulation (T1565.003)' }
    ),
    id: 'T1565.003',
    name: 'Runtime Data Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1565/003',
    tactics: 'impact',
    techniqueId: 'T1565',
    value: 'runtimeDataManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.sidHistoryInjectionT1134Description',
      { defaultMessage: 'SID-History Injection (T1134.005)' }
    ),
    id: 'T1134.005',
    name: 'SID-History Injection',
    reference: 'https://attack.mitre.org/techniques/T1134/005',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1134',
    value: 'sidHistoryInjection',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.sipAndTrustProviderHijackingT1553Description',
      { defaultMessage: 'SIP and Trust Provider Hijacking (T1553.003)' }
    ),
    id: 'T1553.003',
    name: 'SIP and Trust Provider Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1553/003',
    tactics: 'defense-evasion',
    techniqueId: 'T1553',
    value: 'sipAndTrustProviderHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.smbWindowsAdminSharesT1021Description',
      { defaultMessage: 'SMB/Windows Admin Shares (T1021.002)' }
    ),
    id: 'T1021.002',
    name: 'SMB/Windows Admin Shares',
    reference: 'https://attack.mitre.org/techniques/T1021/002',
    tactics: 'lateral-movement',
    techniqueId: 'T1021',
    value: 'smbWindowsAdminShares',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.snmpMibDumpT1602Description',
      { defaultMessage: 'SNMP (MIB Dump) (T1602.001)' }
    ),
    id: 'T1602.001',
    name: 'SNMP (MIB Dump)',
    reference: 'https://attack.mitre.org/techniques/T1602/001',
    tactics: 'collection',
    techniqueId: 'T1602',
    value: 'snmpMibDump',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.sqlStoredProceduresT1505Description',
      { defaultMessage: 'SQL Stored Procedures (T1505.001)' }
    ),
    id: 'T1505.001',
    name: 'SQL Stored Procedures',
    reference: 'https://attack.mitre.org/techniques/T1505/001',
    tactics: 'persistence',
    techniqueId: 'T1505',
    value: 'sqlStoredProcedures',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.sshT1021Description',
      { defaultMessage: 'SSH (T1021.004)' }
    ),
    id: 'T1021.004',
    name: 'SSH',
    reference: 'https://attack.mitre.org/techniques/T1021/004',
    tactics: 'lateral-movement',
    techniqueId: 'T1021',
    value: 'ssh',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.sshAuthorizedKeysT1098Description',
      { defaultMessage: 'SSH Authorized Keys (T1098.004)' }
    ),
    id: 'T1098.004',
    name: 'SSH Authorized Keys',
    reference: 'https://attack.mitre.org/techniques/T1098/004',
    tactics: 'persistence',
    techniqueId: 'T1098',
    value: 'sshAuthorizedKeys',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.sshHijackingT1563Description',
      { defaultMessage: 'SSH Hijacking (T1563.001)' }
    ),
    id: 'T1563.001',
    name: 'SSH Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1563/001',
    tactics: 'lateral-movement',
    techniqueId: 'T1563',
    value: 'sshHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.scanDatabasesT1596Description',
      { defaultMessage: 'Scan Databases (T1596.005)' }
    ),
    id: 'T1596.005',
    name: 'Scan Databases',
    reference: 'https://attack.mitre.org/techniques/T1596/005',
    tactics: 'reconnaissance',
    techniqueId: 'T1596',
    value: 'scanDatabases',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.scanningIpBlocksT1595Description',
      { defaultMessage: 'Scanning IP Blocks (T1595.001)' }
    ),
    id: 'T1595.001',
    name: 'Scanning IP Blocks',
    reference: 'https://attack.mitre.org/techniques/T1595/001',
    tactics: 'reconnaissance',
    techniqueId: 'T1595',
    value: 'scanningIpBlocks',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.scheduledTaskT1053Description',
      { defaultMessage: 'Scheduled Task (T1053.005)' }
    ),
    id: 'T1053.005',
    name: 'Scheduled Task',
    reference: 'https://attack.mitre.org/techniques/T1053/005',
    tactics: 'execution,persistence,privilege-escalation',
    techniqueId: 'T1053',
    value: 'scheduledTask',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.screensaverT1546Description',
      { defaultMessage: 'Screensaver (T1546.002)' }
    ),
    id: 'T1546.002',
    name: 'Screensaver',
    reference: 'https://attack.mitre.org/techniques/T1546/002',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'screensaver',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.searchEnginesT1593Description',
      { defaultMessage: 'Search Engines (T1593.002)' }
    ),
    id: 'T1593.002',
    name: 'Search Engines',
    reference: 'https://attack.mitre.org/techniques/T1593/002',
    tactics: 'reconnaissance',
    techniqueId: 'T1593',
    value: 'searchEngines',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.securityAccountManagerT1003Description',
      { defaultMessage: 'Security Account Manager (T1003.002)' }
    ),
    id: 'T1003.002',
    name: 'Security Account Manager',
    reference: 'https://attack.mitre.org/techniques/T1003/002',
    tactics: 'credential-access',
    techniqueId: 'T1003',
    value: 'securityAccountManager',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.securitySoftwareDiscoveryT1518Description',
      { defaultMessage: 'Security Software Discovery (T1518.001)' }
    ),
    id: 'T1518.001',
    name: 'Security Software Discovery',
    reference: 'https://attack.mitre.org/techniques/T1518/001',
    tactics: 'discovery',
    techniqueId: 'T1518',
    value: 'securitySoftwareDiscovery',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.securitySupportProviderT1547Description',
      { defaultMessage: 'Security Support Provider (T1547.005)' }
    ),
    id: 'T1547.005',
    name: 'Security Support Provider',
    reference: 'https://attack.mitre.org/techniques/T1547/005',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1547',
    value: 'securitySupportProvider',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.securitydMemoryT1555Description',
      { defaultMessage: 'Securityd Memory (T1555.002)' }
    ),
    id: 'T1555.002',
    name: 'Securityd Memory',
    reference: 'https://attack.mitre.org/techniques/T1555/002',
    tactics: 'credential-access',
    techniqueId: 'T1555',
    value: 'securitydMemory',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.serverT1583Description',
      { defaultMessage: 'Server (T1583.004)' }
    ),
    id: 'T1583.004',
    name: 'Server',
    reference: 'https://attack.mitre.org/techniques/T1583/004',
    tactics: 'resource-development',
    techniqueId: 'T1583',
    value: 'server',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.serverT1584Description',
      { defaultMessage: 'Server (T1584.004)' }
    ),
    id: 'T1584.004',
    name: 'Server',
    reference: 'https://attack.mitre.org/techniques/T1584/004',
    tactics: 'resource-development',
    techniqueId: 'T1584',
    value: 'server',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.serviceExecutionT1569Description',
      { defaultMessage: 'Service Execution (T1569.002)' }
    ),
    id: 'T1569.002',
    name: 'Service Execution',
    reference: 'https://attack.mitre.org/techniques/T1569/002',
    tactics: 'execution',
    techniqueId: 'T1569',
    value: 'serviceExecution',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.serviceExhaustionFloodT1499Description',
      { defaultMessage: 'Service Exhaustion Flood (T1499.002)' }
    ),
    id: 'T1499.002',
    name: 'Service Exhaustion Flood',
    reference: 'https://attack.mitre.org/techniques/T1499/002',
    tactics: 'impact',
    techniqueId: 'T1499',
    value: 'serviceExhaustionFlood',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.servicesFilePermissionsWeaknessT1574Description',
      { defaultMessage: 'Services File Permissions Weakness (T1574.010)' }
    ),
    id: 'T1574.010',
    name: 'Services File Permissions Weakness',
    reference: 'https://attack.mitre.org/techniques/T1574/010',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    techniqueId: 'T1574',
    value: 'servicesFilePermissionsWeakness',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.servicesRegistryPermissionsWeaknessT1574Description',
      { defaultMessage: 'Services Registry Permissions Weakness (T1574.011)' }
    ),
    id: 'T1574.011',
    name: 'Services Registry Permissions Weakness',
    reference: 'https://attack.mitre.org/techniques/T1574/011',
    tactics: 'persistence,privilege-escalation,defense-evasion',
    techniqueId: 'T1574',
    value: 'servicesRegistryPermissionsWeakness',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.setuidAndSetgidT1548Description',
      { defaultMessage: 'Setuid and Setgid (T1548.001)' }
    ),
    id: 'T1548.001',
    name: 'Setuid and Setgid',
    reference: 'https://attack.mitre.org/techniques/T1548/001',
    tactics: 'privilege-escalation,defense-evasion',
    techniqueId: 'T1548',
    value: 'setuidAndSetgid',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.sharepointT1213Description',
      { defaultMessage: 'Sharepoint (T1213.002)' }
    ),
    id: 'T1213.002',
    name: 'Sharepoint',
    reference: 'https://attack.mitre.org/techniques/T1213/002',
    tactics: 'collection',
    techniqueId: 'T1213',
    value: 'sharepoint',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.shortcutModificationT1547Description',
      { defaultMessage: 'Shortcut Modification (T1547.009)' }
    ),
    id: 'T1547.009',
    name: 'Shortcut Modification',
    reference: 'https://attack.mitre.org/techniques/T1547/009',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1547',
    value: 'shortcutModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.silverTicketT1558Description',
      { defaultMessage: 'Silver Ticket (T1558.002)' }
    ),
    id: 'T1558.002',
    name: 'Silver Ticket',
    reference: 'https://attack.mitre.org/techniques/T1558/002',
    tactics: 'credential-access',
    techniqueId: 'T1558',
    value: 'silverTicket',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.socialMediaT1593Description',
      { defaultMessage: 'Social Media (T1593.001)' }
    ),
    id: 'T1593.001',
    name: 'Social Media',
    reference: 'https://attack.mitre.org/techniques/T1593/001',
    tactics: 'reconnaissance',
    techniqueId: 'T1593',
    value: 'socialMedia',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.socialMediaAccountsT1585Description',
      { defaultMessage: 'Social Media Accounts (T1585.001)' }
    ),
    id: 'T1585.001',
    name: 'Social Media Accounts',
    reference: 'https://attack.mitre.org/techniques/T1585/001',
    tactics: 'resource-development',
    techniqueId: 'T1585',
    value: 'socialMediaAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.socialMediaAccountsT1586Description',
      { defaultMessage: 'Social Media Accounts (T1586.001)' }
    ),
    id: 'T1586.001',
    name: 'Social Media Accounts',
    reference: 'https://attack.mitre.org/techniques/T1586/001',
    tactics: 'resource-development',
    techniqueId: 'T1586',
    value: 'socialMediaAccounts',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.softwareT1592Description',
      { defaultMessage: 'Software (T1592.002)' }
    ),
    id: 'T1592.002',
    name: 'Software',
    reference: 'https://attack.mitre.org/techniques/T1592/002',
    tactics: 'reconnaissance',
    techniqueId: 'T1592',
    value: 'software',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.softwarePackingT1027Description',
      { defaultMessage: 'Software Packing (T1027.002)' }
    ),
    id: 'T1027.002',
    name: 'Software Packing',
    reference: 'https://attack.mitre.org/techniques/T1027/002',
    tactics: 'defense-evasion',
    techniqueId: 'T1027',
    value: 'softwarePacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.spaceAfterFilenameT1036Description',
      { defaultMessage: 'Space after Filename (T1036.006)' }
    ),
    id: 'T1036.006',
    name: 'Space after Filename',
    reference: 'https://attack.mitre.org/techniques/T1036/006',
    tactics: 'defense-evasion',
    techniqueId: 'T1036',
    value: 'spaceAfterFilename',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.spearphishingAttachmentT1566Description',
      { defaultMessage: 'Spearphishing Attachment (T1566.001)' }
    ),
    id: 'T1566.001',
    name: 'Spearphishing Attachment',
    reference: 'https://attack.mitre.org/techniques/T1566/001',
    tactics: 'initial-access',
    techniqueId: 'T1566',
    value: 'spearphishingAttachment',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.spearphishingAttachmentT1598Description',
      { defaultMessage: 'Spearphishing Attachment (T1598.002)' }
    ),
    id: 'T1598.002',
    name: 'Spearphishing Attachment',
    reference: 'https://attack.mitre.org/techniques/T1598/002',
    tactics: 'reconnaissance',
    techniqueId: 'T1598',
    value: 'spearphishingAttachment',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.spearphishingLinkT1566Description',
      { defaultMessage: 'Spearphishing Link (T1566.002)' }
    ),
    id: 'T1566.002',
    name: 'Spearphishing Link',
    reference: 'https://attack.mitre.org/techniques/T1566/002',
    tactics: 'initial-access',
    techniqueId: 'T1566',
    value: 'spearphishingLink',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.spearphishingLinkT1598Description',
      { defaultMessage: 'Spearphishing Link (T1598.003)' }
    ),
    id: 'T1598.003',
    name: 'Spearphishing Link',
    reference: 'https://attack.mitre.org/techniques/T1598/003',
    tactics: 'reconnaissance',
    techniqueId: 'T1598',
    value: 'spearphishingLink',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.spearphishingServiceT1598Description',
      { defaultMessage: 'Spearphishing Service (T1598.001)' }
    ),
    id: 'T1598.001',
    name: 'Spearphishing Service',
    reference: 'https://attack.mitre.org/techniques/T1598/001',
    tactics: 'reconnaissance',
    techniqueId: 'T1598',
    value: 'spearphishingService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.spearphishingViaServiceT1566Description',
      { defaultMessage: 'Spearphishing via Service (T1566.003)' }
    ),
    id: 'T1566.003',
    name: 'Spearphishing via Service',
    reference: 'https://attack.mitre.org/techniques/T1566/003',
    tactics: 'initial-access',
    techniqueId: 'T1566',
    value: 'spearphishingViaService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.standardEncodingT1132Description',
      { defaultMessage: 'Standard Encoding (T1132.001)' }
    ),
    id: 'T1132.001',
    name: 'Standard Encoding',
    reference: 'https://attack.mitre.org/techniques/T1132/001',
    tactics: 'command-and-control',
    techniqueId: 'T1132',
    value: 'standardEncoding',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.startupItemsT1037Description',
      { defaultMessage: 'Startup Items (T1037.005)' }
    ),
    id: 'T1037.005',
    name: 'Startup Items',
    reference: 'https://attack.mitre.org/techniques/T1037/005',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1037',
    value: 'startupItems',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.steganographyT1027Description',
      { defaultMessage: 'Steganography (T1027.003)' }
    ),
    id: 'T1027.003',
    name: 'Steganography',
    reference: 'https://attack.mitre.org/techniques/T1027/003',
    tactics: 'defense-evasion',
    techniqueId: 'T1027',
    value: 'steganography',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.steganographyT1001Description',
      { defaultMessage: 'Steganography (T1001.002)' }
    ),
    id: 'T1001.002',
    name: 'Steganography',
    reference: 'https://attack.mitre.org/techniques/T1001/002',
    tactics: 'command-and-control',
    techniqueId: 'T1001',
    value: 'steganography',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.storedDataManipulationT1565Description',
      { defaultMessage: 'Stored Data Manipulation (T1565.001)' }
    ),
    id: 'T1565.001',
    name: 'Stored Data Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1565/001',
    tactics: 'impact',
    techniqueId: 'T1565',
    value: 'storedDataManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.sudoAndSudoCachingT1548Description',
      { defaultMessage: 'Sudo and Sudo Caching (T1548.003)' }
    ),
    id: 'T1548.003',
    name: 'Sudo and Sudo Caching',
    reference: 'https://attack.mitre.org/techniques/T1548/003',
    tactics: 'privilege-escalation,defense-evasion',
    techniqueId: 'T1548',
    value: 'sudoAndSudoCaching',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.symmetricCryptographyT1573Description',
      { defaultMessage: 'Symmetric Cryptography (T1573.001)' }
    ),
    id: 'T1573.001',
    name: 'Symmetric Cryptography',
    reference: 'https://attack.mitre.org/techniques/T1573/001',
    tactics: 'command-and-control',
    techniqueId: 'T1573',
    value: 'symmetricCryptography',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.systemChecksT1497Description',
      { defaultMessage: 'System Checks (T1497.001)' }
    ),
    id: 'T1497.001',
    name: 'System Checks',
    reference: 'https://attack.mitre.org/techniques/T1497/001',
    tactics: 'defense-evasion,discovery',
    techniqueId: 'T1497',
    value: 'systemChecks',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.systemFirmwareT1542Description',
      { defaultMessage: 'System Firmware (T1542.001)' }
    ),
    id: 'T1542.001',
    name: 'System Firmware',
    reference: 'https://attack.mitre.org/techniques/T1542/001',
    tactics: 'persistence,defense-evasion',
    techniqueId: 'T1542',
    value: 'systemFirmware',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.systemdServiceT1543Description',
      { defaultMessage: 'Systemd Service (T1543.002)' }
    ),
    id: 'T1543.002',
    name: 'Systemd Service',
    reference: 'https://attack.mitre.org/techniques/T1543/002',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1543',
    value: 'systemdService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.systemdTimersT1053Description',
      { defaultMessage: 'Systemd Timers (T1053.006)' }
    ),
    id: 'T1053.006',
    name: 'Systemd Timers',
    reference: 'https://attack.mitre.org/techniques/T1053/006',
    tactics: 'execution,persistence,privilege-escalation',
    techniqueId: 'T1053',
    value: 'systemdTimers',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.tftpBootT1542Description',
      { defaultMessage: 'TFTP Boot (T1542.005)' }
    ),
    id: 'T1542.005',
    name: 'TFTP Boot',
    reference: 'https://attack.mitre.org/techniques/T1542/005',
    tactics: 'defense-evasion,persistence',
    techniqueId: 'T1542',
    value: 'tftpBoot',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.threadExecutionHijackingT1055Description',
      { defaultMessage: 'Thread Execution Hijacking (T1055.003)' }
    ),
    id: 'T1055.003',
    name: 'Thread Execution Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1055/003',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1055',
    value: 'threadExecutionHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.threadLocalStorageT1055Description',
      { defaultMessage: 'Thread Local Storage (T1055.005)' }
    ),
    id: 'T1055.005',
    name: 'Thread Local Storage',
    reference: 'https://attack.mitre.org/techniques/T1055/005',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1055',
    value: 'threadLocalStorage',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.threatIntelVendorsT1597Description',
      { defaultMessage: 'Threat Intel Vendors (T1597.001)' }
    ),
    id: 'T1597.001',
    name: 'Threat Intel Vendors',
    reference: 'https://attack.mitre.org/techniques/T1597/001',
    tactics: 'reconnaissance',
    techniqueId: 'T1597',
    value: 'threatIntelVendors',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.timeBasedEvasionT1497Description',
      { defaultMessage: 'Time Based Evasion (T1497.003)' }
    ),
    id: 'T1497.003',
    name: 'Time Based Evasion',
    reference: 'https://attack.mitre.org/techniques/T1497/003',
    tactics: 'defense-evasion,discovery',
    techniqueId: 'T1497',
    value: 'timeBasedEvasion',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.timeProvidersT1547Description',
      { defaultMessage: 'Time Providers (T1547.003)' }
    ),
    id: 'T1547.003',
    name: 'Time Providers',
    reference: 'https://attack.mitre.org/techniques/T1547/003',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1547',
    value: 'timeProviders',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.timestompT1070Description',
      { defaultMessage: 'Timestomp (T1070.006)' }
    ),
    id: 'T1070.006',
    name: 'Timestomp',
    reference: 'https://attack.mitre.org/techniques/T1070/006',
    tactics: 'defense-evasion',
    techniqueId: 'T1070',
    value: 'timestomp',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.tokenImpersonationTheftT1134Description',
      { defaultMessage: 'Token Impersonation/Theft (T1134.001)' }
    ),
    id: 'T1134.001',
    name: 'Token Impersonation/Theft',
    reference: 'https://attack.mitre.org/techniques/T1134/001',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1134',
    value: 'tokenImpersonationTheft',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.toolT1588Description',
      { defaultMessage: 'Tool (T1588.002)' }
    ),
    id: 'T1588.002',
    name: 'Tool',
    reference: 'https://attack.mitre.org/techniques/T1588/002',
    tactics: 'resource-development',
    techniqueId: 'T1588',
    value: 'tool',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.trafficDuplicationT1020Description',
      { defaultMessage: 'Traffic Duplication (T1020.001)' }
    ),
    id: 'T1020.001',
    name: 'Traffic Duplication',
    reference: 'https://attack.mitre.org/techniques/T1020/001',
    tactics: 'exfiltration',
    techniqueId: 'T1020',
    value: 'trafficDuplication',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.transmittedDataManipulationT1565Description',
      { defaultMessage: 'Transmitted Data Manipulation (T1565.002)' }
    ),
    id: 'T1565.002',
    name: 'Transmitted Data Manipulation',
    reference: 'https://attack.mitre.org/techniques/T1565/002',
    tactics: 'impact',
    techniqueId: 'T1565',
    value: 'transmittedDataManipulation',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.transportAgentT1505Description',
      { defaultMessage: 'Transport Agent (T1505.002)' }
    ),
    id: 'T1505.002',
    name: 'Transport Agent',
    reference: 'https://attack.mitre.org/techniques/T1505/002',
    tactics: 'persistence',
    techniqueId: 'T1505',
    value: 'transportAgent',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.trapT1546Description',
      { defaultMessage: 'Trap (T1546.005)' }
    ),
    id: 'T1546.005',
    name: 'Trap',
    reference: 'https://attack.mitre.org/techniques/T1546/005',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'trap',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.unixShellT1059Description',
      { defaultMessage: 'Unix Shell (T1059.004)' }
    ),
    id: 'T1059.004',
    name: 'Unix Shell',
    reference: 'https://attack.mitre.org/techniques/T1059/004',
    tactics: 'execution',
    techniqueId: 'T1059',
    value: 'unixShell',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.userActivityBasedChecksT1497Description',
      { defaultMessage: 'User Activity Based Checks (T1497.002)' }
    ),
    id: 'T1497.002',
    name: 'User Activity Based Checks',
    reference: 'https://attack.mitre.org/techniques/T1497/002',
    tactics: 'defense-evasion,discovery',
    techniqueId: 'T1497',
    value: 'userActivityBasedChecks',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.vbaStompingT1564Description',
      { defaultMessage: 'VBA Stomping (T1564.007)' }
    ),
    id: 'T1564.007',
    name: 'VBA Stomping',
    reference: 'https://attack.mitre.org/techniques/T1564/007',
    tactics: 'defense-evasion',
    techniqueId: 'T1564',
    value: 'vbaStomping',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.vdsoHijackingT1055Description',
      { defaultMessage: 'VDSO Hijacking (T1055.014)' }
    ),
    id: 'T1055.014',
    name: 'VDSO Hijacking',
    reference: 'https://attack.mitre.org/techniques/T1055/014',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1055',
    value: 'vdsoHijacking',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.vncT1021Description',
      { defaultMessage: 'VNC (T1021.005)' }
    ),
    id: 'T1021.005',
    name: 'VNC',
    reference: 'https://attack.mitre.org/techniques/T1021/005',
    tactics: 'lateral-movement',
    techniqueId: 'T1021',
    value: 'vnc',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.verclsidT1218Description',
      { defaultMessage: 'Verclsid (T1218.012)' }
    ),
    id: 'T1218.012',
    name: 'Verclsid',
    reference: 'https://attack.mitre.org/techniques/T1218/012',
    tactics: 'defense-evasion',
    techniqueId: 'T1218',
    value: 'verclsid',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.virtualPrivateServerT1583Description',
      { defaultMessage: 'Virtual Private Server (T1583.003)' }
    ),
    id: 'T1583.003',
    name: 'Virtual Private Server',
    reference: 'https://attack.mitre.org/techniques/T1583/003',
    tactics: 'resource-development',
    techniqueId: 'T1583',
    value: 'virtualPrivateServer',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.virtualPrivateServerT1584Description',
      { defaultMessage: 'Virtual Private Server (T1584.003)' }
    ),
    id: 'T1584.003',
    name: 'Virtual Private Server',
    reference: 'https://attack.mitre.org/techniques/T1584/003',
    tactics: 'resource-development',
    techniqueId: 'T1584',
    value: 'virtualPrivateServer',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.visualBasicT1059Description',
      { defaultMessage: 'Visual Basic (T1059.005)' }
    ),
    id: 'T1059.005',
    name: 'Visual Basic',
    reference: 'https://attack.mitre.org/techniques/T1059/005',
    tactics: 'execution',
    techniqueId: 'T1059',
    value: 'visualBasic',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.vulnerabilitiesT1588Description',
      { defaultMessage: 'Vulnerabilities (T1588.006)' }
    ),
    id: 'T1588.006',
    name: 'Vulnerabilities',
    reference: 'https://attack.mitre.org/techniques/T1588/006',
    tactics: 'resource-development',
    techniqueId: 'T1588',
    value: 'vulnerabilities',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.vulnerabilityScanningT1595Description',
      { defaultMessage: 'Vulnerability Scanning (T1595.002)' }
    ),
    id: 'T1595.002',
    name: 'Vulnerability Scanning',
    reference: 'https://attack.mitre.org/techniques/T1595/002',
    tactics: 'reconnaissance',
    techniqueId: 'T1595',
    value: 'vulnerabilityScanning',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.whoisT1596Description',
      { defaultMessage: 'WHOIS (T1596.002)' }
    ),
    id: 'T1596.002',
    name: 'WHOIS',
    reference: 'https://attack.mitre.org/techniques/T1596/002',
    tactics: 'reconnaissance',
    techniqueId: 'T1596',
    value: 'whois',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.webPortalCaptureT1056Description',
      { defaultMessage: 'Web Portal Capture (T1056.003)' }
    ),
    id: 'T1056.003',
    name: 'Web Portal Capture',
    reference: 'https://attack.mitre.org/techniques/T1056/003',
    tactics: 'collection,credential-access',
    techniqueId: 'T1056',
    value: 'webPortalCapture',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.webProtocolsT1071Description',
      { defaultMessage: 'Web Protocols (T1071.001)' }
    ),
    id: 'T1071.001',
    name: 'Web Protocols',
    reference: 'https://attack.mitre.org/techniques/T1071/001',
    tactics: 'command-and-control',
    techniqueId: 'T1071',
    value: 'webProtocols',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.webServicesT1583Description',
      { defaultMessage: 'Web Services (T1583.006)' }
    ),
    id: 'T1583.006',
    name: 'Web Services',
    reference: 'https://attack.mitre.org/techniques/T1583/006',
    tactics: 'resource-development',
    techniqueId: 'T1583',
    value: 'webServices',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.webServicesT1584Description',
      { defaultMessage: 'Web Services (T1584.006)' }
    ),
    id: 'T1584.006',
    name: 'Web Services',
    reference: 'https://attack.mitre.org/techniques/T1584/006',
    tactics: 'resource-development',
    techniqueId: 'T1584',
    value: 'webServices',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.webSessionCookieT1550Description',
      { defaultMessage: 'Web Session Cookie (T1550.004)' }
    ),
    id: 'T1550.004',
    name: 'Web Session Cookie',
    reference: 'https://attack.mitre.org/techniques/T1550/004',
    tactics: 'defense-evasion,lateral-movement',
    techniqueId: 'T1550',
    value: 'webSessionCookie',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.webShellT1505Description',
      { defaultMessage: 'Web Shell (T1505.003)' }
    ),
    id: 'T1505.003',
    name: 'Web Shell',
    reference: 'https://attack.mitre.org/techniques/T1505/003',
    tactics: 'persistence',
    techniqueId: 'T1505',
    value: 'webShell',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.windowsCommandShellT1059Description',
      { defaultMessage: 'Windows Command Shell (T1059.003)' }
    ),
    id: 'T1059.003',
    name: 'Windows Command Shell',
    reference: 'https://attack.mitre.org/techniques/T1059/003',
    tactics: 'execution',
    techniqueId: 'T1059',
    value: 'windowsCommandShell',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.windowsFileAndDirectoryPermissionsModificationT1222Description',
      { defaultMessage: 'Windows File and Directory Permissions Modification (T1222.001)' }
    ),
    id: 'T1222.001',
    name: 'Windows File and Directory Permissions Modification',
    reference: 'https://attack.mitre.org/techniques/T1222/001',
    tactics: 'defense-evasion',
    techniqueId: 'T1222',
    value: 'windowsFileAndDirectoryPermissionsModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.windowsManagementInstrumentationEventSubscriptionT1546Description',
      { defaultMessage: 'Windows Management Instrumentation Event Subscription (T1546.003)' }
    ),
    id: 'T1546.003',
    name: 'Windows Management Instrumentation Event Subscription',
    reference: 'https://attack.mitre.org/techniques/T1546/003',
    tactics: 'privilege-escalation,persistence',
    techniqueId: 'T1546',
    value: 'windowsManagementInstrumentationEventSubscription',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.windowsRemoteManagementT1021Description',
      { defaultMessage: 'Windows Remote Management (T1021.006)' }
    ),
    id: 'T1021.006',
    name: 'Windows Remote Management',
    reference: 'https://attack.mitre.org/techniques/T1021/006',
    tactics: 'lateral-movement',
    techniqueId: 'T1021',
    value: 'windowsRemoteManagement',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.windowsServiceT1543Description',
      { defaultMessage: 'Windows Service (T1543.003)' }
    ),
    id: 'T1543.003',
    name: 'Windows Service',
    reference: 'https://attack.mitre.org/techniques/T1543/003',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1543',
    value: 'windowsService',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.winlogonHelperDllT1547Description',
      { defaultMessage: 'Winlogon Helper DLL (T1547.004)' }
    ),
    id: 'T1547.004',
    name: 'Winlogon Helper DLL',
    reference: 'https://attack.mitre.org/techniques/T1547/004',
    tactics: 'persistence,privilege-escalation',
    techniqueId: 'T1547',
    value: 'winlogonHelperDll',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.additionalCloudCredentialsT1098Description',
      { defaultMessage: 'Additional Cloud Credentials (T1098.001)' }
    ),
    id: 'T1098.001',
    name: 'Additional Cloud Credentials',
    reference: 'https://attack.mitre.org/techniques/T1098/001',
    tactics: 'persistence',
    techniqueId: 'T1098',
    value: 'additionalCloudCredentials',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.groupPolicyModificationT1484Description',
      { defaultMessage: 'Group Policy Modification (T1484.001)' }
    ),
    id: 'T1484.001',
    name: 'Group Policy Modification',
    reference: 'https://attack.mitre.org/techniques/T1484/001',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1484',
    value: 'groupPolicyModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.domainTrustModificationT1484Description',
      { defaultMessage: 'Domain Trust Modification (T1484.002)' }
    ),
    id: 'T1484.002',
    name: 'Domain Trust Modification',
    reference: 'https://attack.mitre.org/techniques/T1484/002',
    tactics: 'defense-evasion,privilege-escalation',
    techniqueId: 'T1484',
    value: 'domainTrustModification',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.webCookiesT1606Description',
      { defaultMessage: 'Web Cookies (T1606.001)' }
    ),
    id: 'T1606.001',
    name: 'Web Cookies',
    reference: 'https://attack.mitre.org/techniques/T1606/001',
    tactics: 'credential-access',
    techniqueId: 'T1606',
    value: 'webCookies',
  },
  {
    label: i18n.translate(
      'xpack.securitySolution.detectionEngine.mitreAttackSubtechniques.samlTokensT1606Description',
      { defaultMessage: 'SAML Tokens (T1606.002)' }
    ),
    id: 'T1606.002',
    name: 'SAML Tokens',
    reference: 'https://attack.mitre.org/techniques/T1606/002',
    tactics: 'credential-access',
    techniqueId: 'T1606',
    value: 'samlTokens',
  },
];

/**
 * A full object of Mitre Attack Threat data that is taken directly from the `mitre_tactics_techniques.ts` file
 *
 * Is built alongside and sampled from the data in the file so to always be valid with the most up to date MITRE ATT&CK data
 */
export const getMockThreatData = () => ({
  tactic: {
    name: 'Privilege Escalation',
    id: 'TA0004',
    reference: 'https://attack.mitre.org/tactics/TA0004',
  },
  technique: {
    name: 'Event Triggered Execution',
    id: 'T1546',
    reference: 'https://attack.mitre.org/techniques/T1546',
    tactics: ['privilege-escalation', 'persistence'],
  },
  subtechnique: {
    name: '.bash_profile and .bashrc',
    id: 'T1546.004',
    reference: 'https://attack.mitre.org/techniques/T1546/004',
    tactics: ['privilege-escalation', 'persistence'],
    techniqueId: 'T1546',
  },
});
