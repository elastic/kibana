/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callApmApi } from './create_call_apm_api';
import { LatencyDistributionChartType } from '../../../common/latency_distribution_chart_types';
import { ENVIRONMENT_ALL_VALUE } from '../../../common/environment_filter_values';
import { DEFAULT_PERCENTILE_THRESHOLD } from '../../../common/correlations/constants';

export const fetchLatencyOverallSpanDistribution = (
  {
    spanName,
    serviceName,
    start,
    end,
    isOtel,
  }: {
    spanName: string;
    serviceName: string;
    start: string;
    end: string;
    isOtel: boolean;
  },
  signal: AbortSignal
) =>
  callApmApi('POST /internal/apm/latency/overall_distribution/spans', {
    params: {
      body: {
        spanName,
        serviceName,
        start,
        end,
        chartType: LatencyDistributionChartType.spanLatency,
        environment: ENVIRONMENT_ALL_VALUE,
        kuery: '',
        percentileThreshold: DEFAULT_PERCENTILE_THRESHOLD,
        isOtel,
      },
    },
    signal,
  });
