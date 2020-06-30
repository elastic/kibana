/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getListArrayMock } from '../types/lists.mock';

import { RulesSchema } from './rules_schema';

export const ANCHOR_DATE = '2020-02-20T03:57:54.037Z';

export const getPartialRulesSchemaMock = (): Partial<RulesSchema> => ({
  created_by: 'elastic',
  description: 'Detecting root and admin users',
  enabled: true,
  false_positives: [],
  from: 'now-6m',
  id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
  immutable: false,
  index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  interval: '5m',
  risk_score: 50,
  rule_id: 'rule-1',
  language: 'kuery',
  max_signals: 100,
  name: 'Detect Root/Admin Users',
  output_index: '.siem-signals',
  query: 'user.name: root or user.name: admin',
  references: ['http://www.example.com', 'https://ww.example.com'],
  severity: 'high',
  updated_by: 'elastic',
  tags: ['some fake tag 1', 'some fake tag 2'],
  to: 'now',
  type: 'query',
  note: '',
});

export const getRulesSchemaMock = (anchorDate: string = ANCHOR_DATE): RulesSchema => ({
  id: '7a7065d7-6e8b-4aae-8d20-c93613dec9f9',
  created_at: new Date(anchorDate).toISOString(),
  updated_at: new Date(anchorDate).toISOString(),
  created_by: 'elastic',
  description: 'some description',
  enabled: true,
  false_positives: ['false positive 1', 'false positive 2'],
  from: 'now-6m',
  immutable: false,
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  references: ['test 1', 'test 2'],
  severity: 'high',
  updated_by: 'elastic_kibana',
  tags: [],
  to: 'now',
  type: 'query',
  threat: [],
  version: 1,
  status: 'succeeded',
  status_date: '2020-02-22T16:47:50.047Z',
  last_success_at: '2020-02-22T16:47:50.047Z',
  last_success_message: 'succeeded',
  output_index: '.siem-signals-hassanabad-frank-default',
  max_signals: 100,
  risk_score: 55,
  language: 'kuery',
  rule_id: 'query-rule-id',
  interval: '5m',
  exceptions_list: getListArrayMock(),
});

export const getRulesMlSchemaMock = (anchorDate: string = ANCHOR_DATE): RulesSchema => {
  const basePayload = getRulesSchemaMock(anchorDate);
  const { filters, index, query, language, ...rest } = basePayload;

  return {
    ...rest,
    type: 'machine_learning',
    anomaly_threshold: 59,
    machine_learning_job_id: 'some_machine_learning_job_id',
  };
};
