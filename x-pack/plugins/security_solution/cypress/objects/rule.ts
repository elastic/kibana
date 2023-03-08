/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleActionThrottle,
  SeverityMappingItem,
  Threat,
} from '@kbn/securitysolution-io-ts-alerting-types';
import { getMockThreatData } from '../../public/detections/mitre/mitre_tactics_techniques';
import type {
  EqlRuleCreateProps,
  MachineLearningRuleCreateProps,
  NewTermsRuleCreateProps,
  QueryRuleCreateProps,
  RuleResponse,
  ThreatMatchRuleCreateProps,
  ThresholdRuleCreateProps,
} from '../../common/detection_engine/rule_schema';
import type { Connectors } from './connector';

const ccsRemoteName: string = Cypress.env('CCS_REMOTE_NAME');

export interface Actions {
  throttle: RuleActionThrottle;
  connectors: Connectors[];
}

export const getIndexPatterns = (): string[] => [
  'apm-*-transaction*',
  'auditbeat-*',
  'endgame-*',
  'filebeat-*',
  'logs-*',
  'packetbeat-*',
  'traces-apm*',
  'winlogbeat-*',
  '-*elastic-cloud-logs-*',
];

export const getThreatIndexPatterns = (): string[] => ['logs-ti_*'];

const getMitre1 = (): Threat => ({
  framework: 'MITRE ATT&CK',
  tactic: {
    name: getMockThreatData().tactic.name,
    id: getMockThreatData().tactic.id,
    reference: getMockThreatData().tactic.reference,
  },
  technique: [
    {
      id: getMockThreatData().technique.id,
      reference: getMockThreatData().technique.reference,
      name: getMockThreatData().technique.name,
      subtechnique: [
        {
          id: getMockThreatData().subtechnique.id,
          name: getMockThreatData().subtechnique.name,
          reference: getMockThreatData().subtechnique.reference,
        },
      ],
    },
    {
      name: getMockThreatData().technique.name,
      id: getMockThreatData().technique.id,
      reference: getMockThreatData().technique.reference,
      subtechnique: [],
    },
  ],
});

const getMitre2 = (): Threat => ({
  framework: 'MITRE ATT&CK',
  tactic: {
    name: getMockThreatData().tactic.name,
    id: getMockThreatData().tactic.id,
    reference: getMockThreatData().tactic.reference,
  },
  technique: [
    {
      id: getMockThreatData().technique.id,
      reference: getMockThreatData().technique.reference,
      name: getMockThreatData().technique.name,
      subtechnique: [
        {
          id: getMockThreatData().subtechnique.id,
          name: getMockThreatData().subtechnique.name,
          reference: getMockThreatData().subtechnique.reference,
        },
      ],
    },
  ],
});

const getSeverityOverride1 = (): SeverityMappingItem => ({
  field: 'host.name',
  value: 'host',
  operator: 'equals',
  severity: 'low',
});

const getSeverityOverride2 = (): SeverityMappingItem => ({
  field: '@timestamp',
  value: '10/02/2020',
  operator: 'equals',
  severity: 'medium',
});

const getSeverityOverride3 = (): SeverityMappingItem => ({
  field: 'host.geo.name',
  value: 'atack',
  operator: 'equals',
  severity: 'high',
});

const getSeverityOverride4 = (): SeverityMappingItem => ({
  field: 'agent.type',
  value: 'auditbeat',
  operator: 'equals',
  severity: 'critical',
});

export const getDataViewRule = (): QueryRuleCreateProps => ({
  type: 'query',
  query: 'host.name: *',
  data_view_id: 'auditbeat-2022',
  name: 'New Data View Rule',
  description: 'The new rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [getMitre1(), getMitre2()],
  note: '# test markdown',
  interval: '100m',
  from: 'now-50000h',
  max_signals: 100,
});

export const getNewRule = (): QueryRuleCreateProps => ({
  type: 'query',
  query: 'host.name: *',
  index: getIndexPatterns(),
  name: 'New Rule Test',
  description: 'The new rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [getMitre1(), getMitre2()],
  note: '# test markdown',
  interval: '100m',
  from: 'now-50000h',
  max_signals: 100,
});

export const getSimpleCustomQueryRule = (): QueryRuleCreateProps => ({
  type: 'query',
  query: 'host.name: *',
  index: getIndexPatterns(),
  name: 'New Rule Test',
  description: 'The new rule description.',
  interval: '100m',
  from: 'now-50000h',
  severity: 'low',
  risk_score: 21,
});

