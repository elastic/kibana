/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars as theme } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import {
  METRIC_JAVA_NON_HEAP_MEMORY_MAX,
  METRIC_JAVA_NON_HEAP_MEMORY_COMMITTED,
  METRIC_JAVA_NON_HEAP_MEMORY_USED,
  AGENT_NAME,
} from '../../../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../../../../lib/helpers/setup_request';
import { ChartBase } from '../../../types';
import { fetchAndTransformMetrics } from '../../../fetch_and_transform_metrics';
import { JAVA_AGENT_NAMES } from '../../../../../../common/agent_name';

const series = {
  nonHeapMemoryUsed: {
    title: i18n.translate(
      'xpack.apm.agentMetrics.java.nonHeapMemorySeriesUsed',
      {
        defaultMessage: 'Avg. used',
      }
    ),
    color: theme.euiColorVis0,
  },
  nonHeapMemoryCommitted: {
    title: i18n.translate(
      'xpack.apm.agentMetrics.java.nonHeapMemorySeriesCommitted',
      {
        defaultMessage: 'Avg. committed',
      }
    ),
    color: theme.euiColorVis1,
  },
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.java.nonHeapMemoryChartTitle', {
    defaultMessage: 'Non-Heap Memory',
  }),
  key: 'non_heap_memory_area_chart',
  type: 'area',
  yUnit: 'bytes',
  series,
};

export async function getNonHeapMemoryChart({
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
      nonHeapMemoryMax: { avg: { field: METRIC_JAVA_NON_HEAP_MEMORY_MAX } },
      nonHeapMemoryCommitted: {
        avg: { field: METRIC_JAVA_NON_HEAP_MEMORY_COMMITTED },
      },
      nonHeapMemoryUsed: {
        avg: { field: METRIC_JAVA_NON_HEAP_MEMORY_USED },
      },
    },
    additionalFilters: [{ terms: { [AGENT_NAME]: JAVA_AGENT_NAMES } }],
    operationName: 'get_non_heap_memory_charts',
  });
}
