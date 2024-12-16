/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { AggregateEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import type {
  RuleHealthSnapshot,
  RuleHealthStats,
  HealthHistory,
} from '../../../../../../../../common/api/detection_engine/rule_monitoring';
import type { RawData } from '../../../utils/normalization';
import { normalizeRuleExecutionStatsAggregationResult } from './normalize_rule_execution_stats_aggregation_result';

export const normalizeRuleHealthAggregationResult = (
  result: AggregateEventsBySavedObjectResult,
  requestAggs: Record<string, estypes.AggregationsAggregationContainer>
): Omit<RuleHealthSnapshot, 'state_at_the_moment'> => {
  const aggregations = result.aggregations ?? {};
  return {
    stats_over_interval: normalizeRuleExecutionStatsAggregationResult(
      aggregations,
      'whole-interval'
    ),
    history_over_interval: normalizeRuleHistoryOverInterval(aggregations),
    debug: {
      eventLog: {
        request: { aggs: requestAggs },
        response: { aggregations },
      },
    },
  };
};

const normalizeRuleHistoryOverInterval = (
  aggregations: Record<string, RawData>
): HealthHistory<RuleHealthStats> => {
  const statsHistory = aggregations.statsHistory || {};

  return {
    buckets: statsHistory.buckets.map((rawBucket: RawData) => {
      const timestamp: string = String(rawBucket.key_as_string);
      const stats = normalizeRuleExecutionStatsAggregationResult(rawBucket, 'histogram');
      return { timestamp, stats };
    }),
  };
};
