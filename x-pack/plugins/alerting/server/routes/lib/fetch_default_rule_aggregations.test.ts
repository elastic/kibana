/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '../../rules_client.mock';
import { fetchDefaultRuleAggregations } from './fetch_default_rule_aggregations';

describe('fetchDefaultRuleAggregations', () => {
  it('returns default rule aggregate results', async () => {
    const rulesClient = rulesClientMock.create();

    rulesClient.aggregate.mockResolvedValue({
      status: {
        buckets: [
          { key: 'active', doc_count: 23 },
          { key: 'error', doc_count: 2 },
          { key: 'ok', doc_count: 15 },
          { key: 'pending', doc_count: 1 },
        ],
      },
      outcome: {
        buckets: [
          { key: 'failed', doc_count: 2 },
          { key: 'succeeded', doc_count: 1 },
          { key: 'warning', doc_count: 3 },
        ],
      },
      muted: {
        buckets: [
          { key: 1, key_as_string: '1', doc_count: 2 },
          { key: 0, key_as_string: '0', doc_count: 39 },
        ],
      },
      enabled: {
        buckets: [
          { key: 1, key_as_string: '1', doc_count: 40 },
          { key: 0, key_as_string: '0', doc_count: 1 },
        ],
      },
      snoozed: {
        count: {
          doc_count: 4,
        },
      },
      tags: {
        buckets: [
          { key: 'a', doc_count: 1 },
          { key: 'b', doc_count: 2 },
          { key: 'c', doc_count: 3 },
        ],
      },
    });

    const result = await fetchDefaultRuleAggregations(rulesClient, {});

    expect(result).toEqual({
      alertExecutionStatus: {
        active: 23,
        error: 2,
        ok: 15,
        pending: 1,
        unknown: 0,
        warning: 0,
      },
      ruleEnabledStatus: {
        disabled: 1,
        enabled: 40,
      },
      ruleLastRunOutcome: {
        failed: 2,
        succeeded: 1,
        warning: 3,
      },
      ruleMutedStatus: {
        muted: 2,
        unmuted: 39,
      },
      ruleSnoozedStatus: {
        snoozed: 4,
      },
      ruleTags: ['a', 'b', 'c'],
    });
  });

  it('returns zeroed results if saved objects client have not returned aggregations', async () => {
    const rulesClient = rulesClientMock.create();

    rulesClient.aggregate.mockResolvedValue(undefined);

    const result = await fetchDefaultRuleAggregations(rulesClient, {});

    expect(result).toEqual({
      alertExecutionStatus: {
        active: 0,
        error: 0,
        ok: 0,
        pending: 0,
        unknown: 0,
        warning: 0,
      },
      ruleEnabledStatus: {
        disabled: 0,
        enabled: 0,
      },
      ruleLastRunOutcome: {},
      ruleMutedStatus: {
        muted: 0,
        unmuted: 0,
      },
      ruleSnoozedStatus: {
        snoozed: 0,
      },
    });
  });

  it('throws if saved objects client throws', async () => {
    const rulesClient = rulesClientMock.create();
    const expectedError = new Error('some error');

    rulesClient.aggregate.mockRejectedValue(expectedError);

    await expect(fetchDefaultRuleAggregations(rulesClient, {})).rejects.toThrowError(expectedError);
  });
});
