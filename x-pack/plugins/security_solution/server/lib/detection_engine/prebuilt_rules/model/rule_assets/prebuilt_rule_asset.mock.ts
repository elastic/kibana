/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRuleAsset } from './prebuilt_rule_asset';

export const getPrebuiltRuleMock = (rewrites?: Partial<PrebuiltRuleAsset>): PrebuiltRuleAsset =>
  ({
    description: 'some description',
    name: 'Query with a rule id',
    query: 'user.name: root or user.name: admin',
    severity: 'high',
    type: 'query',
    risk_score: 55,
    language: 'kuery',
    rule_id: 'rule-1',
    version: 1,
    ...rewrites,
  } as PrebuiltRuleAsset);

export const getPrebuiltRuleWithExceptionsMock = (): PrebuiltRuleAsset => ({
  description: 'A rule with an exception list',
  name: 'A rule with an exception list',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 42,
  language: 'kuery',
  rule_id: 'rule-with-exceptions',
  exceptions_list: [
    {
      id: 'endpoint_list',
      list_id: 'endpoint_list',
      namespace_type: 'agnostic',
      type: 'endpoint',
    },
  ],
  version: 2,
});

export const getPrebuiltThreatMatchRuleMock = (): PrebuiltRuleAsset => ({
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
