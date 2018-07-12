/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';

import { getMillisOfScale } from '../../../../../common/time';
import { SummaryState } from './reducer';

export const selectSummaryBuckets = (state: SummaryState) => state.buckets;

export const selectFirstSummaryBucket = createSelector(
  selectSummaryBuckets,
  summaryBuckets => (summaryBuckets.length > 0 ? summaryBuckets[0] : null)
);

export const selectLastSummaryBucket = createSelector(
  selectSummaryBuckets,
  summaryBuckets => (summaryBuckets.length > 0 ? summaryBuckets[summaryBuckets.length - 1] : null)
);

export const selectSummaryStartLoadingCount = (state: SummaryState) => state.start.loading;

export const selectSummaryEndLoadingCount = (state: SummaryState) => state.end.loading;

export const selectSummaryBucketSize = (state: SummaryState) => state.bucketSize;

export const selectSummaryBufferSize = (state: SummaryState) => state.bufferSize;

export const selectSummaryBucketsPerBuffer = createSelector(
  selectSummaryBufferSize,
  selectSummaryBucketSize,
  (bufferSize, bucketSize) => {
    const bucketSizeMillis = getMillisOfScale(bucketSize);
    const bufferSizeMillis = getMillisOfScale(bufferSize);
    return Math.ceil(bufferSizeMillis / bucketSizeMillis);
  }
);
