/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicMetricValueRT, TopMetricsTypeRT } from '../../../lib/metrics/types';
import {
  GetHostsRequestParams,
  GetHostsResponsePayload,
  HostMetadata,
  HostMetrics,
} from '../../../../common/http_api/hosts';

import {
  FilteredMetricsTypeRT,
  HostsMetricsSearchAggregationResponse,
  HostsMetricsSearchBucket,
  HostsMetricsSearchValue,
  HostsMetricsSearchValueRT,
} from './types';
import { METADATA_FIELD } from './constants';

const getMetricValue = (valueObject: HostsMetricsSearchValue) => {
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
  bucket: HostsMetricsSearchBucket
): HostMetrics[] => {
  return params.metrics
    .filter((requestedMetric) => !!bucket[requestedMetric.type])
    .map((returnedMetric) => {
      const metricBucket = bucket[returnedMetric.type];
      return {
        name: returnedMetric.type,
        value: HostsMetricsSearchValueRT.is(metricBucket)
          ? getMetricValue(metricBucket) ?? 0
          : null,
      } as HostMetrics;
    });
};

const convertMetadataBucket = (bucket: HostsMetricsSearchBucket): HostMetadata[] => {
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
  buckets: HostsMetricsSearchBucket[]
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
  aggregations?: HostsMetricsSearchAggregationResponse | null
): GetHostsResponsePayload => {
  if (!aggregations?.groupings) {
    return {
      hosts: [],
    };
  }
  return convertBucketsToRows(params, aggregations.groupings.buckets);
};
