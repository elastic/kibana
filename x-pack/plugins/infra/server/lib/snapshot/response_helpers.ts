/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isNumber, last, max, sum } from 'lodash';
import moment from 'moment';

import { InfraSnapshotMetricType } from '../../graphql/types';
import { getIntervalInSeconds } from '../../utils/get_interval_in_seconds';
import { InfraSnapshotRequestOptions } from './snapshot';

export interface InfraSnapshotMetricResponse {
  key: { node: string };
  histogram: {
    buckets: InfraSnapshotMetricBucket[];
  };
}

export interface InfraSnapshotBucketWithKey {
  key: string | number;
  doc_count: number;
}

export interface InfraSnapshotBucketWithValues {
  [name: string]: { value: number; normalized_value?: number };
}

export type InfraSnapshotMetricBucket = InfraSnapshotBucketWithKey & InfraSnapshotBucketWithValues;

export interface InfraSnaphotGroupBucket {
  key: {
    node: string;
    [groupbyField: string]: string;
  };
}

export const getNodePath = (
  groupBucket: InfraSnaphotGroupBucket,
  options: InfraSnapshotRequestOptions
) => {
  const path = [];
  const node = groupBucket.key;
  options.groupby.forEach(gb => {
    path.push({ value: node[`${gb.field}`], label: node[`${gb.field}`] });
  });
  path.push({ value: node.node, label: node.node });
  return path;
};

export const getNodeMetricsForLookup = (metrics: InfraSnapshotMetricResponse[]) => {
  const nodeMetricsForLookup: any = {};
  // console.log('got metrics, looks like this: ', JSON.stringify(metrics, null, 2));
  metrics.forEach(metric => {
    nodeMetricsForLookup[`${metric.key.node}`] = metric.histogram.buckets;
  });
  return nodeMetricsForLookup;
};

export const getNodeMetrics = (
  nodeBuckets: InfraSnapshotMetricBucket[],
  options: InfraSnapshotRequestOptions
) => {
  if (!nodeBuckets) {
    return {
      name: options.metric.type,
      value: null,
      max: null,
      avg: null,
    };
  }
  const lastBucket = findLastFullBucket(nodeBuckets, options);
  const result = {
    name: options.metric.type,
    value: getMetricValueFromBucket(options.metric.type, lastBucket),
    max: calculateMax(nodeBuckets, options.metric.type),
    avg: calculateAvg(nodeBuckets, options.metric.type),
  };
  // tslint:disable-next-line:no-console
  console.log('getNodeMetrics will return', result);
  return result;
};

const findLastFullBucket = (
  buckets: InfraSnapshotMetricBucket[],
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

const getMetricValueFromBucket = (
  type: InfraSnapshotMetricType,
  bucket: InfraSnapshotMetricBucket
) => {
  const metric = bucket[type];
  return (metric && (metric.normalized_value || metric.value)) || 0;
};

function calculateMax(buckets: InfraSnapshotMetricBucket[], type: InfraSnapshotMetricType) {
  return max(buckets.map(bucket => getMetricValueFromBucket(type, bucket))) || 0;
}

function calculateAvg(buckets: InfraSnapshotMetricBucket[], type: InfraSnapshotMetricType) {
  return sum(buckets.map(bucket => getMetricValueFromBucket(type, bucket))) / buckets.length || 0;
}
