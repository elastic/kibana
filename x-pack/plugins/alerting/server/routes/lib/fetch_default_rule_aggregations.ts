/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient } from '../..';
import { AggregateOptions } from '../../rules_client';
import { RuleExecutionStatusValues, RuleLastRunOutcomeValues } from '../../types';

export interface AggregateResult {
  alertExecutionStatus: { [status: string]: number };
  ruleLastRunOutcome: { [status: string]: number };
  ruleEnabledStatus?: { enabled: number; disabled: number };
  ruleMutedStatus?: { muted: number; unmuted: number };
  ruleSnoozedStatus?: { snoozed: number };
  ruleTags?: string[];
}

interface RuleAggregations {
  status: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  outcome: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
  muted: {
    buckets: Array<{
      key: number;
      key_as_string: string;
      doc_count: number;
    }>;
  };
  enabled: {
    buckets: Array<{
      key: number;
      key_as_string: string;
      doc_count: number;
    }>;
  };
  snoozed: {
    count: {
      doc_count: number;
    };
  };
  tags: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

export async function fetchDefaultRuleAggregations(
  client: RulesClient,
  options: AggregateOptions
): Promise<AggregateResult> {
  const aggregations = await client.aggregate<RuleAggregations>(
    {
      status: {
        terms: { field: 'alert.attributes.executionStatus.status' },
      },
      outcome: {
        terms: { field: 'alert.attributes.lastRun.outcome' },
      },
      enabled: {
        terms: { field: 'alert.attributes.enabled' },
      },
      muted: {
        terms: { field: 'alert.attributes.muteAll' },
      },
      tags: {
        terms: { field: 'alert.attributes.tags', order: { _key: 'asc' }, size: 50 },
      },
      snoozed: {
        nested: {
          path: 'alert.attributes.snoozeSchedule',
        },
        aggs: {
          count: {
            filter: {
              exists: {
                field: 'alert.attributes.snoozeSchedule.duration',
              },
            },
          },
        },
      },
    },
    options
  );

  if (!aggregations) {
    const placeholder: AggregateResult = {
      alertExecutionStatus: {},
      ruleLastRunOutcome: {},
      ruleEnabledStatus: {
        enabled: 0,
        disabled: 0,
      },
      ruleMutedStatus: {
        muted: 0,
        unmuted: 0,
      },
      ruleSnoozedStatus: { snoozed: 0 },
    };

    for (const key of RuleExecutionStatusValues) {
      placeholder.alertExecutionStatus[key] = 0;
    }

    return placeholder;
  }

  const alertExecutionStatus = aggregations.status.buckets.map(({ key, doc_count: docCount }) => ({
    [key]: docCount,
  }));

  const ruleLastRunOutcome = aggregations.outcome.buckets.map(({ key, doc_count: docCount }) => ({
    [key]: docCount,
  }));

  const result: AggregateResult = {
    alertExecutionStatus: alertExecutionStatus.reduce(
      (acc, curr: { [status: string]: number }) => Object.assign(acc, curr),
      {}
    ),
    ruleLastRunOutcome: ruleLastRunOutcome.reduce(
      (acc, curr: { [status: string]: number }) => Object.assign(acc, curr),
      {}
    ),
  };

  // Fill missing keys with zeroes
  for (const key of RuleExecutionStatusValues) {
    if (!result.alertExecutionStatus.hasOwnProperty(key)) {
      result.alertExecutionStatus[key] = 0;
    }
  }
  for (const key of RuleLastRunOutcomeValues) {
    if (!result.ruleLastRunOutcome.hasOwnProperty(key)) {
      result.ruleLastRunOutcome[key] = 0;
    }
  }

  const enabledBuckets = aggregations.enabled.buckets;
  result.ruleEnabledStatus = {
    enabled: enabledBuckets.find((bucket) => bucket.key === 1)?.doc_count ?? 0,
    disabled: enabledBuckets.find((bucket) => bucket.key === 0)?.doc_count ?? 0,
  };

  const mutedBuckets = aggregations.muted.buckets;
  result.ruleMutedStatus = {
    muted: mutedBuckets.find((bucket) => bucket.key === 1)?.doc_count ?? 0,
    unmuted: mutedBuckets.find((bucket) => bucket.key === 0)?.doc_count ?? 0,
  };

  result.ruleSnoozedStatus = {
    snoozed: aggregations.snoozed?.count?.doc_count ?? 0,
  };

  const tagsBuckets = aggregations.tags?.buckets || [];
  result.ruleTags = tagsBuckets.map((bucket) => bucket.key);

  return result;
}
