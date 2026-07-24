/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { ComposerQuery } from '@elastic/esql';
import { i18n } from '@kbn/i18n';
import type { LensConfig, LensSeriesLayer } from '@kbn/lens-embeddable-utils';
import type { LensESQLConfig } from '../types';
import { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import { ChartType, getTimeSeriesColor } from '../../../charts/helper/get_timeseries_color';

export type FlyoutLensChartProcessorEvent = 'transaction' | 'metric';

export interface FlyoutLensChartConfigDefinition {
  id: string;
  title: string;
  titleAction?: ReactNode;
  config?: LensESQLConfig;
}

export interface ServiceScope {
  serviceName: string;
  environment: string;
  transactionType?: string;
}

export type LensYAxis = LensSeriesLayer['yAxis'][number];
export type LensYBounds = Extract<LensConfig, { chartType: 'xy' }>['yBounds'];

export const TIME_BUCKET_FIELD = 'timestamp';
export const TIME_BUCKET_BY = `${TIME_BUCKET_FIELD} = TBUCKET(100)`;
export const ESQL_NULLIFY_UNMAPPED_FIELDS = 'SET unmapped_fields="nullify";';

// When no limit is specified in the container, docker allows the app as much memory / swap memory
// as it wants. This number represents the max possible value for the limit field. Stored as a
// string to avoid JS floating-point precision loss. The equivalent Painless constant lives at:
// https://github.com/elastic/kibana/blob/main/x-pack/solutions/observability/plugins/apm/server/routes/metrics/by_agent/shared/memory/index.ts#L87
export const CGROUP_LIMIT_MAX_VALUE = '9223372036854771712';

export function printQuery(query: ComposerQuery): string {
  return `${query.print('basic')}`;
}

export const seriesColor = (chartType: ChartType) =>
  getTimeSeriesColor(chartType).currentPeriodColor;

export function buildChartDefinition({
  id,
  title,
  titleAction,
  indexes,
  buildQuery,
  yAxis,
  yBounds,
}: {
  id: string;
  title: string;
  titleAction?: ReactNode;
  indexes: string | undefined;
  buildQuery: (indexes: string) => ComposerQuery;
  yAxis: LensYAxis[];
  yBounds?: LensYBounds;
}): FlyoutLensChartConfigDefinition {
  if (!indexes) {
    return { id, title, titleAction };
  }

  const config: LensESQLConfig = {
    chartType: 'xy',
    title,
    dataset: { esql: `${ESQL_NULLIFY_UNMAPPED_FIELDS}\n${printQuery(buildQuery(indexes))}` },
    layers: [
      {
        type: 'series',
        seriesType: 'line',
        xAxis: { field: TIME_BUCKET_FIELD, type: 'dateHistogram' },
        yAxis,
      },
    ],
    legend: { show: false },
    fittingFunction: 'Linear',
    axisTitleVisibility: {
      showXAxisTitle: false,
      showYAxisTitle: false,
      showYRightAxisTitle: false,
    },
    ...(yBounds ? { yBounds } : {}),
  };

  return { id, title, titleAction, config };
}

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
