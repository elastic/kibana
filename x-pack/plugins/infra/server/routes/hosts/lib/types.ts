/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { ISearchClient } from '@kbn/data-plugin/common';
import * as rt from 'io-ts';
import { InfraSource } from '../../../../common/source_configuration/source_configuration';

import { GetHostsRequestParams, HostMetricTypeRT } from '../../../../common/http_api/hosts';
import { BasicMetricValueRT, TopMetricsTypeRT } from '../../../lib/metrics/types';

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

export const HostsSearchBucketRT = rt.type({
  key: rt.string,
  doc_count: rt.number,
});

export const HostsMetricsSearchAggregationContentResponseRT = rt.type({
  doc_count: rt.number,
  hosts: rt.intersection([
    rt.partial({
      sum_other_doc_count: rt.number,
      doc_count_error_upper_bound: rt.number,
    }),
    rt.type({ buckets: rt.array(HostsMetricsSearchBucketRT) }),
  ]),
});

export const HostsMetricsSearchAggregationResponseRT = rt.union([
  rt.partial({
    sortedByMetric: HostsMetricsSearchAggregationContentResponseRT,
    sortedByTerm: HostsMetricsSearchAggregationContentResponseRT,
  }),
  rt.undefined,
]);

export const HostsRandomSamplerAggregationResponseRT = rt.union([
  rt.type({
    group: rt.type({
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
  }),
  rt.undefined,
]);

export interface HostsMetricsAggregationQueryConfig {
  filter: estypes.QueryDslQueryContainer;
  runtimeField?: estypes.MappingRuntimeFields;
  aggregation: estypes.AggregationsAggregationContainer;
}

export interface GetHostsArgs {
  searchClient: ISearchClient;
  source: InfraSource;
  params: GetHostsRequestParams;
  seed: number;
}

export type HostsMetricsSearchValue = rt.TypeOf<typeof HostsMetricsSearchValueRT>;
export type HostsMetricsSearchBucket = rt.TypeOf<typeof HostsMetricsSearchBucketRT>;
export type HostsMetricsSearchAggregationContentResponse = rt.TypeOf<
  typeof HostsMetricsSearchAggregationContentResponseRT
>;

export type HostsMetricsSearchAggregationResponse = rt.TypeOf<
  typeof HostsMetricsSearchAggregationResponseRT
>;

export type HostsRandomSamplerAggregationResponse = rt.TypeOf<
  typeof HostsRandomSamplerAggregationResponseRT
>;
