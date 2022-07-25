/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonCorrelationsQueryParams } from '../../../common/correlations/types';
import { LatencyDistributionChartType } from '../../../common/latency_distribution_chart_types';
import { Setup } from '../../lib/helpers/setup_request';
import { fetchDurationPercentiles } from '../correlations/queries/fetch_duration_percentiles';

export async function getPercentileThresholdValue({
  setup,
  chartType,
  start,
  end,
  environment,
  kuery,
  query,
  percentileThreshold,
  searchMetrics,
}: CommonCorrelationsQueryParams & {
  setup: Setup;
  chartType: LatencyDistributionChartType;
  percentileThreshold: number;
  searchMetrics: boolean;
}) {
  const durationPercentiles = await fetchDurationPercentiles({
    setup,
    chartType,
    start,
    end,
    environment,
    kuery,
    query,
    searchMetrics,
  });

  return durationPercentiles.percentiles[`${percentileThreshold}.0`];
}
