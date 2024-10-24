/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { AggregateEventsBySavedObjectResult } from '@kbn/event-log-plugin/server';
import type {
  HealthHistory,
  SpaceHealthSnapshot,
  SpaceHealthStats,
  SpaceHealthOverviewStats,
  TopRulesByMetrics,
  RuleInfoWithPercentiles,
  RuleInfo,
} from '../../../../../../../../common/api/detection_engine/rule_monitoring';
import type { RawData } from '../../../utils/normalization';
import type { RuleExecutionStatsAggregationLevel } from '../aggregation_level';
import { normalizeAggregatedMetric } from './normalize_aggregated_metric';
import { normalizeRuleExecutionStatsAggregationResult } from './normalize_rule_execution_stats_aggregation_result';

export const normalizeSpacesHealthAggregationResult = (
  result: AggregateEventsBySavedObjectResult,
  requestAggs: Record<string, estypes.AggregationsAggregationContainer>
): Omit<SpaceHealthSnapshot, 'state_at_the_moment'> => {
  const aggregations = result.aggregations ?? {};
  return {
    stats_over_interval: normalizeSpacesExecutionStatsAggregationResult(
      aggregations,
      'whole-interval'
    ),
    history_over_interval: normalizeSpacesHistoryOverInterval(aggregations),
    debug: {
      eventLog: {
        request: { aggs: requestAggs },
        response: { aggregations },
      },
    },
  };
};

const normalizeSpacesExecutionStatsAggregationResult = (
  aggregations: Record<string, RawData>,
  aggregationLevel: RuleExecutionStatsAggregationLevel
): SpaceHealthOverviewStats => {
  return {
    top_rules: normalizeTopRulesByMetricsAggregationResult(aggregations),
    ...normalizeRuleExecutionStatsAggregationResult(aggregations, aggregationLevel),
  };
};

const normalizeTopRulesByMetricsAggregationResult = (
  aggregations: Record<string, RawData>
): TopRulesByMetrics => {
  const topRulesByExecutionDurationMs = aggregations.topRulesByExecutionDurationMs || {};
  const topRulesByScheduleDelay = aggregations.topRulesByScheduleDelay || {};
  const topRulesBySearchDurationMs = aggregations.topRulesBySearchDurationMs || {};
  const topRulesByIndexingDurationMs = aggregations.topRulesByIndexingDurationMs || {};
  const topRulesByEnrichmentDurationMs = aggregations.topRulesByEnrichmentDurationMs || {};

  return {
    by_execution_duration_ms:
      normalizeTopRuleAggregationResult(topRulesByExecutionDurationMs) ?? [],
    by_schedule_delay_ms:
      normalizeTopRuleAggregationResult(topRulesByScheduleDelay, (val) => val / 1_000_000) ?? [],
    by_search_duration_ms: normalizeTopRuleAggregationResult(topRulesBySearchDurationMs) ?? [],
    by_indexing_duration_ms: normalizeTopRuleAggregationResult(topRulesByIndexingDurationMs) ?? [],
    by_enrichment_duration_ms:
      normalizeTopRuleAggregationResult(topRulesByEnrichmentDurationMs) ?? [],
  };
};

const normalizeTopRuleAggregationResult = (
  topRules: RawData,
  metricModifier?: (value: number) => number
): RuleInfoWithPercentiles[] | undefined => {
  if (!topRules?.rules?.buckets) {
    return undefined;
  }

  return topRules.rules.buckets.map((bucket: RawData) => ({
    ...normalizeRuleInfo(bucket.rule),
    ...normalizeAggregatedMetric(bucket.percentiles, metricModifier),
  }));
};

const normalizeRuleInfo = (ruleBucket: RawData): RuleInfo | undefined => {
  if (
    !ruleBucket?.hits?.hits?.[0]?._source?.rule ||
    typeof ruleBucket.hits.hits[0]._source.rule !== 'object'
  ) {
    return undefined;
  }

  const ruleData = ruleBucket.hits.hits[0]._source.rule;

  return {
    id: ruleData.id,
    name: ruleData.name,
    category: ruleData.category,
  };
};

const normalizeSpacesHistoryOverInterval = (
  aggregations: Record<string, RawData>
): HealthHistory<SpaceHealthStats> => {
  const statsHistory = aggregations.statsHistory || {};

  return {
    buckets: statsHistory.buckets.map((rawBucket: RawData) => {
      const timestamp: string = String(rawBucket.key_as_string);
      const stats = normalizeSpacesExecutionStatsAggregationResult(rawBucket, 'histogram');
      return { timestamp, stats };
    }),
  };
};
