/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { rawRules } from '../../server/lib/detection_engine/rules/prepackaged_rules/index';
import { mockThreatData } from '../../public/detections/mitre/mitre_tactics_techniques';
import { CompleteTimeline, timeline } from './timeline';

export const totalNumberOfPrebuiltRules = rawRules.length;

export const totalNumberOfPrebuiltRulesInEsArchive = 127;

export const totalNumberOfPrebuiltRulesInEsArchiveCustomRule = 145;

interface MitreAttackTechnique {
  name: string;
  subtechniques: string[];
}

export interface Mitre {
  tactic: string;
  techniques: MitreAttackTechnique[];
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
  customQuery?: string;
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
  runsEvery: Interval;
  lookBack: Interval;
  timeline: CompleteTimeline;
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

export interface ThreatIndicatorRule extends CustomRule {
  indicatorIndexPattern: string[];
  indicatorMapping: string;
  indicatorIndexField: string;
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

export const indexPatterns = [
  'apm-*-transaction*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'winlogbeat-*',
];

const { tactic, technique, subtechnique } = mockThreatData;

const mitre1: Mitre = {
  tactic: `${tactic.name} (${tactic.id})`,
  techniques: [
    {
      name: `${technique.name} (${technique.id})`,
      subtechniques: [`${subtechnique.name} (${subtechnique.id})`],
    },
    {
      name: `${technique.name} (${technique.id})`,
      subtechniques: [],
    },
  ],
};

const mitre2: Mitre = {
  tactic: `${tactic.name} (${tactic.id})`,
  techniques: [
    {
      name: `${technique.name} (${technique.id})`,
      subtechniques: [`${subtechnique.name} (${subtechnique.id})`],
    },
  ],
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
  customQuery: 'host.name: *',
  index: indexPatterns,
  name: 'New Rule Test',
  description: 'The new rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['https://www.google.com/', 'https://elastic.co/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [mitre1, mitre2],
  note: '# test markdown',
  runsEvery,
  lookBack,
  timeline,
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
  runsEvery,
  lookBack,
  timeline,
};

export const newOverrideRule: OverrideRule = {
  customQuery: 'host.name: *',
  index: indexPatterns,
  name: 'New Rule Test',
  description: 'The new rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['https://www.google.com/', 'https://elastic.co/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [mitre1, mitre2],
  note: '# test markdown',
  severityOverride: [severityOverride1, severityOverride2, severityOverride3, severityOverride4],
  riskOverride: 'destination.port',
  nameOverride: 'agent.type',
  timestampOverride: '@timestamp',
  runsEvery,
  lookBack,
  timeline,
};

export const newThresholdRule: ThresholdRule = {
  customQuery: 'host.name: *',
  index: indexPatterns,
  name: 'New Rule Test',
  description: 'The new rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['https://www.google.com/', 'https://elastic.co/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [mitre1, mitre2],
  note: '# test markdown',
  thresholdField: 'host.name',
  threshold: '10',
  runsEvery,
  lookBack,
  timeline,
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
  index: indexPatterns,
  description: 'New EQL rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['https://www.google.com/', 'https://elastic.co/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [mitre1, mitre2],
  note: '# test markdown',
  runsEvery,
  lookBack,
  timeline,
};

export const eqlSequenceRule: CustomRule = {
  customQuery:
    'sequence with maxspan=30s\
     [any where process.name == "which"]\
     [any where process.name == "xargs"]',
  name: 'New EQL Sequence Rule',
  index: indexPatterns,
  description: 'New EQL rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['https://www.google.com/', 'https://elastic.co/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [mitre1, mitre2],
  note: '# test markdown',
  runsEvery,
  lookBack,
  timeline,
};

export const newThreatIndicatorRule: ThreatIndicatorRule = {
  name: 'Threat Indicator Rule Test',
  description: 'The threat indicator rule description.',
  index: ['threat-data-*'],
  severity: 'Critical',
  riskScore: '20',
  tags: ['test', 'threat'],
  referenceUrls: ['https://www.google.com/', 'https://elastic.co/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [mitre1, mitre2],
  note: '# test markdown',
  runsEvery,
  lookBack,
  indicatorIndexPattern: ['threat-indicator-*'],
  indicatorMapping: 'agent.id',
  indicatorIndexField: 'agent.threat',
  timeline,
};

export const severitiesOverride = ['Low', 'Medium', 'High', 'Critical'];

export const editedRule = {
  ...existingRule,
  severity: 'Medium',
  description: 'Edited Rule description',
  tags: [...existingRule.tags, 'edited'],
};

export const expectedExportedRule = (ruleResponse: Cypress.Response) => {
  const jsonrule = ruleResponse.body;

  return `{"author":[],"actions":[],"created_at":"${jsonrule.created_at}","updated_at":"${jsonrule.updated_at}","created_by":"elastic","description":"${jsonrule.description}","enabled":false,"false_positives":[],"from":"now-17520h","id":"${jsonrule.id}","immutable":false,"index":["exceptions-*"],"interval":"10s","rule_id":"rule_testing","language":"kuery","output_index":".siem-signals-default","max_signals":100,"risk_score":${jsonrule.risk_score},"risk_score_mapping":[],"name":"${jsonrule.name}","query":"${jsonrule.query}","references":[],"severity":"${jsonrule.severity}","severity_mapping":[],"updated_by":"elastic","tags":[],"to":"now","type":"query","threat":[],"throttle":"no_actions","version":1,"exceptions_list":[]}\n{"exported_count":1,"missing_rules":[],"missing_rules_count":0}\n`;
};
