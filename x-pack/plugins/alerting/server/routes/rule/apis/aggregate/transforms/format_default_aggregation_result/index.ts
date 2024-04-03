/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleAggregationFormattedResult } from '../../../../../../application/rule/methods/aggregate/types';
import { RuleExecutionStatusValues, RuleLastRunOutcomeValues } from '../../../../../../../common';
import { DefaultRuleAggregationResult } from '../../types';

export const formatDefaultAggregationResult = (
  aggregations: DefaultRuleAggregationResult
): RuleAggregationFormattedResult => {
  if (!aggregations) {
    // Return a placeholder with all zeroes
    const placeholder: RuleAggregationFormattedResult = {
      ruleExecutionStatus: {},
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
      ruleTags: [],
    };

    for (const key of RuleExecutionStatusValues) {
      placeholder.ruleExecutionStatus[key] = 0;
    }

    return placeholder;
  }

  const ruleExecutionStatus = aggregations.status.buckets.map(({ key, doc_count: docCount }) => ({
    [key]: docCount,
  }));

  const ruleLastRunOutcome = aggregations.outcome.buckets.map(({ key, doc_count: docCount }) => ({
    [key]: docCount,
  }));

  const enabledBuckets = aggregations.enabled.buckets;
  const mutedBuckets = aggregations.muted.buckets;

  const result: RuleAggregationFormattedResult = {
    ruleExecutionStatus: ruleExecutionStatus.reduce(
      (acc, curr: { [status: string]: number }) => Object.assign(acc, curr),
      {}
    ),
    ruleLastRunOutcome: ruleLastRunOutcome.reduce(
      (acc, curr: { [status: string]: number }) => Object.assign(acc, curr),
      {}
    ),
    ruleEnabledStatus: {
      enabled: enabledBuckets.find((bucket) => bucket.key === 1)?.doc_count ?? 0,
      disabled: enabledBuckets.find((bucket) => bucket.key === 0)?.doc_count ?? 0,
    },
    ruleMutedStatus: {
      muted: mutedBuckets.find((bucket) => bucket.key === 1)?.doc_count ?? 0,
      unmuted: mutedBuckets.find((bucket) => bucket.key === 0)?.doc_count ?? 0,
    },
    ruleSnoozedStatus: {
      snoozed: aggregations.snoozed?.count?.doc_count ?? 0,
    },
    ruleTags: [],
  };

  // Fill missing keys with zeroes
  for (const key of RuleExecutionStatusValues) {
    if (!result.ruleExecutionStatus.hasOwnProperty(key)) {
      result.ruleExecutionStatus[key] = 0;
    }
  }
  for (const key of RuleLastRunOutcomeValues) {
    if (!result.ruleLastRunOutcome.hasOwnProperty(key)) {
      result.ruleLastRunOutcome[key] = 0;
    }
  }

  const tagsBuckets = aggregations.tags?.buckets || [];
  tagsBuckets.forEach((bucket) => {
    result.ruleTags.push(bucket.key);
  });

  return result;
};
