/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { idx } from '@kbn/elastic-idx';
import { ESResponse } from './fetcher';

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

export type IBucket = ReturnType<typeof getBucket>;
function getBucket(
  bucket: ESResponse['aggregations']['distribution']['buckets'][0]
) {
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
}

export function bucketTransformer(response: ESResponse) {
  const buckets = response.aggregations.distribution.buckets.map(getBucket);

  return {
    totalHits: response.hits.total,
    buckets,
    defaultSample: getDefaultSample(buckets)
  };
}
