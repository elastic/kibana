/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import type { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import { getCpuUsageChart, getMemoryUsageChart } from './apm';
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
import type { FlyoutLensChartConfigDefinition, ServiceScope } from './shared';

export { getLatencyChartType };

// ES|QL/Lens charts over raw OTel spans. Only used for `otel` schema services:
// the APM chart APIs cannot see unprocessed OTel documents (no `processor.event`,
// no `transaction.*` fields), so ECS services render the shared APM chart
// components instead (see ../apm_charts.tsx).
export function getOtelKeyMetricCharts({
  indices,
  serviceName,
  environment,
  latencyAggregationType,
  latencyTitleAction,
  projectRouting,
}: {
  indices: APMIndices | undefined;
  serviceName: string;
  environment: string;
  latencyAggregationType: LatencyAggregationType;
  latencyTitleAction?: ReactNode;
  projectRouting?: string;
}): FlyoutLensChartConfigDefinition[] {
  const otelIndexes = [indices?.transaction, indices?.span].filter(Boolean).join(',') || undefined;
  const otelScope: ServiceScope = { serviceName, environment };

  return [
    getLatencyChart({
      indices: otelIndexes,
      latencyAggregationType,
      titleAction: latencyTitleAction,
      buildQuery: (idx, agg) => buildOtelLatencyQuery(idx, otelScope, agg),
      projectRouting,
    }),
    getErrorRateChart({
      indices: otelIndexes,
      title: OTEL_ERROR_RATE_TITLE,
      buildQuery: (idx) => buildOtelErrorRateQuery(idx, otelScope),
      projectRouting,
    }),
    getThroughputChart({
      indices: otelIndexes,
      buildQuery: (idx) => buildOtelThroughputQuery(idx, otelScope),
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
