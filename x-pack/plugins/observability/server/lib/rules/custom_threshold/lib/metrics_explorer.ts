/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { METRIC_EXPLORER_AGGREGATIONS } from '../../../../../common/custom_threshold_rule/constants';
import { metricsExplorerCustomMetricAggregationRT } from '../../../../../common/custom_threshold_rule/metrics_explorer';

type MetricExplorerAggregations = typeof METRIC_EXPLORER_AGGREGATIONS[number];

const metricsExplorerAggregationKeys = METRIC_EXPLORER_AGGREGATIONS.reduce<
  Record<MetricExplorerAggregations, null>
>((acc, agg) => ({ ...acc, [agg]: null }), {} as Record<MetricExplorerAggregations, null>);

export const metricsExplorerAggregationRT = rt.keyof(metricsExplorerAggregationKeys);

export const metricsExplorerMetricRequiredFieldsRT = rt.type({
  aggregation: metricsExplorerAggregationRT,
});

export const metricsExplorerCustomMetricRT = rt.intersection([
  rt.type({
    name: rt.string,
    aggregation: metricsExplorerCustomMetricAggregationRT,
  }),
  rt.partial({
    field: rt.string,
    filter: rt.string,
  }),
]);

export type MetricsExplorerCustomMetric = rt.TypeOf<typeof metricsExplorerCustomMetricRT>;

export const metricsExplorerMetricOptionalFieldsRT = rt.partial({
  field: rt.union([rt.string, rt.undefined]),
  custom_metrics: rt.array(metricsExplorerCustomMetricRT),
  equation: rt.string,
});

export const metricsExplorerMetricRT = rt.intersection([
  metricsExplorerMetricRequiredFieldsRT,
  metricsExplorerMetricOptionalFieldsRT,
]);

export const timeRangeRT = rt.type({
  from: rt.number,
  to: rt.number,
  interval: rt.string,
});

export const metricsExplorerRequestBodyRequiredFieldsRT = rt.type({
  timerange: timeRangeRT,
  indexPattern: rt.string,
  metrics: rt.array(metricsExplorerMetricRT),
});

const groupByRT = rt.union([rt.string, rt.null, rt.undefined]);
export const afterKeyObjectRT = rt.record(rt.string, rt.union([rt.string, rt.null]));

export const metricsExplorerRequestBodyOptionalFieldsRT = rt.partial({
  groupBy: rt.union([groupByRT, rt.array(groupByRT)]),
  afterKey: rt.union([rt.string, rt.null, rt.undefined, afterKeyObjectRT]),
  limit: rt.union([rt.number, rt.null, rt.undefined]),
  filterQuery: rt.union([rt.string, rt.null, rt.undefined]),
  forceInterval: rt.boolean,
  dropLastBucket: rt.boolean,
});

export const metricsExplorerRequestBodyRT = rt.intersection([
  metricsExplorerRequestBodyRequiredFieldsRT,
  metricsExplorerRequestBodyOptionalFieldsRT,
]);

export const metricsExplorerPageInfoRT = rt.type({
  total: rt.number,
  afterKey: rt.union([rt.string, rt.null, afterKeyObjectRT]),
});

export const metricsExplorerColumnTypeRT = rt.keyof({
  date: null,
  number: null,
  string: null,
});

export const metricsExplorerColumnRT = rt.type({
  name: rt.string,
  type: metricsExplorerColumnTypeRT,
});

export const metricsExplorerRowRT = rt.intersection([
  rt.type({
    timestamp: rt.number,
  }),
  rt.record(
    rt.string,
    rt.union([rt.string, rt.number, rt.null, rt.undefined, rt.array(rt.object)])
  ),
]);

export const metricsExplorerSeriesRT = rt.intersection([
  rt.type({
    id: rt.string,
    columns: rt.array(metricsExplorerColumnRT),
    rows: rt.array(metricsExplorerRowRT),
  }),
  rt.partial({
    keys: rt.array(rt.string),
  }),
]);

export const metricsExplorerResponseRT = rt.type({
  series: rt.array(metricsExplorerSeriesRT),
  pageInfo: metricsExplorerPageInfoRT,
});

export type AfterKey = rt.TypeOf<typeof afterKeyObjectRT>;

export type MetricsExplorerColumnType = rt.TypeOf<typeof metricsExplorerColumnTypeRT>;

export type MetricsExplorerPageInfo = rt.TypeOf<typeof metricsExplorerPageInfoRT>;

export type MetricsExplorerColumn = rt.TypeOf<typeof metricsExplorerColumnRT>;

export type MetricsExplorerRow = rt.TypeOf<typeof metricsExplorerRowRT>;

export type MetricsExplorerRequestBody = rt.TypeOf<typeof metricsExplorerRequestBodyRT>;

export type MetricsExplorerResponse = rt.TypeOf<typeof metricsExplorerResponseRT>;
