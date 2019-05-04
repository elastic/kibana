/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { Setup } from '../../../../helpers/setup_request';
import { fetch, CPUMetrics } from './fetcher';
import { ChartBase } from '../../../types';
import { transformDataToChart } from '../../../transform_metrics_chart';

const chartBase: ChartBase<CPUMetrics> = {
  title: 'CPU usage',
  key: 'cpu_usage_chart',
  type: 'linemark',
  yUnit: 'percent',
  series: {
    systemCPUMax: {
      title: 'System max',
      color: theme.euiColorVis1
    },
    systemCPUAverage: {
      title: 'System average',
      color: theme.euiColorVis0
    },
    processCPUMax: {
      title: 'Process max',
      color: theme.euiColorVis7
    },
    processCPUAverage: {
      title: 'Process average',
      color: theme.euiColorVis5
    }
  }
};

export async function getCPUChartData(setup: Setup, serviceName: string) {
  const result = await fetch(setup, serviceName);
  return transformDataToChart<CPUMetrics>(result, chartBase);
}
