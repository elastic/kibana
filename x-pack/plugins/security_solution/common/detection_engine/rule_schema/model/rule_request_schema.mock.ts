/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../constants';
import type {
  MachineLearningRuleCreateProps,
  MachineLearningRuleUpdateProps,
  QueryRuleCreateProps,
  QueryRuleUpdateProps,
  SavedQueryRuleCreateProps,
  ThreatMatchRuleCreateProps,
  ThresholdRuleCreateProps,
  NewTermsRuleCreateProps,
  NewTermsRuleUpdateProps,
} from './rule_schemas';

export const getCreateRulesSchemaMock = (ruleId = 'rule-1'): QueryRuleCreateProps => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
});

export const getCreateRulesSchemaMockWithDataView = (ruleId = 'rule-1'): QueryRuleCreateProps => ({
  data_view_id: 'logs-*',
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
});

export const getCreateSavedQueryRulesSchemaMock = (
  ruleId = 'rule-1'
): SavedQueryRuleCreateProps => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'saved_query',
  saved_id: 'some id',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
});

export const getCreateThreatMatchRulesSchemaMock = (
  ruleId = 'rule-1',
  enabled = false
): ThreatMatchRuleCreateProps => ({
  description: 'Detecting root and admin users',
  enabled,
  index: ['auditbeat-*'],
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'threat_match',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
  threat_query: '*:*',
  threat_index: ['auditbeat-*'],
  threat_indicator_path: DEFAULT_INDICATOR_SOURCE_PATH,
  interval: '5m',
  from: 'now-6m',
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

export const getCreateMachineLearningRulesSchemaMock = (
  ruleId = 'rule-1'
): MachineLearningRuleCreateProps => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  severity: 'high',
  risk_score: 55,
  rule_id: ruleId,
  type: 'machine_learning',
  anomaly_threshold: 58,
  machine_learning_job_id: 'typical-ml-job-id',
});

export const getCreateThresholdRulesSchemaMock = (ruleId = 'rule-1'): ThresholdRuleCreateProps => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  severity: 'high',
  risk_score: 55,
  rule_id: ruleId,
  type: 'threshold',
  query: 'user.name: root or user.name: admin',
  threshold: {
    field: 'some.field',
    value: 4,
  },
});

export const getCreateNewTermsRulesSchemaMock = (
  ruleId = 'rule-1',
  enabled = false
): NewTermsRuleCreateProps => ({
  description: 'Detecting root and admin users',
  enabled,
  index: ['auditbeat-*'],
  name: 'Query with a rule id',
  query: '*',
  severity: 'high',
  type: 'new_terms',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
  interval: '5m',
  from: 'now-6m',
  new_terms_fields: ['user.name'],
  history_window_start: 'now-7d',
});

export const getUpdateRulesSchemaMock = (
  id = '04128c15-0d1b-4716-a4c5-46997ac7f3bd'
): QueryRuleUpdateProps => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  id,
});

export const getUpdateMachineLearningSchemaMock = (
  id = '04128c15-0d1b-4716-a4c5-46997ac7f3bd'
): MachineLearningRuleUpdateProps => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  severity: 'high',
  risk_score: 55,
  id,
  type: 'machine_learning',
  anomaly_threshold: 58,
  machine_learning_job_id: 'typical-ml-job-id',
});

export const getUpdateNewTermsSchemaMock = (
  id = '04128c15-0d1b-4716-a4c5-46997ac7f3bd'
): NewTermsRuleUpdateProps => ({
  description: 'Detecting root and admin users',
  index: ['auditbeat-*'],
  name: 'Query with a rule id',
  query: '*',
  severity: 'high',
  type: 'new_terms',
  risk_score: 55,
  language: 'kuery',
  id,
  interval: '5m',
  from: 'now-6m',
  new_terms_fields: ['user.name'],
  history_window_start: 'now-7d',
});
