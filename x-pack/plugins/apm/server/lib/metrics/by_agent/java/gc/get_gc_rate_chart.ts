/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { METRIC_JAVA_GC_COUNT } from '../../../../../../common/elasticsearch_fieldnames';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters,
} from '../../../../helpers/setup_request';
import { fetchAndTransformGcMetrics } from './fetch_and_transform_gc_metrics';
import { ChartBase } from '../../../types';

const series = {
  [METRIC_JAVA_GC_COUNT]: {
    title: i18n.translate('xpack.apm.agentMetrics.java.gcRate', {
      defaultMessage: 'GC rate',
    }),
    color: theme.euiColorVis0,
  },
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.java.gcRateChartTitle', {
    defaultMessage: 'Garbage collection per minute',
  }),
  key: 'gc_rate_line_chart',
  type: 'linemark',
  yUnit: 'integer',
  series,
};

const getGcRateChart = (
  setup: Setup & SetupTimeRange & SetupUIFilters,
  serviceName: string,
  serviceNodeName?: string
) => {
  return fetchAndTransformGcMetrics({
    setup,
    serviceName,
    serviceNodeName,
    chartBase,
    fieldName: METRIC_JAVA_GC_COUNT,
  });
};

export { getGcRateChart };
