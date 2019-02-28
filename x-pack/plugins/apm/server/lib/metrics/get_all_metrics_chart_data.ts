/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CPUChartAPIResponse, getCPUChartData } from './get_cpu_chart_data';
import {
  getMemoryChartData,
  MemoryChartAPIResponse
} from './get_memory_chart_data';
import { MetricsRequestArgs } from './query_types';

export interface MetricsChartAPIResponse {
  memory: MemoryChartAPIResponse;
  cpu: CPUChartAPIResponse;
}

export async function getAllMetricsChartData(
  args: MetricsRequestArgs
): Promise<MetricsChartAPIResponse> {
  const [memoryChartData, cpuChartData] = await Promise.all([
    getMemoryChartData(args),
    getCPUChartData(args)
  ]);
  return {
    memory: memoryChartData,
    cpu: cpuChartData
  };
}
