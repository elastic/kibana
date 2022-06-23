/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Environment } from '../../../common/environment_rt';

import { ProcessorEvent } from '../../../common/processor_event';
import { Setup } from '../../lib/helpers/setup_request';

import { withApmSpan } from '../../utils/with_apm_span';

import { fetchDurationRanges } from '../correlations/queries/fetch_duration_ranges';
import { fetchDurationHistogramRangeSteps } from '../correlations/queries/fetch_duration_histogram_range_steps';

import { getPercentileThresholdValue } from './get_percentile_threshold_value';
import type { OverallLatencyDistributionResponse } from './types';

export async function getOverallLatencyDistribution({
  eventType,
  setup,
  start,
  end,
  environment,
  kuery,
  query,
  percentileThreshold,
}: {
  eventType: ProcessorEvent;
  setup: Setup;
  start: number;
  end: number;
  environment: Environment;
  kuery: string;
  query: estypes.QueryDslQueryContainer;
  percentileThreshold: number;
}) {
  return withApmSpan('get_overall_latency_distribution', async () => {
    const overallLatencyDistribution: OverallLatencyDistributionResponse = {};

    // #1: get 95th percentile to be displayed as a marker in the log log chart
    overallLatencyDistribution.percentileThresholdValue =
      await getPercentileThresholdValue({
        eventType,
        setup,
        start,
        end,
        environment,
        kuery,
        query,
        percentileThreshold,
      });

    // finish early if we weren't able to identify the percentileThresholdValue.
    if (!overallLatencyDistribution.percentileThresholdValue) {
      return overallLatencyDistribution;
    }

    // #2: get histogram range steps
    const rangeSteps = await fetchDurationHistogramRangeSteps({
      eventType,
      setup,
      start,
      end,
      environment,
      kuery,
      query,
    });

    if (!rangeSteps) {
      return overallLatencyDistribution;
    }

    // #3: get histogram chart data

    const durationRanges = await fetchDurationRanges({
      eventType,
      setup,
      start,
      end,
      environment,
      kuery,
      query,
      rangeSteps,
    });

    overallLatencyDistribution.overallHistogram = durationRanges;

    return overallLatencyDistribution;
  });
}