export const getBuildingBlockRule = (): QueryRuleCreateProps => ({
  type: 'query',
  query: 'host.name: *',
  index: getIndexPatterns(),
  name: 'Building Block Rule Test',
  description: 'The new rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [getMitre1(), getMitre2()],
  note: '# test markdown',
  interval: '100m',
  from: 'now-50000h',
  max_signals: 100,
  building_block_type: 'default',
});

export const getUnmappedRule = (): QueryRuleCreateProps => ({
  type: 'query',
  query: '*:*',
  index: ['unmapped*'],
  name: 'Rule with unmapped fields',
  description: 'The new rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [getMitre1(), getMitre2()],
  note: '# test markdown',
  interval: '100m',
  from: 'now-50000h',
  max_signals: 100,
});

export const getUnmappedCCSRule = (): QueryRuleCreateProps => ({
  type: 'query',
  query: '*:*',
  index: [`${ccsRemoteName}:unmapped*`],
  name: 'Rule with unmapped fields',
  description: 'The new rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [getMitre1(), getMitre2()],
  note: '# test markdown',
  interval: '100m',
  from: 'now-50000h',
  max_signals: 100,
});

export const getExistingRule = (): QueryRuleCreateProps => ({
  type: 'query',
  query: 'host.name: *',
  name: 'Rule 1',
  description: 'Description for Rule 1',
  index: ['auditbeat-*'],
  severity: 'high',
  risk_score: 19,
  tags: ['rule1'],
  references: [],
  false_positives: [],
  threat: [],
  note: 'This is my note',
  interval: '100m',
  from: 'now-50000h',
  // Please do not change, or if you do, needs
  // to be any number other than default value
  max_signals: 500,
});

export const getNewOverrideRule = (): QueryRuleCreateProps => ({
  type: 'query',
  query: 'host.name: *',
  index: getIndexPatterns(),
  name: 'Override Rule',
  description: 'The new rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [getMitre1(), getMitre2()],
  note: '# test markdown',
  severity_mapping: [
    getSeverityOverride1(),
    getSeverityOverride2(),
    getSeverityOverride3(),
    getSeverityOverride4(),
  ],
  risk_score_mapping: [
    { field: 'destination.port', value: '', operator: 'equals', risk_score: undefined },
  ],
  rule_name_override: 'agent.type',
  timestamp_override: '@timestamp',
  interval: '100m',
  from: 'now-50000h',
  max_signals: 100,
});

export const getNewThresholdRule = (): ThresholdRuleCreateProps => ({
  type: 'threshold',
  query: 'host.name: *',
  index: getIndexPatterns(),
  name: 'Threshold Rule',
  description: 'The new rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [getMitre1(), getMitre2()],
  note: '# test markdown',
  threshold: {
    field: 'host.name',
    value: 1,
  },
  interval: '100m',
  from: 'now-50000h',
  max_signals: 100,
});

export const getNewTermsRule = (): NewTermsRuleCreateProps => ({
  type: 'new_terms',
  query: 'host.name: *',
  index: getIndexPatterns(),
  name: 'New Terms Rule',
  description: 'The new rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [getMitre1(), getMitre2()],
  note: '# test markdown',
  new_terms_fields: ['host.name'],
  history_window_start: 'now-51000h',
  interval: '100m',
  from: 'now-50000h',
  max_signals: 100,
});

export const getMachineLearningRule = (): MachineLearningRuleCreateProps => ({
  type: 'machine_learning',
  machine_learning_job_id: [
    'Unusual Linux Network Activity',
    'Anomalous Process for a Linux Population',
  ],
  anomaly_threshold: 20,
  name: 'New ML Rule Test',
  description: 'The new ML rule description.',
  severity: 'critical',
  risk_score: 70,
  tags: ['ML'],
  references: ['https://elastic.co/'],
  false_positives: ['False1'],
  threat: [getMitre1()],
  note: '# test markdown',
  interval: '100m',
  from: 'now-50000h',
});

export const getEqlRule = (): EqlRuleCreateProps => ({
  type: 'eql',
  language: 'eql',
  query: 'any where process.name == "zsh"',
  name: 'New EQL Rule',
  index: getIndexPatterns(),
  description: 'New EQL rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [getMitre1(), getMitre2()],
  note: '# test markdown',
  interval: '100m',
  from: 'now-50000h',
  max_signals: 100,
});

export const getCCSEqlRule = (): EqlRuleCreateProps => ({
  type: 'eql',
  language: 'eql',
  query: 'any where process.name == "run-parts"',
  name: 'New EQL Rule',
  index: [`${ccsRemoteName}:run-parts`],
  description: 'New EQL rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [getMitre1(), getMitre2()],
  note: '# test markdown',
  interval: '100m',
  from: 'now-50000h',
  max_signals: 100,
});

