/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { Setup } from '../../../../helpers/setup_request';
import { fetch, CPUMetrics } from './fetcher';
import { ChartBase } from '../../../types';
import { transformDataToMetricsChart } from '../../../transform_metrics_chart';

const chartBase: ChartBase<CPUMetrics> = {
  title: i18n.translate('xpack.apm.serviceDetails.metrics.cpuUsageChartTitle', {
    defaultMessage: 'CPU usage'
  }),
  key: 'cpu_usage_chart',
  type: 'linemark',
  yUnit: 'percent',
  series: {
    systemCPUMax: {
      title: i18n.translate('xpack.apm.chart.cpuSeries.systemMaxLabel', {
        defaultMessage: 'System max'
      }),
      color: theme.euiColorVis1
    },
    systemCPUAverage: {
      title: i18n.translate('xpack.apm.chart.cpuSeries.systemAverageLabel', {
        defaultMessage: 'System average'
      }),
      color: theme.euiColorVis0
    },
    processCPUMax: {
      title: i18n.translate('xpack.apm.chart.cpuSeries.processMaxLabel', {
        defaultMessage: 'Process max'
      }),
      color: theme.euiColorVis7
    },
    processCPUAverage: {
      title: i18n.translate('xpack.apm.chart.cpuSeries.processAverageLabel', {
        defaultMessage: 'Process average'
      }),
      color: theme.euiColorVis5
    }
  }
};

export async function getCPUChartData(setup: Setup, serviceName: string) {
  const result = await fetch(setup, serviceName);
  return transformDataToMetricsChart<CPUMetrics>(result, chartBase);
}
