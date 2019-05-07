/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Setup } from '../../../../helpers/setup_request';
import { fetch, MemoryMetrics } from './fetcher';
import { ChartBase } from '../../../types';
import { transformDataToMetricsChart } from '../../../transform_metrics_chart';

const chartBase: ChartBase<MemoryMetrics> = {
  title: i18n.translate(
    'xpack.apm.serviceDetails.metrics.memoryUsageChartTitle',
    {
      defaultMessage: 'Memory usage'
    }
  ),
  key: 'memory_usage_chart',
  type: 'linemark',
  yUnit: 'percent',
  series: {
    memoryUsedMax: {
      title: i18n.translate('xpack.apm.chart.memorySeries.systemMaxLabel', {
        defaultMessage: 'System max'
      })
    },
    memoryUsedAvg: {
      title: i18n.translate('xpack.apm.chart.memorySeries.systemAverageLabel', {
        defaultMessage: 'System average'
      })
    }
  }
};

export async function getMemoryChartData(setup: Setup, serviceName: string) {
  const result = await fetch(setup, serviceName);
  return transformDataToMetricsChart<MemoryMetrics>(result, chartBase);
}
