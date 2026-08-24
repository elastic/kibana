/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { ComposerQuery } from '@elastic/esql';
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
  ROLLUP_LATENCY_COLUMN,
  buildApmRollupErrorRateQuery,
  buildApmRollupLatencyQuery,
  buildApmRollupThroughputQuery,
  isApmRollupDocumentType,
} from './apm_rollups';
import {
  OTEL_ERROR_RATE_TITLE,
  buildOtelErrorRateQuery,
  buildOtelLatencyQuery,
  buildOtelThroughputQuery,
} from './otel';
import {
  THROUGHPUT_COLUMN,
  THROUGHPUT_SUFFIX,
  getErrorRateChart,
  getLatencyChart,
  getLatencyChartType,
  getThroughputChart,
} from './shared';
import type {
  EcsServiceScope,
  FlyoutChartDataSource,
  FlyoutLensChartConfigDefinition,
  ServiceScope,
} from './shared';

export { getLatencyChartType };

interface EcsQueryBuilders {
  latencyValueColumn?: string;
  usesRollups: boolean;
  buildLatency: (indices: string, aggregation: string) => ComposerQuery;
  buildErrorRate: (indices: string) => ComposerQuery;
  buildThroughput: (indices: string) => ComposerQuery;
}

/**
 * Picks the documents the APM chart APIs would read for the same time range. The rollups only stand
 * in for raw transactions once they carry `transaction.duration.summary`; before that the APIs fall
 * back to raw events as well, so the flyout follows them there.
 */
function getEcsQueryBuilders({
  dataSource,
  scope,
  latencyAggregationType,
}: {
  dataSource: FlyoutChartDataSource;
  scope: EcsServiceScope;
  latencyAggregationType: LatencyAggregationType;
}): EcsQueryBuilders {
  const { documentType, rollupInterval, bucketSizeInSeconds, hasDurationSummaryField } = dataSource;

  if (hasDurationSummaryField && isApmRollupDocumentType(documentType)) {
    const source = { documentType, rollupInterval, bucketSizeInSeconds };
    return {
      latencyValueColumn: ROLLUP_LATENCY_COLUMN,
      usesRollups: true,
      buildLatency: (indices) =>
        buildApmRollupLatencyQuery({ indices, scope, source, latencyAggregationType }),
      buildErrorRate: (indices) => buildApmRollupErrorRateQuery({ indices, scope, source }),
      buildThroughput: (indices) => buildApmRollupThroughputQuery({ indices, scope, source }),
    };
  }

  return {
    usesRollups: false,
    buildLatency: (indices, aggregation) =>
      buildApmLatencyQuery({ indices, scope, aggregation, bucketSizeInSeconds }),
    buildErrorRate: (indices) => buildApmErrorRateQuery({ indices, scope, bucketSizeInSeconds }),
    buildThroughput: (indices) => buildApmThroughputQuery({ indices, scope, bucketSizeInSeconds }),
  };
}

function getEcsKeyMetrics({
  indices,
  scope,
  dataSource,
  isTransactionTypeResolved,
  latencyAggregationType,
  latencyTitleAction,
  projectRouting,
}: {
  indices: APMIndices | undefined;
  scope: EcsServiceScope;
  dataSource: FlyoutChartDataSource | undefined;
  isTransactionTypeResolved: boolean;
  latencyAggregationType: LatencyAggregationType;
  latencyTitleAction?: ReactNode;
  projectRouting?: string;
}): FlyoutLensChartConfigDefinition[] {
  // Leaving out the query keeps the charts in their loading state, which is what we want until the
  // data source and the transaction type are known: querying earlier would plot unfiltered or raw
  // numbers and then swap them for the aggregated ones.
  const builders =
    dataSource && isTransactionTypeResolved
      ? getEcsQueryBuilders({ dataSource, scope, latencyAggregationType })
      : undefined;
  const chartIndices = builders?.usesRollups ? indices?.metric : indices?.transaction;

  return [
    getLatencyChart({
      indices: chartIndices,
      latencyAggregationType,
      titleAction: latencyTitleAction,
      valueColumn: builders?.latencyValueColumn,
      buildQuery: builders && ((idx, aggregation) => builders.buildLatency(idx, aggregation)),
      projectRouting,
    }),
    getErrorRateChart({
      indices: chartIndices,
      title: APM_ERROR_RATE_TITLE,
      buildQuery: builders && ((idx) => builders.buildErrorRate(idx)),
      projectRouting,
    }),
    getThroughputChart({
      indices: chartIndices,
      valueColumn: THROUGHPUT_COLUMN,
      suffix: THROUGHPUT_SUFFIX,
      decimals: 1,
      buildQuery: builders && ((idx) => builders.buildThroughput(idx)),
      projectRouting,
    }),
  ];
}

function getOtelKeyMetrics({
  indices,
  scope,
  latencyAggregationType,
  latencyTitleAction,
  projectRouting,
}: {
  indices: string | undefined;
  scope: ServiceScope;
  latencyAggregationType: LatencyAggregationType;
  latencyTitleAction?: ReactNode;
  projectRouting?: string;
}): FlyoutLensChartConfigDefinition[] {
  return [
    getLatencyChart({
      indices,
      latencyAggregationType,
      titleAction: latencyTitleAction,
      buildQuery: (idx, aggregation) => buildOtelLatencyQuery(idx, scope, aggregation),
      projectRouting,
    }),
    getErrorRateChart({
      indices,
      title: OTEL_ERROR_RATE_TITLE,
      buildQuery: (idx) => buildOtelErrorRateQuery(idx, scope),
      projectRouting,
    }),
    getThroughputChart({
      indices,
      buildQuery: (idx) => buildOtelThroughputQuery(idx, scope),
      projectRouting,
    }),
  ];
}

export function getChartDefinitions({
  indices,
  schema,
  serviceName,
  environment,
  transactionType,
  isTransactionTypeResolved,
  dataSource,
  latencyAggregationType,
  latencyTitleAction,
  projectRouting,
}: {
  indices: APMIndices | undefined;
  schema: ServiceSchemaType | undefined;
  serviceName: string;
  environment: string;
  transactionType: string;
  isTransactionTypeResolved: boolean;
  dataSource: FlyoutChartDataSource | undefined;
  latencyAggregationType: LatencyAggregationType;
  latencyTitleAction?: ReactNode;
  projectRouting?: string;
}): {
  keyMetrics: FlyoutLensChartConfigDefinition[];
  infrastructureMetrics: FlyoutLensChartConfigDefinition[];
} {
  const serviceScope: ServiceScope = { serviceName, environment };
  const isOtel = schema === 'otel';

  return {
    // OTel native services have no APM rollups to read from, so they keep aggregating raw spans.
    keyMetrics: isOtel
      ? getOtelKeyMetrics({
          indices: [indices?.transaction, indices?.span].filter(Boolean).join(',') || undefined,
          scope: serviceScope,
          latencyAggregationType,
          latencyTitleAction,
          projectRouting,
        })
      : getEcsKeyMetrics({
          indices,
          scope: { ...serviceScope, transactionType },
          dataSource,
          isTransactionTypeResolved,
          latencyAggregationType,
          latencyTitleAction,
          projectRouting,
        }),
    infrastructureMetrics: [
      getCpuUsageChart(indices?.metric, serviceScope, projectRouting),
      getMemoryUsageChart(indices?.metric, serviceScope, projectRouting),
    ],
  };
}
