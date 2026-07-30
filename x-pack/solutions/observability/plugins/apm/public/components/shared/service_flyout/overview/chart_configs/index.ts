/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import type { ServiceSchemaType } from '@kbn/apm-types';
import type { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import {
  APM_ERROR_RATE_TITLE,
  buildApmErrorRateQuery,
  buildApmLatencyQuery,
  buildApmThroughputQuery,
  getCpuUsageChart,
  getMemoryUsageChart,
} from './apm';
import {
  OTEL_ERROR_RATE_TITLE,
  buildOtelErrorRateQuery,
  buildOtelLatencyQuery,
  buildOtelThroughputQuery,
} from './otel';
import {
  getErrorRateChart,
  getLatencyChart,
  getLatencyChartType,
  getThroughputChart,
} from './shared';
import type { EcsServiceScope, FlyoutLensChartConfigDefinition, ServiceScope } from './shared';

export { getLatencyChartType };

export function getChartDefinitions({
  indices,
  schema,
  serviceName,
  environment,
  transactionType,
  latencyAggregationType,
  latencyTitleAction,
}: {
  indices: APMIndices | undefined;
  schema: ServiceSchemaType | undefined;
  serviceName: string;
  environment: string;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
  latencyTitleAction?: ReactNode;
}): {
  keyMetrics: FlyoutLensChartConfigDefinition[];
  infrastructureMetrics: FlyoutLensChartConfigDefinition[];
} {
  const transactionIndexes = indices?.transaction;
  const otelIndexes = [indices?.transaction, indices?.span].filter(Boolean).join(',') || undefined;
  const metricIndexes = indices?.metric;
  const ecsScope: EcsServiceScope = { serviceName, environment, transactionType };
  const otelScope: ServiceScope = { serviceName, environment };
  const metricScope: ServiceScope = { serviceName, environment };
  const isOtel = schema === 'otel';
  const indexes = isOtel ? otelIndexes : transactionIndexes;

  return {
    keyMetrics: [
      getLatencyChart({
        indexes,
        latencyAggregationType,
        titleAction: latencyTitleAction,
        buildQuery: isOtel
          ? (idx, agg) => buildOtelLatencyQuery(idx, otelScope, agg)
          : (idx, agg) => buildApmLatencyQuery(idx, ecsScope, agg),
      }),
      getErrorRateChart({
        indexes,
        title: isOtel ? OTEL_ERROR_RATE_TITLE : APM_ERROR_RATE_TITLE,
        buildQuery: isOtel
          ? (idx) => buildOtelErrorRateQuery(idx, otelScope)
          : (idx) => buildApmErrorRateQuery(idx, ecsScope),
      }),
      getThroughputChart({
        indexes,
        buildQuery: isOtel
          ? (idx) => buildOtelThroughputQuery(idx, otelScope)
          : (idx) => buildApmThroughputQuery(idx, ecsScope),
      }),
    ],
    infrastructureMetrics: [
      getCpuUsageChart(metricIndexes, metricScope),
      getMemoryUsageChart(metricIndexes, metricScope),
    ],
  };
}
