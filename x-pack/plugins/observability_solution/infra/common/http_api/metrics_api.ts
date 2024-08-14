/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { MetricsUIAggregation } from '@kbn/metrics-data-access-plugin/common';
import { afterKeyObjectRT, timeRangeRT } from './metrics_explorer';

export interface TimeRange {
  from: number;
  to: number;
  interval: string;
}

export interface MetricsAPIMetric {
  id: string;
  aggregations: MetricsUIAggregation;
}

export interface MetricsAPIRequest {
  timerange: TimeRange;
  indexPattern: string;
  metrics: MetricsAPIMetric[];
  includeTimeseries: boolean | undefined;
  groupBy?: Array<string | null | undefined>;
  modules?: string[];
  afterKey?: Record<string, string | null> | null;
  limit?: number | null;
  filters?: unknown[];
  dropPartialBuckets?: boolean;
  alignDataToEnd?: boolean;
}

export const isMetricsAPIRequest = (request?: any): request is MetricsAPIRequest => {
  return !!(request as MetricsAPIRequest);
};

export const MetricsAPIPageInfoRT = rt.intersection([
  rt.type({
    afterKey: rt.union([rt.null, afterKeyObjectRT, rt.undefined]),
  }),
  rt.partial({ interval: rt.number }),
]);

export const MetricsAPIColumnTypeRT = rt.keyof({
  date: null,
  number: null,
  string: null,
});

export const MetricsAPIColumnRT = rt.type({
  name: rt.string,
  type: MetricsAPIColumnTypeRT,
});

export const MetricsAPIRowRT = rt.intersection([
  rt.type({
    timestamp: rt.number,
  }),
  rt.record(
    rt.string,
    rt.union([rt.string, rt.number, rt.null, rt.undefined, rt.array(rt.object)])
  ),
]);

export const MetricsAPISeriesRT = rt.intersection([
  rt.type({
    id: rt.string,
    columns: rt.array(MetricsAPIColumnRT),
    rows: rt.array(MetricsAPIRowRT),
  }),
  rt.partial({
    keys: rt.array(rt.string),
  }),
]);

export const MetricsAPIResponseSeriesRT = rt.intersection([
  MetricsAPISeriesRT,
  rt.partial({ metricsets: rt.array(rt.string) }),
]);

export const MetricsAPIResponseRT = rt.type({
  series: rt.array(MetricsAPIResponseSeriesRT),
  info: MetricsAPIPageInfoRT,
});

export type MetricsAPITimerange = rt.TypeOf<typeof timeRangeRT>;

export type MetricsAPIColumnType = rt.TypeOf<typeof MetricsAPIColumnTypeRT>;

export type MetricsAPIPageInfo = rt.TypeOf<typeof MetricsAPIPageInfoRT>;

export type MetricsAPIColumn = rt.TypeOf<typeof MetricsAPIColumnRT>;

export type MetricsAPIRow = rt.TypeOf<typeof MetricsAPIRowRT>;

export type MetricsAPISeries = rt.TypeOf<typeof MetricsAPISeriesRT>;

export type MetricsAPIResponse = rt.TypeOf<typeof MetricsAPIResponseRT>;
