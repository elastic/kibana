/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { esql } from '@elastic/esql';
import { i18n } from '@kbn/i18n';
import { SERVICE_ENVIRONMENT, SERVICE_NAME } from '../../../../../../common/es_fields/apm';
import {
  ENVIRONMENT_ALL,
  ENVIRONMENT_NOT_DEFINED,
} from '../../../../../../common/environment_filter_values';
import type { LatencyAggregationType } from '../../../../../../common/latency_aggregation_types';
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

  const query = esql.from(indexes).where`${esql.col('span.kind')} IN ("SERVER", "CONSUMER")`
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
      // TODO: verify OTel duration field name and unit (assumed nanoseconds)
      const query = createOtelSpanBaseQuery({ indexes: idx, scope });
      query.pipe(`EVAL duration_ms = TO_DOUBLE(duration) / 1000000`);
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
