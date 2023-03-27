/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { HostMetricTypeRT } from '../../../common/http_api/hosts';
import { BasicMetricValueRT, TopMetricsTypeRT } from '../metrics/types';

export const HostsAggregationQueryRT = rt.intersection([
  rt.partial({
    runtimeField: rt.UnknownRecord,
  }),
  rt.type({
    aggregation: rt.UnknownRecord,
  }),
]);

export const FilteredMetricsTypeRT = rt.type({
  doc_count: rt.number,
  result: BasicMetricValueRT,
});

export const HostsSearchMetricValueRT = rt.union([
  BasicMetricValueRT,
  TopMetricsTypeRT,
  FilteredMetricsTypeRT,
]);

const HostsSearchBucketMetricTypeRT = rt.keyof({
  key: null,
  doc_count: null,
  metadata: null,
  ...HostMetricTypeRT.keys,
});

export const HostsSearchBucketRT = rt.record(
  HostsSearchBucketMetricTypeRT,
  rt.union([rt.string, rt.number, HostsSearchMetricValueRT])
);

export const HostsSearchAggregationResponseRT = rt.type({
  groupings: rt.intersection([
    rt.partial({
      sum_other_doc_count: rt.number,
      doc_count_error_upper_bound: rt.number,
    }),
    rt.type({
      buckets: rt.array(HostsSearchBucketRT),
    }),
  ]),
});

export type HostsAggregationQuery = rt.TypeOf<typeof HostsAggregationQueryRT>;
export type HostsSearchAggregationResponse = rt.TypeOf<typeof HostsSearchAggregationResponseRT>;
export type HostsSearchMetricValue = rt.TypeOf<typeof HostsSearchMetricValueRT>;
export type HostsSearchBucket = rt.TypeOf<typeof HostsSearchBucketRT>;
