/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { withApmSpan } from '../../../../../utils/with_apm_span';
import { METRIC_JAVA_GC_TIME } from '../../../../../../common/elasticsearch_fieldnames';
import { Setup, SetupTimeRange } from '../../../../helpers/setup_request';
import { fetchAndTransformGcMetrics } from './fetch_and_transform_gc_metrics';
import { ChartBase } from '../../../types';

const series = {
  [METRIC_JAVA_GC_TIME]: {
    title: i18n.translate('xpack.apm.agentMetrics.java.gcTime', {
      defaultMessage: 'GC time',
    }),
    color: theme.euiColorVis0,
  },
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.java.gcTimeChartTitle', {
    defaultMessage: 'Garbage collection time spent per minute',
  }),
  key: 'gc_time_line_chart',
  type: 'linemark',
  yUnit: 'time',
  series,
};

function getGcTimeChart({
  environment,
  setup,
  serviceName,
  serviceNodeName,
}: {
  environment?: string;
  setup: Setup & SetupTimeRange;
  serviceName: string;
  serviceNodeName?: string;
}) {
  return withApmSpan('get_gc_time_charts', () =>
    fetchAndTransformGcMetrics({
      environment,
      setup,
      serviceName,
      serviceNodeName,
      chartBase,
      fieldName: METRIC_JAVA_GC_TIME,
    })
  );
}

export { getGcTimeChart };
