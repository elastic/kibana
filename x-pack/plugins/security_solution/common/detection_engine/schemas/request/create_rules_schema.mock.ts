/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateRulesSchema, CreateRulesSchemaDecoded } from './create_rules_schema';
import { DEFAULT_MAX_SIGNALS } from '../../../constants';

export const getCreateRulesSchemaMock = (ruleId = 'rule-1'): CreateRulesSchema => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
});

export const getCreateMlRulesSchemaMock = (ruleId = 'rule-1') => {
  const { query, language, index, ...mlParams } = getCreateRulesSchemaMock(ruleId);

  return {
    ...mlParams,
    type: 'machine_learning',
    anomaly_threshold: 58,
    machine_learning_job_id: 'typical-ml-job-id',
  };
};

export const getCreateRulesSchemaDecodedMock = (): CreateRulesSchemaDecoded => ({
  author: [],
  severity_mapping: [],
  risk_score_mapping: [],
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  references: [],
  actions: [],
  enabled: true,
  false_positives: [],
  from: 'now-6m',
  interval: '5m',
  max_signals: DEFAULT_MAX_SIGNALS,
  tags: [],
  to: 'now',
  threat: [],
  throttle: null,
  version: 1,
  exceptions_list: [],
  rule_id: 'rule-1',
});

export const getCreateThreatMatchRulesSchemaMock = (ruleId = 'rule-1'): CreateRulesSchema => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'threat_match',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
  threat_query: '*:*',
  threat_index: 'list-index',
  threat_mapping: [
    {
      entries: [
        {
          field: 'host.name',
          value: 'host.name',
          type: 'mapping',
        },
      ],
    },
  ],
  threat_filters: [
    {
      bool: {
        must: [
          {
            query_string: {
              query: 'host.name: linux',
              analyze_wildcard: true,
              time_zone: 'Zulu',
            },
          },
        ],
        filter: [],
        should: [],
        must_not: [],
      },
    },
  ],
});

export const getCreateThreatMatchRulesSchemaDecodedMock = (): CreateRulesSchemaDecoded => ({
  author: [],
  severity_mapping: [],
  risk_score_mapping: [],
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'threat_match',
  risk_score: 55,
  language: 'kuery',
  references: [],
  actions: [],
  enabled: true,
  false_positives: [],
  from: 'now-6m',
  interval: '5m',
  max_signals: DEFAULT_MAX_SIGNALS,
  tags: [],
  to: 'now',
  threat: [],
  throttle: null,
  version: 1,
  exceptions_list: [],
  rule_id: 'rule-1',
  threat_query: '*:*',
  threat_index: 'list-index',
  threat_mapping: [
    {
      entries: [
        {
          field: 'host.name',
          value: 'host.name',
          type: 'mapping',
        },
      ],
    },
  ],
  threat_filters: [
    {
      bool: {
        must: [
          {
            query_string: {
              query: 'host.name: linux',
              analyze_wildcard: true,
              time_zone: 'Zulu',
            },
          },
        ],
        filter: [],
        should: [],
        must_not: [],
      },
    },
  ],
});
