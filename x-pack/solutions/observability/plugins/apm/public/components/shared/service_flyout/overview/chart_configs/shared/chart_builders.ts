/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { ComposerQuery } from '@elastic/esql';
import { i18n } from '@kbn/i18n';
import { LatencyAggregationType } from '../../../../../../../common/latency_aggregation_types';
import { ChartType } from '../../../../charts/helper/get_timeseries_color';
import { buildChartDefinition, seriesColor } from './chart_definition';
import type { FlyoutLensChartConfigDefinition } from './types';

interface LatencyAggregationConfig {
  label: string;
  aggregation: string;
}

export function getLatencyAggregationConfig(
  latencyAggregationType: LatencyAggregationType
): LatencyAggregationConfig {
  switch (latencyAggregationType) {
    case LatencyAggregationType.p95:
      return {
        label: i18n.translate('xpack.apm.serviceFlyout.latency95thSeriesLabel', {
          defaultMessage: '95th percentile',
        }),
        aggregation: 'PERCENTILE(duration_ms, 95)',
      };
    case LatencyAggregationType.p99:
      return {
        label: i18n.translate('xpack.apm.serviceFlyout.latency99thSeriesLabel', {
          defaultMessage: '99th percentile',
        }),
        aggregation: 'PERCENTILE(duration_ms, 99)',
      };
    case LatencyAggregationType.avg:
    default:
      return {
        label: i18n.translate('xpack.apm.serviceFlyout.latencyAverageSeriesLabel', {
          defaultMessage: 'Average latency',
        }),
        aggregation: 'AVG(duration_ms)',
      };
  }
}

export function getLatencyChartType(latencyAggregationType: LatencyAggregationType): ChartType {
  switch (latencyAggregationType) {
    case LatencyAggregationType.p95:
      return ChartType.LATENCY_P95;
    case LatencyAggregationType.p99:
      return ChartType.LATENCY_P99;
    case LatencyAggregationType.avg:
    default:
      return ChartType.LATENCY_AVG;
  }
}

// buildQuery receives the aggregation expression so the STATS column name matches
// the yAxis value without the caller having to compute it twice. Builders that cannot aggregate the
// raw field directly, such as the rollup ones, name their output column and pass it as valueColumn.
export function getLatencyChart({
  indices,
  buildQuery,
  latencyAggregationType,
  valueColumn,
  titleAction,
  projectRouting,
}: {
  indices: string | undefined;
  buildQuery?: (indices: string, aggregation: string) => ComposerQuery;
  latencyAggregationType: LatencyAggregationType;
  valueColumn?: string;
  titleAction?: ReactNode;
  projectRouting?: string;
}): FlyoutLensChartConfigDefinition {
  const { label, aggregation } = getLatencyAggregationConfig(latencyAggregationType);

  return buildChartDefinition({
    id: 'latency',
    title: i18n.translate('xpack.apm.serviceFlyout.latencyChartTitle', {
      defaultMessage: 'Latency',
    }),
    titleAction,
    indices,
    buildQuery: buildQuery && ((idx: string) => buildQuery(idx, aggregation)),
    projectRouting,
    yAxis: [
      {
        label,
        value: valueColumn ?? aggregation,
        format: 'number',
        decimals: 0,
        suffix: ' ms',
        seriesColor: seriesColor(getLatencyChartType(latencyAggregationType)),
      },
    ],
  });
}

export function getThroughputChart({
  indices,
  buildQuery,
  valueColumn = 'COUNT(*)',
  suffix,
  decimals = 0,
  projectRouting,
}: {
  indices: string | undefined;
  buildQuery?: (indices: string) => ComposerQuery;
  valueColumn?: string;
  /** Set when the query reports a rate rather than a per-bucket count, e.g. ` tpm`. */
  suffix?: string;
  decimals?: number;
  projectRouting?: string;
}): FlyoutLensChartConfigDefinition {
  return buildChartDefinition({
    id: 'throughput',
    title: i18n.translate('xpack.apm.serviceFlyout.throughputChartTitle', {
      defaultMessage: 'Throughput',
    }),
    indices,
    buildQuery,
    projectRouting,
    yAxis: [
      {
        label: i18n.translate('xpack.apm.serviceFlyout.throughputSeriesLabel', {
          defaultMessage: 'Throughput',
        }),
        value: valueColumn,
        format: 'number',
        decimals,
        ...(suffix ? { suffix } : {}),
        seriesColor: seriesColor(ChartType.THROUGHPUT),
      },
    ],
  });
}

export function getErrorRateChart({
  indices,
  buildQuery,
  title,
  projectRouting,
}: {
  indices: string | undefined;
  buildQuery?: (indices: string) => ComposerQuery;
  title: string;
  projectRouting?: string;
}): FlyoutLensChartConfigDefinition {
  return buildChartDefinition({
    id: 'failedTransactionRate',
    title,
    indices,
    buildQuery,
    projectRouting,
    yBounds: { mode: 'custom', lowerBound: 0, upperBound: 1 },
    yAxis: [
      {
        label: title,
        value: 'failed_transaction_rate',
        format: 'percent',
        decimals: 1,
        seriesColor: seriesColor(ChartType.FAILED_TRANSACTION_RATE),
      },
    ],
  });
}
