/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isoToEpochRt, nonEmptyStringRt } from '@kbn/io-ts-utils';
import * as rt from 'io-ts';
import { Color } from '../color_palette';
import {
  metricsExplorerAggregationRT,
  metricsExplorerMetricRT,
} from '../http_api/metrics_explorer';

export const inventorySortOptionRT = rt.type({
  by: rt.keyof({ name: null, value: null }),
  direction: rt.keyof({ asc: null, desc: null }),
});

export enum MetricsExplorerChartType {
  line = 'line',
  area = 'area',
  bar = 'bar',
}

export enum MetricsExplorerYAxisMode {
  fromZero = 'fromZero',
  auto = 'auto',
}

export const metricsExplorerChartOptionsRT = rt.type({
  yAxisMode: rt.keyof(
    Object.fromEntries(Object.values(MetricsExplorerYAxisMode).map((v) => [v, null])) as Record<
      MetricsExplorerYAxisMode,
      null
    >
  ),
  type: rt.keyof(
    Object.fromEntries(Object.values(MetricsExplorerChartType).map((v) => [v, null])) as Record<
      MetricsExplorerChartType,
      null
    >
  ),
  stack: rt.boolean,
});

export const metricsExplorerTimeOptionsRT = rt.type({
  from: rt.string,
  to: rt.string,
  interval: rt.string,
});
const metricsExplorerOptionsMetricRT = rt.intersection([
  metricsExplorerMetricRT,
  rt.partial({
    rate: rt.boolean,
    color: rt.keyof(
      Object.fromEntries(Object.values(Color).map((c) => [c, null])) as Record<Color, null>
    ),
    label: rt.string,
  }),
]);

export const metricExplorerOptionsRequiredRT = rt.type({
  aggregation: metricsExplorerAggregationRT,
  metrics: rt.array(metricsExplorerOptionsMetricRT),
});

export const metricExplorerOptionsOptionalRT = rt.partial({
  limit: rt.number,
  groupBy: rt.union([rt.string, rt.array(rt.string)]),
  filterQuery: rt.string,
  source: rt.string,
  forceInterval: rt.boolean,
  dropLastBucket: rt.boolean,
});
export const metricsExplorerOptionsRT = rt.intersection([
  metricExplorerOptionsRequiredRT,
  metricExplorerOptionsOptionalRT,
]);

export const metricExplorerViewStateRT = rt.type({
  chartOptions: metricsExplorerChartOptionsRT,
  currentTimerange: metricsExplorerTimeOptionsRT,
  options: metricsExplorerOptionsRT,
});

export const metricsExplorerViewBasicAttributesRT = rt.type({
  name: nonEmptyStringRt,
});

const metricsExplorerViewFlagsRT = rt.partial({ isDefault: rt.boolean, isStatic: rt.boolean });

export const metricsExplorerViewAttributesRT = rt.intersection([
  metricExplorerViewStateRT,
  metricsExplorerViewBasicAttributesRT,
  metricsExplorerViewFlagsRT,
]);

const singleMetricsExplorerViewAttributesRT = rt.exact(
  rt.intersection([metricsExplorerViewBasicAttributesRT, metricsExplorerViewFlagsRT])
);

export const metricsExplorerViewRT = rt.exact(
  rt.intersection([
    rt.type({
      id: rt.string,
      attributes: metricsExplorerViewAttributesRT,
    }),
    rt.partial({
      updatedAt: isoToEpochRt,
      version: rt.string,
    }),
  ])
);

export const singleMetricsExplorerViewRT = rt.exact(
  rt.intersection([
    rt.type({
      id: rt.string,
      attributes: singleMetricsExplorerViewAttributesRT,
    }),
    rt.partial({
      updatedAt: isoToEpochRt,
      version: rt.string,
    }),
  ])
);

export type MetricsExplorerChartOptions = rt.TypeOf<typeof metricsExplorerChartOptionsRT>;
export type MetricsExplorerOptions = rt.TypeOf<typeof metricsExplorerOptionsRT>;
export type MetricsExplorerOptionsMetric = rt.TypeOf<typeof metricsExplorerOptionsMetricRT>;
export type MetricsExplorerViewState = rt.TypeOf<typeof metricExplorerViewStateRT>;
export type MetricsExplorerTimeOptions = rt.TypeOf<typeof metricsExplorerTimeOptionsRT>;
export type MetricsExplorerViewAttributes = rt.TypeOf<typeof metricsExplorerViewAttributesRT>;
export type MetricsExplorerView = rt.TypeOf<typeof metricsExplorerViewRT>;
