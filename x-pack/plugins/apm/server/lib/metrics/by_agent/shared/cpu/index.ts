/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../../../helpers/setup_request';
import { fetch, CPUMetrics } from './fetcher';
import { ChartBase } from '../../../query_types';
import { transformDataToChart } from '../../../transform_metrics_chart';

const chartBase: ChartBase<CPUMetrics> = {
  title: 'CPU usage',
  key: 'cpu_usage_chart',
  type: 'linemark',
  yUnit: 'percent',
  series: {
    systemCPUAverage: 'System average',
    systemCPUMax: 'System max',
    processCPUAverage: 'Process average',
    processCPUMax: 'Process max'
  }
};

export async function getCPUChartData(setup: Setup, serviceName: string) {
  const result = await fetch(setup, serviceName);
  return transformDataToChart<CPUMetrics>(result, chartBase);
}
