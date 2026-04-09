/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CommonCorrelationsQueryParams, EntityType } from '../../../common/correlations/types';
import type { LatencyDistributionChartType } from '../../../common/latency_distribution_chart_types';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { fetchDurationPercentiles } from '../correlations/queries/fetch_duration_percentiles';

export async function getPercentileThresholdValue({
  apmEventClient,
  chartType,
  entityType,
  start,
  end,
  environment,
  kuery,
  query,
  percentileThreshold,
  searchMetrics,
  isOtel,
}: CommonCorrelationsQueryParams & {
  apmEventClient: APMEventClient;
  chartType?: LatencyDistributionChartType;
  entityType?: EntityType;
  percentileThreshold: number;
  searchMetrics?: boolean;
  isOtel?: boolean;
}) {
  const durationPercentiles = await fetchDurationPercentiles({
    apmEventClient,
    start,
    end,
    environment,
    kuery,
    query,
    isOtel: isOtel ?? false,
    ...(entityType !== undefined
      ? { entityType }
      : { chartType: chartType!, searchMetrics: searchMetrics! }),
  });

  return durationPercentiles.percentiles[`${percentileThreshold}.0`];
}
