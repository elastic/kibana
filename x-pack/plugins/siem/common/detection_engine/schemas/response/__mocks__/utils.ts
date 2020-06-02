/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RulesSchema } from '../rules_schema';
import { RulesBulkSchema } from '../rules_bulk_schema';
import { ErrorSchema } from '../error_schema';
import { FindRulesSchema } from '../find_rules_schema';

export const ANCHOR_DATE = '2020-02-20T03:57:54.037Z';

export const getBaseResponsePayload = (anchorDate: string = ANCHOR_DATE): RulesSchema => ({
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
  exceptions_list: [
    {
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
  ],
});

export const getRulesBulkPayload = (): RulesBulkSchema => [getBaseResponsePayload()];

export const getMlRuleResponsePayload = (anchorDate: string = ANCHOR_DATE): RulesSchema => {
  const basePayload = getBaseResponsePayload(anchorDate);
  const { filters, index, query, language, ...rest } = basePayload;

  return {
    ...rest,
    type: 'machine_learning',
    anomaly_threshold: 59,
    machine_learning_job_id: 'some_machine_learning_job_id',
  };
};

export const getErrorPayload = (
  id: string = '819eded6-e9c8-445b-a647-519aea39e063'
): ErrorSchema => ({
  id,
  error: {
    status_code: 404,
    message: 'id: "819eded6-e9c8-445b-a647-519aea39e063" not found',
  },
});

export const getFindResponseSingle = (): FindRulesSchema => ({
  page: 1,
  perPage: 1,
  total: 1,
  data: [getBaseResponsePayload()],
});
