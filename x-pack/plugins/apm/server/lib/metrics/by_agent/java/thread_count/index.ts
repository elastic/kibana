/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { Setup } from '../../../../helpers/setup_request';
import { fetch, ThreadCountMetrics } from './fetcher';
import { ChartBase } from '../../../types';
import { transformDataToMetricsChart } from '../../../transform_metrics_chart';

const chartBase: ChartBase<ThreadCountMetrics> = {
  title: i18n.translate('xpack.apm.agentMetrics.java.threadCountChartTitle', {
    defaultMessage: 'Thread Count'
  }),
  key: 'thread_count_line_chart',
  type: 'linemark',
  yUnit: 'number',
  series: {
    threadCount: {
      title: i18n.translate('xpack.apm.agentMetrics.java.threadCount', {
        defaultMessage: 'Avg. count'
      }),
      color: theme.euiColorVis0
    },
    threadCountMax: {
      title: i18n.translate('xpack.apm.agentMetrics.java.threadCountMax', {
        defaultMessage: 'Max count'
      }),
      color: theme.euiColorVis1
    }
  }
};

export async function getThreadCountChart(setup: Setup, serviceName: string) {
  const result = await fetch(setup, serviceName);
  return transformDataToMetricsChart<ThreadCountMetrics>(result, chartBase);
}
