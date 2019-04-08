/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../typings/common';
import { getCPUChartData } from './get_cpu_chart_data';
import { getMemoryChartData } from './get_memory_chart_data';
import { MetricsRequestArgs } from './query_types';

export type MetricsChartAPIResponse = PromiseReturnType<
  typeof getAllMetricsChartData
>;
export async function getAllMetricsChartData(args: MetricsRequestArgs) {
  const [memoryChartData, cpuChartData] = await Promise.all([
    getMemoryChartData(args),
    getCPUChartData(args)
  ]);
  return {
    memory: memoryChartData,
    cpu: cpuChartData
  };
}
