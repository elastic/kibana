/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { HealthIntervalGranularity } from '../../../../../../../../common/api/detection_engine/rule_monitoring';
import * as f from '../../../event_log/event_log_fields';
import { getRuleExecutionStatsAggregation } from './get_rule_execution_stats_aggregation';
import { getTopRulesByMetricsAggregation } from './get_top_rules_by_metrics_aggregation';

export const getSpacesHealthAggregation = (
  granularity: HealthIntervalGranularity,
  numOfTopRules: number
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    ...getRuleExecutionStatsAggregation('whole-interval'),
    ...getTopRulesByMetricsAggregation(numOfTopRules),
    ...getRulesExecutionStatsHistoryAggregation(granularity, numOfTopRules),
  };
};

const getRulesExecutionStatsHistoryAggregation = (
  granularity: HealthIntervalGranularity,
  numOfTopRules: number
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    statsHistory: {
      date_histogram: {
        field: f.TIMESTAMP,
        calendar_interval: granularity,
      },
      aggs: {
        ...getRuleExecutionStatsAggregation('histogram'),
        ...getTopRulesByMetricsAggregation(numOfTopRules),
      },
    },
  };
};
