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
  METRIC_OTEL_JVM_PROCESS_MEMORY_USAGE,
  METRIC_OTEL_JVM_PROCESS_MEMORY_COMMITTED,
  METRIC_OTEL_JVM_PROCESS_MEMORY_LIMIT,
  VALUE_OTEL_JVM_MEMORY_TYPE_NON_HEAP,
  LABEL_TYPE,
  AGENT_NAME,
} from '../../../../../../common/es_fields/apm';
import type { ChartBase } from '../../../types';
import { fetchAndTransformMetrics } from '../../../fetch_and_transform_metrics';
import { JAVA_AGENT_NAMES } from '../../../../../../common/agent_name';
import type { APMConfig } from '../../../../..';
import type { APMEventClient } from '../../../../../lib/helpers/create_es_client/create_apm_event_client';

const series = {
  nonHeapMemoryUsed: {
    title: i18n.translate('xpack.apm.agentMetrics.java.nonHeapMemorySeriesUsed', {
      defaultMessage: 'Avg. used',
    }),
    color: theme.euiColorVis0,
  },
  nonHeapMemoryCommitted: {
    title: i18n.translate('xpack.apm.agentMetrics.java.nonHeapMemorySeriesCommitted', {
      defaultMessage: 'Avg. committed',
    }),
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
    : METRIC_JAVA_NON_HEAP_MEMORY_MAX;

  const committedMemoryField = isOpenTelemetry
    ? METRIC_OTEL_JVM_PROCESS_MEMORY_COMMITTED
    : METRIC_JAVA_NON_HEAP_MEMORY_COMMITTED;

  const usedMemoryField = isOpenTelemetry
    ? METRIC_OTEL_JVM_PROCESS_MEMORY_USAGE
    : METRIC_JAVA_NON_HEAP_MEMORY_USED;

  const additionalFilters = isOpenTelemetry
    ? [
        { terms: { [AGENT_NAME]: JAVA_AGENT_NAMES } },
        { term: { [LABEL_TYPE]: VALUE_OTEL_JVM_MEMORY_TYPE_NON_HEAP } },
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
      nonHeapMemoryMax: { avg: { field: maxMemoryField } },
      nonHeapMemoryCommitted: {
        avg: { field: committedMemoryField },
      },
      nonHeapMemoryUsed: {
        avg: { field: usedMemoryField },
      },
    },
    additionalFilters,
    operationName: 'get_non_heap_memory_charts',
  });
}
