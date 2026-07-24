/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
import type { ServiceFlyoutIngestionType } from '../../service_flyout_context';
import type { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import {
  getCpuUsageChart,
  getFailedTransactionRateChart,
  getLatencyChart,
  getMemoryUsageChart,
  getThroughputChart,
} from './apm';
import {
  getOtelFailedTransactionRateChart,
  getOtelLatencyChart,
  getOtelThroughputChart,
} from './otel';
import type { FlyoutLensChartConfigDefinition, ServiceScope } from './shared';

export { getLatencyChartType } from './shared';

export function getChartDefinitions({
  indices,
  ingestionType,
  serviceName,
  environment,
  transactionType,
  latencyAggregationType,
  latencyTitleAction,
}: {
  indices: APMIndices | undefined;
  ingestionType: ServiceFlyoutIngestionType | undefined;
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
  const scope: ServiceScope = { serviceName, environment, transactionType };
  const metricScope: ServiceScope = { serviceName, environment };
  const isOtel = ingestionType === 'unprocessedOtel';

  return {
    keyMetrics: [
      isOtel
        ? getOtelLatencyChart(otelIndexes, scope, latencyAggregationType, latencyTitleAction)
        : getLatencyChart(transactionIndexes, scope, latencyAggregationType, latencyTitleAction),
      isOtel
        ? getOtelThroughputChart(otelIndexes, scope)
        : getThroughputChart(transactionIndexes, scope),
      isOtel
        ? getOtelFailedTransactionRateChart(otelIndexes, scope)
        : getFailedTransactionRateChart(transactionIndexes, scope),
    ],
    infrastructureMetrics: [
      getCpuUsageChart(metricIndexes, metricScope),
      getMemoryUsageChart(metricIndexes, metricScope),
    ],
  };
}
