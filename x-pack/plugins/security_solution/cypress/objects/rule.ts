/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { rawRules } from '../../server/lib/detection_engine/rules/prepackaged_rules/index';

export const totalNumberOfPrebuiltRules = rawRules.length;

export const totalNumberOfPrebuiltRulesInEsArchive = 127;

export const totalNumberOfPrebuiltRulesInEsArchiveCustomRule = 145;

interface Mitre {
  tactic: string;
  techniques: string[];
}

interface SeverityOverride {
  sourceField: string;
  sourceValue: string;
}

interface Interval {
  interval: string;
  timeType: string;
  type: string;
}

export interface CustomRule {
  customQuery: string;
  name: string;
  description: string;
  index?: string[];
  interval?: string;
  severity: string;
  riskScore: string;
  tags: string[];
  timelineTemplate?: string;
  referenceUrls: string[];
  falsePositivesExamples: string[];
  mitre: Mitre[];
  note: string;
  timelineId: string;
  runsEvery: Interval;
  lookBack: Interval;
}

export interface ThresholdRule extends CustomRule {
  thresholdField: string;
  threshold: string;
}

export interface OverrideRule extends CustomRule {
  severityOverride: SeverityOverride[];
  riskOverride: string;
  nameOverride: string;
  timestampOverride: string;
}

export interface MachineLearningRule {
  machineLearningJob: string;
  anomalyScoreThreshold: string;
  name: string;
  description: string;
  severity: string;
  riskScore: string;
  tags: string[];
  timelineTemplate?: string;
  referenceUrls: string[];
  falsePositivesExamples: string[];
  mitre: Mitre[];
  note: string;
  runsEvery: Interval;
  lookBack: Interval;
}

const mitre1: Mitre = {
  tactic: 'Discovery (TA0007)',
  techniques: ['Cloud Service Discovery (T1526)', 'File and Directory Discovery (T1083)'],
};

const mitre2: Mitre = {
  tactic: 'Execution (TA0002)',
  techniques: ['CMSTP (T1191)'],
};

const severityOverride1: SeverityOverride = {
  sourceField: 'host.name',
  sourceValue: 'host',
};

const severityOverride2: SeverityOverride = {
  sourceField: '@timestamp',
  sourceValue: '10/02/2020',
};

const severityOverride3: SeverityOverride = {
  sourceField: 'host.geo.name',
  sourceValue: 'atack',
};

const severityOverride4: SeverityOverride = {
  sourceField: 'agent.type',
  sourceValue: 'auditbeat',
};

const runsEvery: Interval = {
  interval: '1',
  timeType: 'Seconds',
  type: 's',
};

const lookBack: Interval = {
  interval: '17520',
  timeType: 'Hours',
  type: 'h',
};

export const newRule: CustomRule = {
  customQuery: 'host.name:*',
  name: 'New Rule Test',
  description: 'The new rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['https://www.google.com/', 'https://elastic.co/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [mitre1, mitre2],
  note: '# test markdown',
  timelineId: '0162c130-78be-11ea-9718-118a926974a4',
  runsEvery,
  lookBack,
};

export const existingRule: CustomRule = {
  customQuery: 'host.name:*',
  name: 'Rule 1',
  description: 'Description for Rule 1',
  index: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
  interval: '4m',
  severity: 'High',
  riskScore: '19',
  tags: ['rule1'],
  referenceUrls: [],
  falsePositivesExamples: [],
  mitre: [],
  note: 'This is my note',
  timelineId: '',
  runsEvery,
  lookBack,
};

export const newOverrideRule: OverrideRule = {
  customQuery: 'host.name:*',
  name: 'New Rule Test',
  description: 'The new rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['https://www.google.com/', 'https://elastic.co/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [mitre1, mitre2],
  note: '# test markdown',
  timelineId: '0162c130-78be-11ea-9718-118a926974a4',
  severityOverride: [severityOverride1, severityOverride2, severityOverride3, severityOverride4],
  riskOverride: 'destination.port',
  nameOverride: 'agent.type',
  timestampOverride: '@timestamp',
  runsEvery,
  lookBack,
};

export const newThresholdRule: ThresholdRule = {
  customQuery: 'host.name:*',
  name: 'New Rule Test',
  description: 'The new rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['https://www.google.com/', 'https://elastic.co/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [mitre1, mitre2],
  note: '# test markdown',
  timelineId: '0162c130-78be-11ea-9718-118a926974a4',
  thresholdField: 'host.name',
  threshold: '10',
  runsEvery,
  lookBack,
};

export const machineLearningRule: MachineLearningRule = {
  machineLearningJob: 'linux_anomalous_network_service',
  anomalyScoreThreshold: '20',
  name: 'New ML Rule Test',
  description: 'The new ML rule description.',
  severity: 'Critical',
  riskScore: '70',
  tags: ['ML'],
  referenceUrls: ['https://elastic.co/'],
  falsePositivesExamples: ['False1'],
  mitre: [mitre1],
  note: '# test markdown',
  runsEvery,
  lookBack,
};

export const eqlRule: CustomRule = {
  customQuery: 'any where process.name == "which"',
  name: 'New EQL Rule',
  description: 'New EQL rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['https://www.google.com/', 'https://elastic.co/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [mitre1, mitre2],
  note: '# test markdown',
  timelineId: '0162c130-78be-11ea-9718-118a926974a4',
  runsEvery,
  lookBack,
};

export const eqlSequenceRule: CustomRule = {
  customQuery:
    'sequence with maxspan=30s\
     [any where process.name == "which"]\
     [any where process.name == "xargs"]',
  name: 'New EQL Sequence Rule',
  description: 'New EQL rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['https://www.google.com/', 'https://elastic.co/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [mitre1, mitre2],
  note: '# test markdown',
  timelineId: '0162c130-78be-11ea-9718-118a926974a4',
  runsEvery,
  lookBack,
};

export const indexPatterns = [
  'apm-*-transaction*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'winlogbeat-*',
];

export const severitiesOverride = ['Low', 'Medium', 'High', 'Critical'];

export const editedRule = {
  ...existingRule,
  severity: 'Medium',
  description: 'Edited Rule description',
  tags: [...existingRule.tags, 'edited'],
};
