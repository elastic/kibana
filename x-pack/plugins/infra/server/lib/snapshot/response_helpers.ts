/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber, last, max, sum, get } from 'lodash';
import moment from 'moment';

import { MetricsExplorerSeries } from '../../../common/http_api/metrics_explorer';
import { getIntervalInSeconds } from '../../utils/get_interval_in_seconds';
import { InfraSnapshotRequestOptions } from './types';
import { findInventoryModel } from '../../../common/inventory_models';
import { InventoryItemType, SnapshotMetricType } from '../../../common/inventory_models/types';
import { SnapshotNodeMetric, SnapshotNodePath } from '../../../common/http_api/snapshot_api';

export interface InfraSnapshotNodeMetricsBucket {
  key: { id: string };
  histogram: {
    buckets: InfraSnapshotMetricsBucket[];
  };
}

// Jumping through TypeScript hoops here:
// We need an interface that has the known members 'key' and 'doc_count' and also
// an unknown number of members with unknown names but known format, containing the
// metrics.
// This union type is the only way I found to express this that TypeScript accepts.
export interface InfraSnapshotBucketWithKey {
  key: string | number;
  doc_count: number;
}

export interface InfraSnapshotBucketWithValues {
  [name: string]: { value: number; normalized_value?: number };
}

export type InfraSnapshotMetricsBucket = InfraSnapshotBucketWithKey & InfraSnapshotBucketWithValues;

interface InfraSnapshotIpHit {
  _index: string;
  _type: string;
  _id: string;
  _score: number | null;
  _source: {
    host: {
      ip: string[] | string;
    };
  };
  sort: number[];
}

export interface InfraSnapshotNodeGroupByBucket {
  key: {
    id: string;
    name: string;
    [groupByField: string]: string;
  };
  ip: {
    hits: {
      total: { value: number };
      hits: InfraSnapshotIpHit[];
    };
  };
}

export const isIPv4 = (subject: string) => /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(subject);

export const getIPFromBucket = (
  nodeType: InventoryItemType,
  bucket: InfraSnapshotNodeGroupByBucket
): string | null => {
  const inventoryModel = findInventoryModel(nodeType);
  if (!inventoryModel.fields.ip) {
    return null;
  }
  const ip = get(bucket, `ip.hits.hits[0]._source.${inventoryModel.fields.ip}`, null) as
    | string[]
    | null;
  if (Array.isArray(ip)) {
    return ip.find(isIPv4) || null;
  } else if (typeof ip === 'string') {
    return ip;
  }

  return null;
};

export const getNodePath = (
  groupBucket: InfraSnapshotNodeGroupByBucket,
  options: InfraSnapshotRequestOptions
): SnapshotNodePath[] => {
  const node = groupBucket.key;
  const path = options.groupBy.map((gb) => {
    return { value: node[`${gb.field}`], label: node[`${gb.field}`] } as SnapshotNodePath;
  });
  const ip = getIPFromBucket(options.nodeType, groupBucket);
  path.push({ value: node.id, label: node.name || node.id, ip });
  return path;
};

interface NodeMetricsForLookup {
  [nodeId: string]: InfraSnapshotMetricsBucket[];
}

export const getNodeMetricsForLookup = (
  metrics: InfraSnapshotNodeMetricsBucket[]
): NodeMetricsForLookup => {
  return metrics.reduce((acc: NodeMetricsForLookup, metric) => {
    acc[`${metric.key.id}`] = metric.histogram.buckets;
    return acc;
  }, {});
};

// In the returned object,
// value contains the value from the last bucket spanning a full interval
// max and avg are calculated from all buckets returned for the timerange
export const getNodeMetrics = (
  nodeBuckets: InfraSnapshotMetricsBucket[],
  options: InfraSnapshotRequestOptions
): SnapshotNodeMetric[] => {
  if (!nodeBuckets) {
    return options.metrics.map((metric) => ({
      name: metric.type,
      value: null,
      max: null,
      avg: null,
    }));
  }
  const lastBucket = findLastFullBucket(nodeBuckets, options);
  if (!lastBucket) return [];
  return options.metrics.map((metric, index) => {
    const metricResult: SnapshotNodeMetric = {
      name: metric.type,
      value: getMetricValueFromBucket(metric.type, lastBucket, index),
      max: calculateMax(nodeBuckets, metric.type, index),
      avg: calculateAvg(nodeBuckets, metric.type, index),
    };
    if (options.includeTimeseries) {
      metricResult.timeseries = getTimeseriesData(nodeBuckets, metric.type, index);
    }
    return metricResult;
  });
};

const findLastFullBucket = (
  buckets: InfraSnapshotMetricsBucket[],
  options: InfraSnapshotRequestOptions
) => {
  const to = moment.utc(options.timerange.to);
  const bucketSize = getIntervalInSeconds(options.timerange.interval);
  return buckets.reduce((current, item) => {
    const itemKey = isNumber(item.key) ? item.key : parseInt(item.key, 10);
    const date = moment.utc(itemKey + bucketSize * 1000);
    if (!date.isAfter(to) && item.doc_count > 0) {
      return item;
    }
    return current;
  }, last(buckets));
};

export const getMetricValueFromBucket = (
  type: SnapshotMetricType,
  bucket: InfraSnapshotMetricsBucket,
  index: number
) => {
  const key = type === 'custom' ? `custom_${index}` : type;
  const metric = bucket[key];
  const value = metric && (metric.normalized_value || metric.value);
  return isFinite(value) ? value : null;
};

function calculateMax(
  buckets: InfraSnapshotMetricsBucket[],
  type: SnapshotMetricType,
  index: number
) {
  return max(buckets.map((bucket) => getMetricValueFromBucket(type, bucket, index))) || 0;
}

function calculateAvg(
  buckets: InfraSnapshotMetricsBucket[],
  type: SnapshotMetricType,
  index: number
) {
  return (
    sum(buckets.map((bucket) => getMetricValueFromBucket(type, bucket, index))) / buckets.length ||
    0
  );
}

function getTimeseriesData(
  buckets: InfraSnapshotMetricsBucket[],
  type: SnapshotMetricType,
  index: number
): MetricsExplorerSeries {
  return {
    id: type,
    columns: [
      { name: 'timestamp', type: 'date' },
      { name: 'metric_0', type: 'number' },
    ],
    rows: buckets.map((bucket) => ({
      timestamp: bucket.key as number,
      metric_0: getMetricValueFromBucket(type, bucket, index),
    })),
  };
}
