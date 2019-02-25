/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isNumber, last, max, sum } from 'lodash';
import moment from 'moment';

import { InfraMetricType, InfraNode, InfraNodeMetric } from '../../../../graphql/types';
import { InfraBucket, InfraNodeRequestOptions } from '../adapter_types';
import { NAME_FIELDS } from '../constants';
import { getBucketSizeInSeconds } from './get_bucket_size_in_seconds';

// TODO: Break these function into seperate files and expand beyond just documnet count
// In the code below it looks like overkill to split these three functions out
// but in reality the create metrics functions will be different per node type.

const findLastFullBucket = (
  bucket: InfraBucket,
  bucketSize: number,
  options: InfraNodeRequestOptions
): InfraBucket | undefined => {
  const { buckets } = bucket.timeseries;
  const to = moment.utc(options.timerange.to);
  return buckets.reduce((current, item) => {
    const itemKey = isNumber(item.key) ? item.key : parseInt(item.key, 10);
    const date = moment.utc(itemKey + bucketSize * 1000);
    if (!date.isAfter(to) && item.doc_count > 0) {
      return item;
    }
    return current;
  }, last(buckets));
};

const getMetricValueFromBucket = (type: InfraMetricType) => (bucket: InfraBucket) => {
  const metric = bucket[type];
  return (metric && (metric.normalized_value || metric.value)) || 0;
};

function calculateMax(bucket: InfraBucket, type: InfraMetricType) {
  const { buckets } = bucket.timeseries;
  return max(buckets.map(getMetricValueFromBucket(type))) || 0;
}

function calculateAvg(bucket: InfraBucket, type: InfraMetricType) {
  const { buckets } = bucket.timeseries;
  return sum(buckets.map(getMetricValueFromBucket(type))) / buckets.length || 0;
}

function createNodeMetrics(
  options: InfraNodeRequestOptions,
  node: InfraBucket,
  bucket: InfraBucket
): InfraNodeMetric {
  const { timerange, metric } = options;
  const bucketSize = getBucketSizeInSeconds(timerange.interval);
  const lastBucket = findLastFullBucket(bucket, bucketSize, options);
  if (!lastBucket) {
    throw new Error('Date histogram returned an empty set of buckets.');
  }
  return {
    name: metric.type,
    value: getMetricValueFromBucket(metric.type)(lastBucket),
    max: calculateMax(bucket, metric.type),
    avg: calculateAvg(bucket, metric.type),
  };
}

export function createNodeItem(
  options: InfraNodeRequestOptions,
  node: InfraBucket,
  bucket: InfraBucket
): InfraNode {
  const nodeDoc = get(node, ['nodeDetails', 'hits', 'hits', 0]);
  return {
    metric: createNodeMetrics(options, node, bucket),
    path: [{ value: node.key, label: get(nodeDoc, `_source.${NAME_FIELDS[options.nodeType]}`) }],
  } as InfraNode;
}
