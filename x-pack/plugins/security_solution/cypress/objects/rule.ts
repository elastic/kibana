/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSchema } from '../../common/detection_engine/schemas/response';
/* eslint-disable @kbn/eslint/no-restricted-paths */
import { rawRules } from '../../server/lib/detection_engine/rules/prepackaged_rules/index';
import { getMockThreatData } from '../../public/detections/mitre/mitre_tactics_techniques';
import { getTimeline, CompleteTimeline, getIndicatorMatchTimelineTemplate } from './timeline';

export const totalNumberOfPrebuiltRules = rawRules.length;

export const totalNumberOfPrebuiltRulesInEsArchive = 127;

export const totalNumberOfPrebuiltRulesInEsArchiveCustomRule = 145;

const ccsRemoteName: string = Cypress.env('CCS_REMOTE_NAME');

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
  index: string[];
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
  maxSignals: number;
  buildingBlockType?: string;
  exceptionLists?: Array<{ id: string; list_id: string; type: string; namespace_type: string }>;
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
  indicatorMappingField: string;
  indicatorIndexField: string;
  threatIndicatorPath: string;
  type?: string;
  atomic?: string;
  matchedType?: string;
  matchedId?: string;
  matchedIndex?: string;
}

export interface MachineLearningRule {
  machineLearningJobs: string[];
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

export const getIndexPatterns = (): string[] => [
  'apm-*-transaction*',
  'traces-apm*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'winlogbeat-*',
];

export const getThreatIndexPatterns = (): string[] => ['logs-ti_*'];

const getMitre1 = (): Mitre => ({
  tactic: `${getMockThreatData().tactic.name} (${getMockThreatData().tactic.id})`,
  techniques: [
    {
      name: `${getMockThreatData().technique.name} (${getMockThreatData().technique.id})`,
      subtechniques: [
        `${getMockThreatData().subtechnique.name} (${getMockThreatData().subtechnique.id})`,
      ],
    },
    {
      name: `${getMockThreatData().technique.name} (${getMockThreatData().technique.id})`,
      subtechniques: [],
    },
  ],
});

const getMitre2 = (): Mitre => ({
  tactic: `${getMockThreatData().tactic.name} (${getMockThreatData().tactic.id})`,
  techniques: [
    {
      name: `${getMockThreatData().technique.name} (${getMockThreatData().technique.id})`,
      subtechniques: [
        `${getMockThreatData().subtechnique.name} (${getMockThreatData().subtechnique.id})`,
      ],
    },
  ],
});

const getSeverityOverride1 = (): SeverityOverride => ({
  sourceField: 'host.name',
  sourceValue: 'host',
});

const getSeverityOverride2 = (): SeverityOverride => ({
  sourceField: '@timestamp',
  sourceValue: '10/02/2020',
});

const getSeverityOverride3 = (): SeverityOverride => ({
  sourceField: 'host.geo.name',
  sourceValue: 'atack',
});

const getSeverityOverride4 = (): SeverityOverride => ({
  sourceField: 'agent.type',
  sourceValue: 'auditbeat',
});

// Default interval is 1m, our tests config overwrite this to 1s
// See https://github.com/elastic/kibana/pull/125396 for details
const getRunsEvery = (): Interval => ({
  interval: '1',
  timeType: 'Seconds',
  type: 's',
});

const getLookBack = (): Interval => ({
  interval: '50000',
  timeType: 'Hours',
  type: 'h',
});

export const getNewRule = (): CustomRule => ({
  customQuery: 'host.name: *',
  index: getIndexPatterns(),
  name: 'New Rule Test',
  description: 'The new rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['http://example.com/', 'https://example.com/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [getMitre1(), getMitre2()],
  note: '# test markdown',
  runsEvery: getRunsEvery(),
  lookBack: getLookBack(),
  timeline: getTimeline(),
  maxSignals: 100,
});

export const getBuildingBlockRule = (): CustomRule => ({
  customQuery: 'host.name: *',
  index: getIndexPatterns(),
  name: 'Building Block Rule Test',
  description: 'The new rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['http://example.com/', 'https://example.com/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [getMitre1(), getMitre2()],
  note: '# test markdown',
  runsEvery: getRunsEvery(),
  lookBack: getLookBack(),
  timeline: getTimeline(),
  maxSignals: 100,
  buildingBlockType: 'default',
});

export const getUnmappedRule = (): CustomRule => ({
  customQuery: '*:*',
  index: ['unmapped*'],
  name: 'Rule with unmapped fields',
  description: 'The new rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['http://example.com/', 'https://example.com/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [getMitre1(), getMitre2()],
  note: '# test markdown',
  runsEvery: getRunsEvery(),
  lookBack: getLookBack(),
  timeline: getTimeline(),
  maxSignals: 100,
});

export const getUnmappedCCSRule = (): CustomRule => ({
  customQuery: '*:*',
  index: [`${ccsRemoteName}:unmapped*`],
  name: 'Rule with unmapped fields',
  description: 'The new rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['http://example.com/', 'https://example.com/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [getMitre1(), getMitre2()],
  note: '# test markdown',
  runsEvery: getRunsEvery(),
  lookBack: getLookBack(),
  timeline: getTimeline(),
  maxSignals: 100,
});

export const getExistingRule = (): CustomRule => ({
  customQuery: 'host.name: *',
  name: 'Rule 1',
  description: 'Description for Rule 1',
  index: ['auditbeat-*'],
  interval: '100m',
  severity: 'High',
  riskScore: '19',
  tags: ['rule1'],
  referenceUrls: [],
  falsePositivesExamples: [],
  mitre: [],
  note: 'This is my note',
  runsEvery: getRunsEvery(),
  lookBack: getLookBack(),
  timeline: getTimeline(),
  // Please do not change, or if you do, needs
  // to be any number other than default value
  maxSignals: 500,
});

export const getNewOverrideRule = (): OverrideRule => ({
  customQuery: 'host.name: *',
  index: getIndexPatterns(),
  name: 'Override Rule',
  description: 'The new rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['http://example.com/', 'https://example.com/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [getMitre1(), getMitre2()],
  note: '# test markdown',
  severityOverride: [
    getSeverityOverride1(),
    getSeverityOverride2(),
    getSeverityOverride3(),
    getSeverityOverride4(),
  ],
  riskOverride: 'destination.port',
  nameOverride: 'agent.type',
  timestampOverride: '@timestamp',
  runsEvery: getRunsEvery(),
  lookBack: getLookBack(),
  timeline: getTimeline(),
  maxSignals: 100,
});

export const getNewThresholdRule = (): ThresholdRule => ({
  customQuery: 'host.name: *',
  index: getIndexPatterns(),
  name: 'Threshold Rule',
  description: 'The new rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['http://example.com/', 'https://example.com/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [getMitre1(), getMitre2()],
  note: '# test markdown',
  thresholdField: 'host.name',
  threshold: '1',
  runsEvery: getRunsEvery(),
  lookBack: getLookBack(),
  timeline: getTimeline(),
  maxSignals: 100,
});

export const getMachineLearningRule = (): MachineLearningRule => ({
  machineLearningJobs: ['linux_anomalous_network_service', 'linux_anomalous_network_activity_ecs'],
  anomalyScoreThreshold: '20',
  name: 'New ML Rule Test',
  description: 'The new ML rule description.',
  severity: 'Critical',
  riskScore: '70',
  tags: ['ML'],
  referenceUrls: ['https://elastic.co/'],
  falsePositivesExamples: ['False1'],
  mitre: [getMitre1()],
  note: '# test markdown',
  runsEvery: getRunsEvery(),
  lookBack: getLookBack(),
});

export const getEqlRule = (): CustomRule => ({
  customQuery: 'any where process.name == "zsh"',
  name: 'New EQL Rule',
  index: getIndexPatterns(),
  description: 'New EQL rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['http://example.com/', 'https://example.com/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [getMitre1(), getMitre2()],
  note: '# test markdown',
  runsEvery: getRunsEvery(),
  lookBack: getLookBack(),
  timeline: getTimeline(),
  maxSignals: 100,
});

export const getCCSEqlRule = (): CustomRule => ({
  customQuery: 'any where process.name == "run-parts"',
  name: 'New EQL Rule',
  index: [`${ccsRemoteName}:run-parts`],
  description: 'New EQL rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['http://example.com/', 'https://example.com/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [getMitre1(), getMitre2()],
  note: '# test markdown',
  runsEvery: getRunsEvery(),
  lookBack: getLookBack(),
  timeline: getTimeline(),
  maxSignals: 100,
});

export const getEqlSequenceRule = (): CustomRule => ({
  customQuery:
    'sequence with maxspan=30s\
     [any where agent.name == "test.local"]\
     [any where host.name == "test.local"]',
  name: 'New EQL Sequence Rule',
  index: getIndexPatterns(),
  description: 'New EQL rule description.',
  severity: 'High',
  riskScore: '17',
  tags: ['test', 'newRule'],
  referenceUrls: ['http://example.com/', 'https://example.com/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [getMitre1(), getMitre2()],
  note: '# test markdown',
  runsEvery: getRunsEvery(),
  lookBack: getLookBack(),
  timeline: getTimeline(),
  maxSignals: 100,
});

export const getNewThreatIndicatorRule = (): ThreatIndicatorRule => ({
  name: 'Threat Indicator Rule Test',
  description: 'The threat indicator rule description.',
  index: ['suspicious-*'],
  severity: 'Critical',
  riskScore: '20',
  tags: ['test', 'threat'],
  referenceUrls: ['http://example.com/', 'https://example.com/'],
  falsePositivesExamples: ['False1', 'False2'],
  mitre: [getMitre1(), getMitre2()],
  note: '# test markdown',
  runsEvery: getRunsEvery(),
  lookBack: getLookBack(),
  indicatorIndexPattern: ['filebeat-*'],
  indicatorMappingField: 'myhash.mysha256',
  indicatorIndexField: 'threat.indicator.file.hash.sha256',
  type: 'file',
  atomic: 'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3',
  timeline: getIndicatorMatchTimelineTemplate(),
  maxSignals: 100,
  threatIndicatorPath: 'threat.indicator',
  matchedType: 'indicator_match_rule',
  matchedId: '84cf452c1e0375c3d4412cb550bd1783358468a3b3b777da4829d72c7d6fb74f',
  matchedIndex: 'logs-ti_abusech.malware',
});

export const duplicatedRuleName = `${getNewThreatIndicatorRule().name} [Duplicate]`;

export const getSeveritiesOverride = (): string[] => ['Low', 'Medium', 'High', 'Critical'];

export const getEditedRule = (): CustomRule => ({
  ...getExistingRule(),
  severity: 'Medium',
  description: 'Edited Rule description',
  tags: [...getExistingRule().tags, 'edited'],
});

export const expectedExportedRule = (ruleResponse: Cypress.Response<RulesSchema>): string => {
  const {
    id,
    updated_at: updatedAt,
    updated_by: updatedBy,
    created_at: createdAt,
    description,
    name,
    risk_score: riskScore,
    severity,
    query,
  } = ruleResponse.body;
  const rule = {
    id,
    updated_at: updatedAt,
    updated_by: updatedBy,
    created_at: createdAt,
    created_by: 'elastic',
    name,
    tags: [],
    interval: '100m',
    enabled: false,
    description,
    risk_score: riskScore,
    severity,
    output_index: '.siem-signals-default',
    author: [],
    false_positives: [],
    from: 'now-50000h',
    rule_id: 'rule_testing',
    max_signals: 100,
    risk_score_mapping: [],
    severity_mapping: [],
    threat: [],
    to: 'now',
    references: [],
    version: 1,
    exceptions_list: [],
    immutable: false,
    type: 'query',
    language: 'kuery',
    index: getIndexPatterns(),
    query,
    throttle: 'no_actions',
    actions: [],
  };
  const details = {
    exported_count: 1,
    exported_rules_count: 1,
    missing_rules: [],
    missing_rules_count: 0,
    exported_exception_list_count: 0,
    exported_exception_list_item_count: 0,
    missing_exception_list_item_count: 0,
    missing_exception_list_items: [],
    missing_exception_lists: [],
    missing_exception_lists_count: 0,
  };

  return `${JSON.stringify(rule)}\n${JSON.stringify(details)}\n`;
};
