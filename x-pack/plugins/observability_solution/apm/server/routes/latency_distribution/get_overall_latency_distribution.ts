/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Environment } from '../../../common/environment_rt';
import { withApmSpan } from '../../utils/with_apm_span';
import { fetchDurationRanges } from '../correlations/queries/fetch_duration_ranges';
import { fetchDurationHistogramRangeSteps } from '../correlations/queries/fetch_duration_histogram_range_steps';
import { getPercentileThresholdValue } from './get_percentile_threshold_value';
import type { OverallLatencyDistributionResponse } from './types';
import { LatencyDistributionChartType } from '../../../common/latency_distribution_chart_types';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

export async function getOverallLatencyDistribution({
  chartType,
  apmEventClient,
  start,
  end,
  environment,
  kuery,
  query,
  percentileThreshold,
  durationMinOverride,
  durationMaxOverride,
  searchMetrics,
}: {
  chartType: LatencyDistributionChartType;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
  environment: Environment;
  kuery: string;
  query: estypes.QueryDslQueryContainer;
  percentileThreshold: number;
  durationMinOverride?: number;
  durationMaxOverride?: number;
  searchMetrics: boolean;
}) {
  return withApmSpan('get_overall_latency_distribution', async () => {
    const overallLatencyDistribution: OverallLatencyDistributionResponse = {};

    // #1: get 95th percentile to be displayed as a marker in the log log chart
    overallLatencyDistribution.percentileThresholdValue = await getPercentileThresholdValue({
      chartType,
      apmEventClient,
      start,
      end,
      environment,
      kuery,
      query,
      percentileThreshold,
      searchMetrics,
    });

    // finish early if we weren't able to identify the percentileThresholdValue.
    if (!overallLatencyDistribution.percentileThresholdValue) {
      return overallLatencyDistribution;
    }

    // #2: get histogram range steps
    const { durationMin, durationMax, rangeSteps } = await fetchDurationHistogramRangeSteps({
      chartType,
      apmEventClient,
      start,
      end,
      environment,
      kuery,
      query,
      searchMetrics,
      durationMinOverride,
      durationMaxOverride,
    });

    if (!rangeSteps) {
      return overallLatencyDistribution;
    }

    // #3: get histogram chart data
    const { totalDocCount, durationRanges } = await fetchDurationRanges({
      chartType,
      apmEventClient,
      start,
      end,
      environment,
      kuery,
      query,
      rangeSteps,
      searchMetrics,
    });

    overallLatencyDistribution.durationMin = durationMin;
    overallLatencyDistribution.durationMax = durationMax;
    overallLatencyDistribution.totalDocCount = totalDocCount;
    overallLatencyDistribution.overallHistogram = durationRanges;

    return overallLatencyDistribution;
  });
}
