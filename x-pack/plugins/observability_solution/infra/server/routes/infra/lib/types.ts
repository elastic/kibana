/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { ISearchClient } from '@kbn/data-plugin/common';
import * as rt from 'io-ts';
import { InfraStaticSourceConfiguration } from '../../../../common/source_configuration/source_configuration';

import { GetInfraMetricsRequestBodyPayload } from '../../../../common/http_api/infra';
import { BasicMetricValueRT, TopMetricsTypeRT } from '../../../lib/metrics/types';
import { InfraAlertsClient } from './helpers/get_infra_alerts_client';

export const FilteredMetricsTypeRT = rt.type({
  doc_count: rt.number,
  result: BasicMetricValueRT,
});

export const HostsMetricsSearchValueRT = rt.union([
  BasicMetricValueRT,
  FilteredMetricsTypeRT,
  TopMetricsTypeRT,
]);

export const HostsMetricsSearchBucketRT = rt.record(
  rt.union([rt.string, rt.undefined]),
  rt.union([
    rt.string,
    rt.number,
    HostsMetricsSearchValueRT,
    rt.record(rt.string, rt.string),
    rt.type({ doc_count: rt.number }),
  ])
);

export const HostsNameBucketRT = rt.type({
  key: rt.string,
  doc_count: rt.number,
});

export const HostsMetricsSearchAggregationResponseRT = rt.union([
  rt.type({
    nodes: rt.intersection([
      rt.partial({
        sum_other_doc_count: rt.number,
        doc_count_error_upper_bound: rt.number,
      }),
      rt.type({ buckets: rt.array(HostsMetricsSearchBucketRT) }),
    ]),
  }),
  rt.undefined,
]);

export const FilteredHostsSearchAggregationResponseRT = rt.union([
  rt.type({
    nodes: rt.intersection([
      rt.partial({
        sum_other_doc_count: rt.number,
        doc_count_error_upper_bound: rt.number,
      }),
      rt.type({
        buckets: rt.array(HostsNameBucketRT),
      }),
    ]),
  }),
  rt.undefined,
]);

export interface HostsMetricsAggregationQueryConfig {
  fieldName: string;
  aggregation: estypes.AggregationsAggregationContainer;
  runtimeField?: estypes.MappingRuntimeFields;
}

export interface GetHostsArgs {
  searchClient: ISearchClient;
  alertsClient: InfraAlertsClient;
  sourceConfig: InfraStaticSourceConfiguration;
  params: GetInfraMetricsRequestBodyPayload;
}

export type HostsMetricsSearchValue = rt.TypeOf<typeof HostsMetricsSearchValueRT>;
export type HostsMetricsSearchBucket = rt.TypeOf<typeof HostsMetricsSearchBucketRT>;

export type FilteredHostsSearchAggregationResponse = rt.TypeOf<
  typeof FilteredHostsSearchAggregationResponseRT
>;

export type HostsMetricsSearchAggregationResponse = rt.TypeOf<
  typeof HostsMetricsSearchAggregationResponseRT
>;
