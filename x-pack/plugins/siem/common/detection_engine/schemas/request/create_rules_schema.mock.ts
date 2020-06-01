/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CreateRulesSchema } from './create_rules_schema';

/*
export const createRulesSchemaMock = (): CreateRulesSchema => ({
  description: 'some description',
  enabled: true,
  false_positives: ['false positive 1', 'false positive 2'],
  from: 'now-6m',
  name: 'Query with a rule id',
  query: 'user.name: root or user.name: admin',
  references: ['test 1', 'test 2'],
  severity: 'high',
  tags: [],
  to: 'now',
  type: 'query',
  threat: [],
  version: 1,
  output_index: '.siem-signals-hassanabad-frank-default',
  max_signals: 100,
  risk_score: 55,
  language: 'kuery',
  rule_id: 'query-rule-id',
  interval: '5m',
});
*/

/*
exception_list: {
      field: 'source.ip',
      values_operator: 'included',
      values_type: 'exists',
    },
    {
      field: 'host.name',
      values_operator: 'excluded',
      values_type: 'match',
      values: [
        {
          name: 'rock01',
        },
      ],
      and: [
        {
          field: 'host.id',
          values_operator: 'included',
          values_type: 'match_all',
          values: [
            {
              name: '123',
            },
            {
              name: '678',
            },
          ],
        },
      ],
    },
*/
