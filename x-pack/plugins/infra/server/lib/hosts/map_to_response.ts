/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { decodeOrThrow } from '../../../common/runtime_types';
import {
  GetHostsRequestParams,
  GetHostsResponsePayload,
  HostMetadata,
  HostMetrics,
  HostMetricType,
} from '../../../common/http_api/hosts';
import { BasicMetricValueRT, TopMetricsTypeRT } from '../metrics/types';
import {
  FilteredMetricsTypeRT,
  HostsSearchAggregationResponseRT,
  HostsSearchBucket,
  HostsSearchMetricValue,
  HostsSearchMetricValueRT,
} from './types';
import { METADATA_FIELD } from './constants';

const getValue = (valueObject: HostsSearchMetricValue) => {
  if (FilteredMetricsTypeRT.is(valueObject)) {
    return valueObject.result.value;
  }

  if (BasicMetricValueRT.is(valueObject)) {
    return valueObject.value;
  }

  return valueObject;
};

const convertMetricBucket = (
  params: GetHostsRequestParams,
  bucket: HostsSearchBucket
): HostMetrics[] => {
  return (['cpu', 'diskLatency', 'memory', 'memoryTotal', 'rx', 'tx'] as HostMetricType[])
    .filter((metricType) => !!bucket[metricType])
    .map((metricType) => {
      const metricValue = bucket[metricType];
      return {
        name: metricType,
        value: HostsSearchMetricValueRT.is(metricValue) ? getValue(metricValue) : null,
      } as HostMetrics;
    });
};

const convertMetadataBucket = (bucket: HostsSearchBucket): HostMetadata[] => {
  const metadataAggregation = bucket[METADATA_FIELD];
  return TopMetricsTypeRT.is(metadataAggregation)
    ? metadataAggregation.top
        .flatMap((top) => Object.entries(top.metrics))
        .map(
          ([key, value]) =>
            ({
              name: key,
              value,
            } as HostMetadata)
        )
    : [];
};

export const convertBucketsToRows = (
  params: GetHostsRequestParams,
  buckets: HostsSearchBucket[]
): GetHostsResponsePayload => {
  const hosts = buckets.map((bucket) => {
    const metrics = convertMetricBucket(params, bucket);
    const metadata = convertMetadataBucket(bucket);

    return { name: bucket.key as string, metrics, metadata };
  });

  return {
    hosts,
  };
};

export const mapToApiResponse = (
  params: GetHostsRequestParams,
  aggregations: estypes.SearchResponse<Record<string, unknown>>['aggregations']
): GetHostsResponsePayload => {
  const hostsAggregations = decodeOrThrow(HostsSearchAggregationResponseRT)(aggregations);
  return convertBucketsToRows(params, hostsAggregations.groupings.buckets);
};
