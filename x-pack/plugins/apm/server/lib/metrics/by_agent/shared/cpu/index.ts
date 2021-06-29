/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import {
  METRIC_SYSTEM_CPU_PERCENT,
  METRIC_PROCESS_CPU_PERCENT,
} from '../../../../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../../../../helpers/setup_request';
import { ChartBase } from '../../../types';
import { fetchAndTransformMetrics } from '../../../fetch_and_transform_metrics';

const series = {
  systemCPUMax: {
    title: i18n.translate('xpack.apm.chart.cpuSeries.systemMaxLabel', {
      defaultMessage: 'System max',
    }),
    color: theme.euiColorVis1,
  },
  systemCPUAverage: {
    title: i18n.translate('xpack.apm.chart.cpuSeries.systemAverageLabel', {
      defaultMessage: 'System average',
    }),
    color: theme.euiColorVis0,
  },
  processCPUMax: {
    title: i18n.translate('xpack.apm.chart.cpuSeries.processMaxLabel', {
      defaultMessage: 'Process max',
    }),
    color: theme.euiColorVis7,
  },
  processCPUAverage: {
    title: i18n.translate('xpack.apm.chart.cpuSeries.processAverageLabel', {
      defaultMessage: 'Process average',
    }),
    color: theme.euiColorVis5,
  },
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.serviceDetails.metrics.cpuUsageChartTitle', {
    defaultMessage: 'CPU usage',
  }),
  key: 'cpu_usage_chart',
  type: 'linemark',
  yUnit: 'percent',
  series,
};

export function getCPUChartData({
  environment,
  kuery,
  setup,
  serviceName,
  serviceNodeName,
}: {
  environment?: string;
  kuery?: string;
  setup: Setup & SetupTimeRange;
  serviceName: string;
  serviceNodeName?: string;
}) {
  return fetchAndTransformMetrics({
    environment,
    kuery,
    setup,
    serviceName,
    serviceNodeName,
    chartBase,
    aggs: {
      systemCPUAverage: { avg: { field: METRIC_SYSTEM_CPU_PERCENT } },
      systemCPUMax: { max: { field: METRIC_SYSTEM_CPU_PERCENT } },
      processCPUAverage: { avg: { field: METRIC_PROCESS_CPU_PERCENT } },
      processCPUMax: { max: { field: METRIC_PROCESS_CPU_PERCENT } },
    },
    operationName: 'get_cpu_metric_charts',
  });
}
