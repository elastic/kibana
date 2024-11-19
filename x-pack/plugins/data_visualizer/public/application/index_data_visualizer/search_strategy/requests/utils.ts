/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { Bucket } from '../../../../../common/types/field_stats';

/** Utility to calculate the correct sample size, whether or not _doc_count is set
 * and calculate the percentage (in fraction) for each bucket
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping-doc-count-field.html
 * @param aggResult
 */
export const processTopValues = (aggResult: object, sampledCount?: number) => {
  const topValuesBuckets: Bucket[] = isPopulatedObject<'buckets', Bucket[]>(aggResult, ['buckets'])
    ? aggResult.buckets
    : [];
  const sumOtherDocCount = isPopulatedObject<'sum_other_doc_count', number>(aggResult, [
    'sum_other_doc_count',
  ])
    ? aggResult.sum_other_doc_count
    : 0;
  const valuesInTopBuckets =
    topValuesBuckets?.reduce((prev, bucket) => bucket.doc_count + prev, 0) || 0;
  // We could use `aggregations.sample.sample_count.value` instead, but it does not always give a correct sum
  // See Github issue #144625
  const realNumberOfDocuments = valuesInTopBuckets + sumOtherDocCount;
  const topValues = topValuesBuckets.map((bucket) => ({
    ...bucket,
    doc_count: sampledCount
      ? Math.floor(bucket.doc_count * (sampledCount / realNumberOfDocuments))
      : bucket.doc_count,
    percent: bucket.doc_count / realNumberOfDocuments,
  }));

  return {
    topValuesSampleSize: realNumberOfDocuments,
    topValues,
  };
};
