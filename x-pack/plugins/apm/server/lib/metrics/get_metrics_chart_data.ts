/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getMemoryChartData,
  MemoryChartAPIResponse
} from './get_memory_chart_data';
import { MetricsRequestArgs } from './get_metrics_request_args';

export interface MetricsChartAPIResponse {
  memory: MemoryChartAPIResponse;
}

export async function getMetricsChartData(args: MetricsRequestArgs) {
  const memoryChartData = await getMemoryChartData(args);
  const result: MetricsChartAPIResponse = {
    memory: memoryChartData
  };

  return result;
}
