/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RiskScore,
  RuleInterval,
  RuleIntervalFrom,
  Severity,
  Threat,
  ThreatSubtechnique,
  ThreatTechnique,
} from '@kbn/securitysolution-io-ts-alerting-types';

import type {
  IndexPatternArray,
  InvestigationGuide,
  RuleDescription,
  RuleFalsePositiveArray,
  RuleQuery,
  RuleName,
  RuleReferenceArray,
  RuleTagArray,
} from '../../common/detection_engine/rule_schema';

interface RuleFields {
  defaultIndexPatterns: IndexPatternArray;
  falsePositives: RuleFalsePositiveArray;
  investigationGuide: InvestigationGuide;
  referenceUrls: RuleReferenceArray;
  riskScore: RiskScore;
  ruleDescription: RuleDescription;
  ruleInterval: RuleInterval;
  ruleIntervalFrom: RuleIntervalFrom;
  ruleQuery: RuleQuery;
  ruleName: RuleName;
  ruleTags: RuleTagArray;
  ruleSeverity: Severity;
  threat: Threat;
  threatSubtechnique: ThreatSubtechnique;
  threatTechnique: ThreatTechnique;
}

export const ruleFields: RuleFields = {
  defaultIndexPatterns: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'logs-*',
    'packetbeat-*',
    'traces-apm*',
    'winlogbeat-*',
    '-*elastic-cloud-logs-*',
  ],
  falsePositives: ['False1', 'False2'],
  investigationGuide: '# test markdown',
  referenceUrls: ['http://example.com/', 'https://example.com/'],
  riskScore: 17,
  ruleDescription: 'The rule description',
  ruleInterval: '5m',
  ruleIntervalFrom: '50000h',
  ruleQuery: 'host.name: *',
  ruleName: 'Test Rule',
  ruleTags: ['test', 'newRule'],
  ruleSeverity: 'high',
  threat: {
    framework: 'MITRE ATT&CK',
    tactic: {
      name: 'Credential Access',
      id: 'TA0006',
      reference: 'https://attack.mitre.org/tactics/TA0006',
    },
  },
  threatSubtechnique: {
    name: '/etc/passwd and /etc/shadow',
    id: 'T1003.008',
    reference: 'https://attack.mitre.org/techniques/T1003/008',
  },
  threatTechnique: {
    id: 'T1003',
    name: 'OS Credential Dumping',
    reference: 'https://attack.mitre.org/techniques/T1003',
  },
};