export const getEqlSequenceRule = (): EqlRuleCreateProps => ({
  type: 'eql',
  language: 'eql',
  query:
    'sequence with maxspan=30s\
     [any where agent.name == "test.local"]\
     [any where host.name == "test.local"]',
  name: 'New EQL Sequence Rule',
  index: getIndexPatterns(),
  description: 'New EQL rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [getMitre1(), getMitre2()],
  note: '# test markdown',
  interval: '100m',
  from: 'now-50000h',
  max_signals: 100,
});

export const getNewThreatIndicatorRule = (): ThreatMatchRuleCreateProps => ({
  type: 'threat_match',
  name: 'Threat Indicator Rule Test',
  description: 'The threat indicator rule description.',
  query: '*:*',
  threat_query: '*:*',
  index: ['suspicious-*'],
  severity: 'critical',
  risk_score: 20,
  tags: ['test', 'threat'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  threat: [getMitre1(), getMitre2()],
  note: '# test markdown',
  interval: '100m',
  from: 'now-50000h',
  threat_index: ['filebeat-*'],
  threat_mapping: [
    {
      entries: [
        {
          field: 'myhash.mysha256',
          value: 'threat.indicator.file.hash.sha256',
          type: 'mapping',
        },
      ],
    },
  ],
  max_signals: 100,
  threat_indicator_path: 'threat.indicator',
  timeline_title: 'Generic Threat Match Timeline',
  timeline_id: '495ad7a7-316e-4544-8a0f-9c098daee76e',
});

export const indicatorRuleMatchingDoc = {
  atomic: 'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3',
  matchedType: 'indicator_match_rule',
  matchedId: '84cf452c1e0375c3d4412cb550bd1783358468a3b3b777da4829d72c7d6fb74f',
  matchedIndex: 'logs-ti_abusech.malware',
};

export const duplicatedRuleName = `${getNewThreatIndicatorRule().name} [Duplicate]`;

export const getSeveritiesOverride = (): string[] => ['Low', 'Medium', 'High', 'Critical'];

export const getEditedRule = (): QueryRuleCreateProps => ({
  ...getExistingRule(),
  severity: 'medium',
  description: 'Edited Rule description',
  tags: [...(getExistingRule().tags || []), 'edited'],
});

export const expectedExportedRule = (ruleResponse: Cypress.Response<RuleResponse>): string => {
  const {
    id,
    updated_at: updatedAt,
    updated_by: updatedBy,
    created_at: createdAt,
    created_by: createdBy,
    description,
    name,
    risk_score: riskScore,
    severity,
    note,
    tags,
    interval,
    enabled,
    author,
    false_positives: falsePositives,
    from,
    rule_id: ruleId,
    max_signals: maxSignals,
    risk_score_mapping: riskScoreMapping,
    severity_mapping: severityMapping,
    threat,
    to,
    references,
    version,
    exceptions_list: exceptionsList,
    immutable,
    related_integrations: relatedIntegrations,
    setup,
  } = ruleResponse.body;

  let query: string | undefined;
  if (ruleResponse.body.type === 'query') {
    query = ruleResponse.body.query;
  }

  // NOTE: Order of the properties in this object matters for the tests to work.
  // TODO: Follow up https://github.com/elastic/kibana/pull/137628 and add an explicit type to this object
  // without using Partial
  const rule: Partial<RuleResponse> = {
    id,
    updated_at: updatedAt,
    updated_by: updatedBy,
    created_at: createdAt,
    created_by: createdBy,
    name,
    tags,
    interval,
    enabled,
    description,
    risk_score: riskScore,
    severity,
    note,
    output_index: '',
    author,
    false_positives: falsePositives,
    from,
    rule_id: ruleId,
    max_signals: maxSignals,
    risk_score_mapping: riskScoreMapping,
    severity_mapping: severityMapping,
    threat,
    to,
    references,
    version,
    exceptions_list: exceptionsList,
    immutable,
    related_integrations: relatedIntegrations,
    required_fields: [],
    setup,
    type: 'query',
    language: 'kuery',
    index: getIndexPatterns(),
    query,
    throttle: 'no_actions',
    actions: [],
  };

  // NOTE: Order of the properties in this object matters for the tests to work.
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
    exported_action_connector_count: 0,
    missing_action_connection_count: 0,
    missing_action_connections: [],
    excluded_action_connection_count: 0,
    excluded_action_connections: [],
  };

  return `${JSON.stringify(rule)}\n${JSON.stringify(details)}\n`;
};
