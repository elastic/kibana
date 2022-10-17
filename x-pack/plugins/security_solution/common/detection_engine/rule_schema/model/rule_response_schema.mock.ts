/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../constants';
import type {
  EqlRule,
  MachineLearningRule,
  QueryRule,
  SavedQueryRule,
  SharedResponseProps,
  ThreatMatchRule,
} from './rule_schemas';
import { getListArrayMock } from '../../schemas/types/lists.mock';

export const ANCHOR_DATE = '2020-02-20T03:57:54.037Z';

const getResponseBaseParams = (anchorDate: string = ANCHOR_DATE): SharedResponseProps => ({
  author: [],
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
  references: ['test 1', 'test 2'],
  severity: 'high' as const,
  severity_mapping: [],
  updated_by: 'elastic_kibana',
  tags: ['some fake tag 1', 'some fake tag 2'],
  to: 'now',
  threat: [],
  version: 1,
  output_index: '.siem-signals-default',
  max_signals: 100,
  risk_score: 55,
  risk_score_mapping: [],
  rule_id: 'query-rule-id',
  interval: '5m',
  exceptions_list: getListArrayMock(),
  related_integrations: [],
  required_fields: [],
  setup: '',
  throttle: 'no_actions',
  actions: [],
  building_block_type: undefined,
  note: undefined,
  license: undefined,
  outcome: undefined,
  alias_target_id: undefined,
  alias_purpose: undefined,
  timeline_id: undefined,
  timeline_title: undefined,
  meta: undefined,
  rule_name_override: undefined,
  timestamp_override: undefined,
  timestamp_override_fallback_disabled: undefined,
  namespace: undefined,
});

export const getRulesSchemaMock = (anchorDate: string = ANCHOR_DATE): QueryRule => ({
  ...getResponseBaseParams(anchorDate),
  query: 'user.name: root or user.name: admin',
  type: 'query',
  language: 'kuery',
  index: undefined,
  data_view_id: undefined,
  filters: undefined,
  saved_id: undefined,
  response_actions: undefined,
});

export const getSavedQuerySchemaMock = (anchorDate: string = ANCHOR_DATE): SavedQueryRule => ({
  ...getResponseBaseParams(anchorDate),
  query: 'user.name: root or user.name: admin',
  type: 'saved_query',
  saved_id: 'save id 123',
  language: 'kuery',
  index: undefined,
  data_view_id: undefined,
  filters: undefined,
  response_actions: undefined,
});

export const getRulesMlSchemaMock = (anchorDate: string = ANCHOR_DATE): MachineLearningRule => {
  return {
    ...getResponseBaseParams(anchorDate),
    type: 'machine_learning',
    anomaly_threshold: 59,
    machine_learning_job_id: 'some_machine_learning_job_id',
  };
};

export const getThreatMatchingSchemaMock = (anchorDate: string = ANCHOR_DATE): ThreatMatchRule => {
  return {
    ...getResponseBaseParams(anchorDate),
    type: 'threat_match',
    query: 'user.name: root or user.name: admin',
    language: 'kuery',
    threat_index: ['index-123'],
    threat_mapping: [{ entries: [{ field: 'host.name', type: 'mapping', value: 'host.name' }] }],
    threat_query: '*:*',
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
    index: undefined,
    data_view_id: undefined,
    filters: undefined,
    saved_id: undefined,
    threat_indicator_path: undefined,
    threat_language: undefined,
    concurrent_searches: undefined,
    items_per_search: undefined,
  };
};

/**
 * Useful for e2e backend tests where it doesn't have date time and other
 * server side properties attached to it.
 */
export const getThreatMatchingSchemaPartialMock = (enabled = false): Partial<ThreatMatchRule> => {
  return {
    author: [],
    created_by: 'elastic',
    description: 'Detecting root and admin users',
    enabled,
    false_positives: [],
    from: 'now-6m',
    immutable: false,
    interval: '5m',
    index: ['auditbeat-*'],
    rule_id: 'rule-1',
    output_index: '',
    max_signals: 100,
    risk_score: 55,
    risk_score_mapping: [],
    name: 'Query with a rule id',
    references: [],
    related_integrations: [],
    required_fields: [],
    setup: '',
    severity: 'high',
    severity_mapping: [],
    updated_by: 'elastic',
    tags: [],
    to: 'now',
    type: 'threat_match',
    threat: [],
    version: 1,
    exceptions_list: [],
    actions: [],
    throttle: 'no_actions',
    query: 'user.name: root or user.name: admin',
    language: 'kuery',
    threat_query: '*:*',
    threat_index: ['auditbeat-*'],
    threat_indicator_path: DEFAULT_INDICATOR_SOURCE_PATH,
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
  };
};

export const getRulesEqlSchemaMock = (anchorDate: string = ANCHOR_DATE): EqlRule => {
  return {
    ...getResponseBaseParams(anchorDate),
    language: 'eql',
    type: 'eql',
    query: 'process where true',
    index: undefined,
    data_view_id: undefined,
    filters: undefined,
    timestamp_field: undefined,
    event_category_override: undefined,
    tiebreaker_field: undefined,
  };
};
