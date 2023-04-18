/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsCompositeBucket } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import partition from 'lodash/partition';
// TODO: check doc_count: if it's 1, do not put it it to null bucket
export const partitionBucketsWithNullValues = (buckets: AggregationsCompositeBucket[]) => {
  return partition(buckets, (bucket) => Object.values(bucket.key).every((val) => val !== null));
};
