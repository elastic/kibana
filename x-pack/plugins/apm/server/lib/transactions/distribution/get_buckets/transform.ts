/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { idx } from 'x-pack/plugins/apm/common/idx';
import { ESResponse } from './fetcher';

export interface IBucket {
  key: number;
  count: number;
  sample?: IBucketSample;
}

interface IBucketSample {
  traceId?: string;
  transactionId?: string;
}

interface IBucketsResponse {
  totalHits: number;
  buckets: IBucket[];
  defaultSample?: IBucketSample;
}

function getDefaultSample(buckets: IBucket[]) {
  const samples = buckets
    .filter(bucket => bucket.count > 0 && bucket.sample)
    .map(bucket => bucket.sample);

  if (isEmpty(samples)) {
    return;
  }

  const middleIndex = Math.floor(samples.length / 2);
  return samples[middleIndex];
}

export function bucketTransformer(response: ESResponse): IBucketsResponse {
  const buckets = response.aggregations.distribution.buckets.map(bucket => {
    const sampleSource = idx(bucket, _ => _.sample.hits.hits[0]._source);
    const isSampled = idx(sampleSource, _ => _.transaction.sampled);
    const sample = {
      traceId: idx(sampleSource, _ => _.trace.id),
      transactionId: idx(sampleSource, _ => _.transaction.id)
    };

    return {
      key: bucket.key,
      count: bucket.doc_count,
      sample: isSampled ? sample : undefined
    };
  });

  return {
    totalHits: response.hits.total,
    buckets,
    defaultSample: getDefaultSample(buckets)
  };
}
