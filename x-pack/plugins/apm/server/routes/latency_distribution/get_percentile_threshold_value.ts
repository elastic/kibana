/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CommonCorrelationsQueryParams } from '../../../common/correlations/types';
import { LatencyDistributionChartType } from '../../../common/latency_distribution_chart_types';
import { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { fetchDurationPercentiles } from '../correlations/queries/fetch_duration_percentiles';

export async function getPercentileThresholdValue({
  apmEventClient,
  chartType,
  start,
  end,
  environment,
  kuery,
  query,
  percentileThreshold,
  searchMetrics,
}: CommonCorrelationsQueryParams & {
  apmEventClient: APMEventClient;
  chartType: LatencyDistributionChartType;
  percentileThreshold: number;
  searchMetrics: boolean;
}) {
  const durationPercentiles = await fetchDurationPercentiles({
    apmEventClient,
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
