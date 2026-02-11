/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { euiLightVars as theme } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import {
  METRIC_JAVA_HEAP_MEMORY_MAX,
  METRIC_JAVA_HEAP_MEMORY_COMMITTED,
  METRIC_JAVA_HEAP_MEMORY_USED,
  METRIC_OTEL_JVM_PROCESS_MEMORY_USAGE,
  METRIC_OTEL_JVM_PROCESS_MEMORY_COMMITTED,
  METRIC_OTEL_JVM_PROCESS_MEMORY_LIMIT,
  VALUE_OTEL_JVM_MEMORY_TYPE_HEAP,
  LABEL_TYPE,
  AGENT_NAME,
} from '../../../../../../common/es_fields/apm';
import { fetchAndTransformMetrics } from '../../../fetch_and_transform_metrics';
import type { ChartBase } from '../../../types';
import { JAVA_AGENT_NAMES } from '../../../../../../common/agent_name';
import type { APMConfig } from '../../../../..';
import type { APMEventClient } from '../../../../../lib/helpers/create_es_client/create_apm_event_client';

const series = {
  heapMemoryUsed: {
    title: i18n.translate('xpack.apm.agentMetrics.java.heapMemorySeriesUsed', {
      defaultMessage: 'Avg. used',
    }),
    color: theme.euiColorVis0,
  },
  heapMemoryCommitted: {
    title: i18n.translate('xpack.apm.agentMetrics.java.heapMemorySeriesCommitted', {
      defaultMessage: 'Avg. committed',
    }),
    color: theme.euiColorVis1,
  },
  heapMemoryMax: {
    title: i18n.translate('xpack.apm.agentMetrics.java.heapMemorySeriesMax', {
      defaultMessage: 'Avg. limit',
    }),
    color: theme.euiColorVis2,
  },
};

const chartBase: ChartBase = {
  title: i18n.translate('xpack.apm.agentMetrics.java.heapMemoryChartTitle', {
    defaultMessage: 'Heap Memory',
  }),
  key: 'heap_memory_area_chart',
  type: 'area',
  yUnit: 'bytes',
  series,
};

export function getHeapMemoryChart({
  environment,
  kuery,
  config,
  apmEventClient,
  serviceName,
  serviceNodeName,
  start,
  end,
  isOpenTelemetry,
}: {
  environment: string;
  kuery: string;
  config: APMConfig;
  apmEventClient: APMEventClient;
  serviceName: string;
  serviceNodeName?: string;
  start: number;
  end: number;
  isOpenTelemetry?: boolean;
}) {
  const maxMemoryField = isOpenTelemetry
    ? METRIC_OTEL_JVM_PROCESS_MEMORY_LIMIT
    : METRIC_JAVA_HEAP_MEMORY_MAX;

  const committedMemoryField = isOpenTelemetry
    ? METRIC_OTEL_JVM_PROCESS_MEMORY_COMMITTED
    : METRIC_JAVA_HEAP_MEMORY_COMMITTED;

  const usedMemoryField = isOpenTelemetry
    ? METRIC_OTEL_JVM_PROCESS_MEMORY_USAGE
    : METRIC_JAVA_HEAP_MEMORY_USED;

  const additionalFilters = isOpenTelemetry
    ? [
        { terms: { [AGENT_NAME]: JAVA_AGENT_NAMES } },
        { term: { [LABEL_TYPE]: VALUE_OTEL_JVM_MEMORY_TYPE_HEAP } },
      ]
    : [{ terms: { [AGENT_NAME]: JAVA_AGENT_NAMES } }];

  return fetchAndTransformMetrics({
    environment,
    kuery,
    config,
    apmEventClient,
    serviceName,
    serviceNodeName,
    start,
    end,
    chartBase,
    aggs: {
      heapMemoryUsed: { avg: { field: usedMemoryField } },
      heapMemoryCommitted: {
        avg: { field: committedMemoryField },
      },
      heapMemoryMax: { avg: { field: maxMemoryField } },
    },
    additionalFilters,
    operationName: 'get_heap_memory_charts',
  });
}
