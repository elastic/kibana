/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FullCreateSchema } from './rule_schemas';

export const getFullCreateSchemaMock = (ruleId = 'rule-1'): FullCreateSchema => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'query',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
});

export const getFullCreateThreatMatchSchemaMock = (ruleId = 'rule-1'): FullCreateSchema => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  severity: 'high',
  type: 'threat_match',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
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
