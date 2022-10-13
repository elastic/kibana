/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars as theme } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import {
  METRIC_JAVA_THREAD_COUNT,
  AGENT_NAME,
} from '../../../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../../../../lib/helpers/setup_request';
import { ChartBase } from '../../../types';
import { fetchAndTransformMetrics } from '../../../fetch_and_transform_metrics';
import { JAVA_AGENT_NAMES } from '../../../../../../common/agent_name';

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
  start,
  end,
}: {
  environment: string;
  kuery: string;
  setup: Setup;
  serviceName: string;
  serviceNodeName?: string;
  start: number;
  end: number;
}) {
  return fetchAndTransformMetrics({
    environment,
    kuery,
    setup,
    serviceName,
    serviceNodeName,
    start,
    end,
    chartBase,
    aggs: {
      threadCount: { avg: { field: METRIC_JAVA_THREAD_COUNT } },
      threadCountMax: { max: { field: METRIC_JAVA_THREAD_COUNT } },
    },
    additionalFilters: [{ terms: { [AGENT_NAME]: JAVA_AGENT_NAMES } }],
    operationName: 'get_thread_count_charts',
  });
}
