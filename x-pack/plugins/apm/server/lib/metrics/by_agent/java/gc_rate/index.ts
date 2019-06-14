/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { Setup } from '../../../../helpers/setup_request';
import { fetch, GcRateMetrics } from './fetcher';
import { ChartBase } from '../../../types';
import { transformJavaGcDataToMetricsChart } from '../../../transform_metrics_chart';
const chartBase: ChartBase<GcRateMetrics> = {
  title: i18n.translate('xpack.apm.agentMetrics.java.gcRateChartTitle', {
    defaultMessage: 'Garbage collection activity'
  }),
  key: 'gc_rate_line_chart',
  type: 'linemark',
  yUnit: 'integer',
  series: {
    gcCountAll: {
      title: i18n.translate('xpack.apm.agentMetrics.java.gcCountAll', {
        defaultMessage: 'GC cycles'
      }),
      color: theme.euiColorVis0
    }
  }
};

export async function getGCRateChartData(setup: Setup, serviceName: string) {
  const result = await fetch(setup, serviceName);
  return transformJavaGcDataToMetricsChart<GcRateMetrics>(result, chartBase);
}
