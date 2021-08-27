/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { i18n } from '@kbn/i18n';
import { JAVA_AGENT_NAMES } from '../../../../../../common/agent_name';
import {
  AGENT_NAME,
  METRIC_JAVA_THREAD_COUNT,
} from '../../../../../../common/elasticsearch_fieldnames';
import type { Setup, SetupTimeRange } from '../../../../helpers/setup_request';
import { fetchAndTransformMetrics } from '../../../fetch_and_transform_metrics';
import type { ChartBase } from '../../../types';

const series = {
  threadCount: {
    title: i18n.translate('xpack.apm.agentMetrics.java.threadCount', {
      defaultMessage: 'Avg. count',
    }),
    color: theme.euiColorVis0,
  },
  threadCountMax: {
    title: i18n.translate('xpack.apm.agentMetrics.java.threadCountMax', {
      defaultMessage: 'Max count',
    }),
    color: theme.euiColorVis1,
  },
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.java.threadCountChartTitle', {
    defaultMessage: 'Thread Count',
  }),
  key: 'thread_count_line_chart',
  type: 'linemark',
  yUnit: 'number',
  series,
};

export async function getThreadCountChart({
  environment,
  kuery,
  setup,
  serviceName,
  serviceNodeName,
}: {
  environment: string;
  kuery: string;
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
      threadCount: { avg: { field: METRIC_JAVA_THREAD_COUNT } },
      threadCountMax: { max: { field: METRIC_JAVA_THREAD_COUNT } },
    },
    additionalFilters: [{ terms: { [AGENT_NAME]: JAVA_AGENT_NAMES } }],
    operationName: 'get_thread_count_charts',
  });
}
