/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AddPrepackagedRulesSchema,
  AddPrepackagedRulesSchemaDecoded,
} from './add_prepackaged_rules_schema';
import { DEFAULT_MAX_SIGNALS } from '../../../constants';

export const getAddPrepackagedRulesSchemaMock = (): AddPrepackagedRulesSchema => ({
  description: 'some description',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  rule_id: 'rule-1',
  version: 1,
});

export const getAddPrepackagedRulesSchemaDecodedMock = (): AddPrepackagedRulesSchemaDecoded => ({
  author: [],
  description: 'some description',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  severity_mapping: [],
  type: 'query',
  risk_score: 55,
  risk_score_mapping: [],
  language: 'kuery',
  references: [],
  actions: [],
  enabled: false,
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

export const getAddPrepackagedThreatMatchRulesSchemaMock = (): AddPrepackagedRulesSchema => ({
  description: 'some description',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'threat_match',
  risk_score: 55,
  language: 'kuery',
  rule_id: 'rule-1',
  version: 1,
  threat_query: '*:*',
  threat_index: ['list-index'],
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

export const getAddPrepackagedThreatMatchRulesSchemaDecodedMock = (): AddPrepackagedRulesSchemaDecoded => ({
  author: [],
  description: 'some description',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  severity_mapping: [],
  type: 'threat_match',
  risk_score: 55,
  risk_score_mapping: [],
  language: 'kuery',
  references: [],
  actions: [],
  enabled: false,
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
  threat_index: ['list-index'],
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
