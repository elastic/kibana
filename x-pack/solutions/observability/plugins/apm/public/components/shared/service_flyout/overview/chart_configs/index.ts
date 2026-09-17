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

// ES|QL/Lens charts over raw documents. Used for `otel` schema services in every
// host (the APM chart APIs cannot see unprocessed OTel documents — no
// `processor.event`, no `transaction.*` fields) and for ALL services in
// document-based hosts such as Discover, where the surrounding RED metric charts
// are computed from the raw documents and the rollup-based APM chart APIs would
// disagree with them whenever sampling is in play. Other hosts render the shared
// APM chart components instead (see ../apm_charts.tsx).
export function getEsqlKeyMetricCharts({
  indices,
  schema,
  serviceName,
  environment,
  transactionType,
  latencyAggregationType,
  latencyTitleAction,
  projectRouting,
}: {
  indices: APMIndices | undefined;
  schema: ServiceSchemaType | undefined;
  serviceName: string;
  environment: string;
  transactionType: string;
  latencyAggregationType: LatencyAggregationType;
  latencyTitleAction?: ReactNode;
  projectRouting?: string;
}): FlyoutLensChartConfigDefinition[] {
  const transactionIndexes = indices?.transaction;
  const otelIndexes = [indices?.transaction, indices?.span].filter(Boolean).join(',') || undefined;
  const ecsScope: EcsServiceScope = { serviceName, environment, transactionType };
  const otelScope: ServiceScope = { serviceName, environment };
  const isOtel = schema === 'otel';
  const chartIndices = isOtel ? otelIndexes : transactionIndexes;

  return [
    getLatencyChart({
      indices: chartIndices,
      latencyAggregationType,
      titleAction: latencyTitleAction,
      buildQuery: isOtel
        ? (idx, agg) => buildOtelLatencyQuery(idx, otelScope, agg)
        : (idx, agg) => buildApmLatencyQuery(idx, ecsScope, agg),
      projectRouting,
    }),
    getErrorRateChart({
      indices: chartIndices,
      title: isOtel ? OTEL_ERROR_RATE_TITLE : APM_ERROR_RATE_TITLE,
      buildQuery: isOtel
        ? (idx) => buildOtelErrorRateQuery(idx, otelScope)
        : (idx) => buildApmErrorRateQuery(idx, ecsScope),
      projectRouting,
    }),
    getThroughputChart({
      indices: chartIndices,
      buildQuery: isOtel
        ? (idx) => buildOtelThroughputQuery(idx, otelScope)
        : (idx) => buildApmThroughputQuery(idx, ecsScope),
      projectRouting,
    }),
  ];
}

export function getInfrastructureMetricCharts({
  indices,
  serviceName,
  environment,
  projectRouting,
}: {
  indices: APMIndices | undefined;
  serviceName: string;
  environment: string;
  projectRouting?: string;
}): FlyoutLensChartConfigDefinition[] {
  const metricScope: ServiceScope = { serviceName, environment };

  return [
    getCpuUsageChart(indices?.metric, metricScope, projectRouting),
    getMemoryUsageChart(indices?.metric, metricScope, projectRouting),
  ];
}
