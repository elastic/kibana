/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import * as rt from 'io-ts';
import { HostMetricTypeRT } from '../../../common/http_api/hosts';
import { BasicMetricValueRT, TopMetricsTypeRT } from '../metrics/types';

export const FilteredMetricsTypeRT = rt.type({
  doc_count: rt.number,
  result: BasicMetricValueRT,
});

export const HostsMetricsSearchValueRT = rt.union([
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

export const HostsMetricsSearchBucketRT = rt.record(
  HostsSearchBucketMetricTypeRT,
  rt.union([rt.string, rt.number, HostsMetricsSearchValueRT])
);

// rt.type({ hostname: rt.string })
export const HostsSearchBucketRT = rt.type({
  key: rt.string,
  doc_count: rt.number,
});

export const HostsMetricsSearchAggregationResponseRT = rt.type({
  groupings: rt.intersection([
    rt.partial({
      sum_other_doc_count: rt.number,
      doc_count_error_upper_bound: rt.number,
    }),
    rt.type({
      buckets: rt.array(HostsMetricsSearchBucketRT),
    }),
  ]),
});

export const FilteredHostsAggregationResponseRT = rt.type({
  sampling: rt.type({
    seed: rt.number,
    probability: rt.number,
    doc_count: rt.number,
    hosts: rt.intersection([
      rt.partial({
        sum_other_doc_count: rt.number,
        doc_count_error_upper_bound: rt.number,
      }),
      rt.type({
        buckets: rt.array(HostsSearchBucketRT),
      }),
    ]),
  }),
});

export interface HostsMetricsAggregationQueryConfig {
  runtimeField: estypes.MappingRuntimeFields;
  aggregation: estypes.AggregationsAggregationContainer['aggs'];
}

export type HostsMetricsSearchValue = rt.TypeOf<typeof HostsMetricsSearchValueRT>;
export type HostsMetricsSearchBucket = rt.TypeOf<typeof HostsMetricsSearchBucketRT>;

export type HostsMetricsSearchAggregationResponse = rt.TypeOf<
  typeof HostsMetricsSearchAggregationResponseRT
>;

export type FilteredHostsAggregationResponse = rt.TypeOf<typeof FilteredHostsAggregationResponseRT>;
