/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { Setup } from '../../../../helpers/setup_request';
import { fetch, NonHeapMemoryMetrics } from './fetcher';
import { ChartBase } from '../../../types';
import { transformDataToMetricsChart } from '../../../transform_metrics_chart';

const chartBase: ChartBase<NonHeapMemoryMetrics> = {
  title: i18n.translate('xpack.apm.agentMetrics.java.nonHeapMemoryChartTitle', {
    defaultMessage: 'Non-Heap Memory'
  }),
  key: 'non_heap_memory_area_chart',
  type: 'area',
  yUnit: 'bytes',
  series: {
    nonHeapMemoryUsed: {
      title: i18n.translate(
        'xpack.apm.agentMetrics.java.nonHeapMemorySeriesUsed',
        {
          defaultMessage: 'Used'
        }
      ),
      color: theme.euiColorVis0
    },
    nonHeapMemoryCommitted: {
      title: i18n.translate(
        'xpack.apm.agentMetrics.java.nonHeapMemorySeriesCommitted',
        {
          defaultMessage: 'Committed'
        }
      ),
      color: theme.euiColorVis1
    }
  }
};

export async function getNonHeapMemoryChart(setup: Setup, serviceName: string) {
  const result = await fetch(setup, serviceName);
  return transformDataToMetricsChart<NonHeapMemoryMetrics>(result, chartBase);
}
