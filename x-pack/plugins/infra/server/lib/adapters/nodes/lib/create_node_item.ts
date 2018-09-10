/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last } from 'lodash';
import moment from 'moment';
import { InfraNode, InfraNodeMetric } from '../../../../../common/graphql/types';
import { InfraBucket, InfraNodeRequestOptions } from '../adapter_types';
import { getBucketSizeInSeconds } from './get_bucket_size_in_seconds';

// TODO: Break these function into seperate files and expand beyond just documnet count
// In the code below it looks like overkill to split these three functions out
// but in reality the create metrics functions will be different per node type.

const findLastFullBucket = (
  bucket: InfraBucket,
  bucketSize: number,
  options: InfraNodeRequestOptions
) => {
  const { buckets } = bucket.timeseries;
  const to = moment.utc(options.timerange.to);
  return buckets.reduce((current, item) => {
    const date = moment.utc(item.key + bucketSize * 1000);
    if (!date.isAfter(to) && item.doc_count > 0) {
      return item;
    }
    return current;
  }, last(buckets));
};

function createNodeMetrics(
  options: InfraNodeRequestOptions,
  node: InfraBucket,
  bucket: InfraBucket
): InfraNodeMetric[] {
  const { timerange, metrics } = options;
  const bucketSize = getBucketSizeInSeconds(timerange.interval);
  const lastBucket = findLastFullBucket(bucket, bucketSize, options);
  return metrics.filter(metric => lastBucket[metric.type]).map(metric => {
    const metricObj = lastBucket[metric.type];
    return { name: metric.type, value: (metricObj && metricObj.value) || 0 };
  });
}

export function createNodeItem(
  options: InfraNodeRequestOptions,
  node: InfraBucket,
  bucket: InfraBucket
): InfraNode {
  return {
    metrics: createNodeMetrics(options, node, bucket),
    path: [{ value: node.key }],
  } as InfraNode;
}
