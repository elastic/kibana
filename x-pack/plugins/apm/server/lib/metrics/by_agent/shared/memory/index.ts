/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../../../helpers/setup_request';
import { fetch, MemoryMetrics } from './fetcher';
import { ChartBase } from '../../../types';
import { transformDataToChart } from '../../../transform_metrics_chart';

const chartBase: ChartBase<MemoryMetrics> = {
  title: 'Memory usage',
  key: 'memory_usage_chart',
  type: 'linemark',
  yUnit: 'percent',
  series: {
    memoryUsedMax: { title: 'System max' },
    memoryUsedAvg: { title: 'System average' }
  }
};

export async function getMemoryChartData(setup: Setup, serviceName: string) {
  const result = await fetch(setup, serviceName);
  return transformDataToChart<MemoryMetrics>(result, chartBase);
}
