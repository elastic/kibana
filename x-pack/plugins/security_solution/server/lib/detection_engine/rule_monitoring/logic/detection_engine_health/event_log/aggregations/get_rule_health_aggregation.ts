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

export const getRuleHealthAggregation = (
  granularity: HealthIntervalGranularity
): Record<string, estypes.AggregationsAggregationContainer> => {
  // Let's say we want to calculate rule execution statistics over some date interval, where:
  //   - the whole interval is one week (7 days)
  //   - the interval's granularity is one day
  // This means we will be calculating the same rule execution stats:
  //   - One time over the whole week.
  //   - Seven times over a day, per each day in the week.
  return {
    // And so this function creates several aggs that will be calculated for the whole interval.
    ...getRuleExecutionStatsAggregation('whole-interval'),
    // And this one creates a histogram, where for each bucket we will calculate the same aggs.
    // The histogram's "calendar_interval" is equal to the granularity parameter.
    ...getRuleExecutionStatsHistoryAggregation(granularity),
  };
};

const getRuleExecutionStatsHistoryAggregation = (
  granularity: HealthIntervalGranularity
): Record<string, estypes.AggregationsAggregationContainer> => {
  return {
    statsHistory: {
      date_histogram: {
        field: f.TIMESTAMP,
        calendar_interval: granularity,
      },
      aggs: getRuleExecutionStatsAggregation('histogram'),
    },
  };
};
