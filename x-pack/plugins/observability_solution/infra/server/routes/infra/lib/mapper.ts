/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicMetricValueRT, TopMetricsTypeRT } from '../../../lib/metrics/types';
import {
  GetInfraMetricsRequestBodyPayload,
  GetInfraMetricsResponsePayload,
  InfraAssetMetadata,
  InfraAssetMetrics,
} from '../../../../common/http_api/infra';

import {
  FilteredMetricsTypeRT,
  HostsMetricsSearchBucket,
  HostsMetricsSearchValue,
  HostsMetricsSearchValueRT,
} from './types';
import { METADATA_AGGREGATION_NAME } from './constants';
import { HostAlertsResponse } from './host/get_hosts_alerts_count';

export const mapToApiResponse = (
  params: GetInfraMetricsRequestBodyPayload,
  buckets?: HostsMetricsSearchBucket[] | undefined,
  alertsCountResponse?: HostAlertsResponse
): GetInfraMetricsResponsePayload => {
  if (!buckets) {
    return {
      type: params.type,
      nodes: [],
    };
  }

  const hosts = buckets
    .map((bucket) => {
      const metrics = convertMetricBucket(params, bucket);
      const metadata = convertMetadataBucket(bucket);

      const cpuValue = metrics.find((metric) => metric.name === 'cpu')?.value ?? 0;
      const alerts = alertsCountResponse?.find((item) => item.name === bucket.key);

      return { name: bucket.key as string, metrics, metadata, cpuValue, ...alerts };
    })
    .sort((a, b) => {
      return b.cpuValue - a.cpuValue;
    })
    .map(({ cpuValue, ...rest }) => rest);

  return {
    type: params.type,
    nodes: hosts,
  };
};

const normalizeValue = (value: string | number | null) => {
  if (typeof value === 'string') {
    return value?.trim().length === 0 ? null : value;
  }

  return value;
};

const convertMetadataBucket = (bucket: HostsMetricsSearchBucket): InfraAssetMetadata[] => {
  const metadataAggregation = bucket[METADATA_AGGREGATION_NAME];
  return TopMetricsTypeRT.is(metadataAggregation)
    ? metadataAggregation.top
        .flatMap((top) => Object.entries(top.metrics))
        .map(
          ([key, value]) =>
            ({
              name: key,
              value: normalizeValue(value),
            } as InfraAssetMetadata)
        )
    : [];
};

const convertMetricBucket = (
  params: GetInfraMetricsRequestBodyPayload,
  bucket: HostsMetricsSearchBucket
): InfraAssetMetrics[] => {
  return params.metrics.map((returnedMetric) => {
    const metricBucket = bucket[returnedMetric.type];
    return {
      name: returnedMetric.type,
      value: HostsMetricsSearchValueRT.is(metricBucket) ? getMetricValue(metricBucket) ?? 0 : null,
    } as InfraAssetMetrics;
  });
};

export const getMetricValue = (valueObject: HostsMetricsSearchValue) => {
  if (FilteredMetricsTypeRT.is(valueObject)) {
    return valueObject.result.value;
  }

  if (BasicMetricValueRT.is(valueObject)) {
    return valueObject.value;
  }

  return valueObject;
};
