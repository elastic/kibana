/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { esql } from '@elastic/esql';
import { i18n } from '@kbn/i18n';
import { DURATION, KIND, STATUS_CODE } from '@kbn/apm-types/es_fields';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../../../common/es_fields/apm';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../../common/environment_filter_values';
import type { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
import { ChartType } from '../../../charts/helper/get_timeseries_color';
import {
  TIME_BUCKET_BY,
  buildChartDefinition,
  getLatencyAggregationConfig,
  getLatencyChartType,
  seriesColor,
} from './shared';
import type { FlyoutLensChartConfigDefinition, ServiceScope } from './shared';

function createOtelSpanBaseQuery({ indexes, scope }: { indexes: string; scope: ServiceScope }) {
  const { serviceName, environment } = scope;

  const query = esql.from(indexes).where`${esql.col(KIND)} IN ("Server", "Consumer")`
    .where`${esql.col(SERVICE_NAME)} == ${serviceName}`;

  if (environment === ENVIRONMENT_NOT_DEFINED.value) {
    query.where`${esql.col(SERVICE_ENVIRONMENT)} == ${ENVIRONMENT_NOT_DEFINED.value} OR ${esql.col(
      SERVICE_ENVIRONMENT
    )} IS NULL`;
  } else if (environment !== ENVIRONMENT_ALL.value) {
    query.where`${esql.col(SERVICE_ENVIRONMENT)} == ${environment}`;
  }

  return query;
}

export function getOtelLatencyChart(
  indexes: string | undefined,
  scope: ServiceScope,
  latencyAggregationType: LatencyAggregationType,
  titleAction?: ReactNode
): FlyoutLensChartConfigDefinition {
  const { label, aggregation } = getLatencyAggregationConfig(latencyAggregationType);

  return buildChartDefinition({
    id: 'latency',
    title: i18n.translate('xpack.apm.serviceFlyout.latencyChartTitle', {
      defaultMessage: 'Latency',
    }),
    titleAction,
    indexes,
    buildQuery: (idx) => {
      const query = createOtelSpanBaseQuery({ indexes: idx, scope });
      query.pipe(`EVAL duration_ms = TO_DOUBLE(${DURATION}) / 1000000`);
      query.pipe(`STATS ${aggregation} BY ${TIME_BUCKET_BY}`);
      return query;
    },
    yAxis: [
      {
        label,
        value: aggregation,
        format: 'number',
        decimals: 0,
        suffix: ' ms',
        seriesColor: seriesColor(getLatencyChartType(latencyAggregationType)),
      },
    ],
  });
}

export function getOtelFailedTransactionRateChart(
  indexes: string | undefined,
  scope: ServiceScope
): FlyoutLensChartConfigDefinition {
  const title = i18n.translate('xpack.apm.serviceFlyout.failedTransactionRateChartTitle', {
    defaultMessage: 'Failed transaction rate',
  });

  return buildChartDefinition({
    id: 'failedTransactionRate',
    title,
    indexes,
    buildQuery: (idx) => {
      const query = createOtelSpanBaseQuery({ indexes: idx, scope });
      query.pipe(
        `STATS failure = COUNT(*) WHERE TO_STRING(${STATUS_CODE}) == "Error", all = COUNT(*) BY ${TIME_BUCKET_BY}`
      );
      query.pipe('EVAL failed_transaction_rate = TO_DOUBLE(failure) / all');
      query.pipe('KEEP timestamp, failed_transaction_rate');
      query.pipe('SORT timestamp');
      return query;
    },
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

export function getOtelThroughputChart(
  indexes: string | undefined,
  scope: ServiceScope
): FlyoutLensChartConfigDefinition {
  return buildChartDefinition({
    id: 'throughput',
    title: i18n.translate('xpack.apm.serviceFlyout.throughputChartTitle', {
      defaultMessage: 'Throughput',
    }),
    indexes,
    buildQuery: (idx) => {
      const query = createOtelSpanBaseQuery({ indexes: idx, scope });
      query.pipe(`STATS COUNT(*) BY ${TIME_BUCKET_BY}`);
      return query;
    },
    yAxis: [
      {
        label: i18n.translate('xpack.apm.serviceFlyout.throughputSeriesLabel', {
          defaultMessage: 'Throughput',
        }),
        value: 'COUNT(*)',
        format: 'number',
        decimals: 0,
        seriesColor: seriesColor(ChartType.THROUGHPUT),
      },
    ],
  });
}
