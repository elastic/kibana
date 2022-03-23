/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash/fp';
import { Status } from '../../../common/detection_engine/schemas/common';
/**
 *
 * @param buckets Array you want to sort
 * @param sequence the order you want to follow
 * @param key key in the buckets you want to sort on
 * @returns buckets sorted by sequence
 */
export interface Bucket<T> {
  key: T;
}

export type Severity = 'high' | 'medium' | 'low';

export interface StatusBucket<T = Status> extends Bucket<T> {
  key: T;
  doc_count: number;
  statusBySeverity: StatusBySeverity;
}
export interface StatusBySeverity {
  doc_count_error_upper_bound: number;
  sum_other_doc_count: number;
  buckets: SeverityBucket[];
}

export interface SeverityBucket<T = Severity> extends Bucket<T> {
  key: T;
  doc_count: number;
}

export type BucketResult<T extends StatusBucket | SeverityBucket> = T extends StatusBucket
  ? StatusBucket
  : SeverityBucket;

type SortBucketWithGivenValue<
  T extends Status | Severity,
  U extends StatusBucket | SeverityBucket
> = (
  buckets: Array<BucketResult<U>>,
  sequence: T[],
  key: keyof Bucket<T>
) => Array<BucketResult<U>>;

export const sortBucketWithGivenValue = <
  T extends Status | Severity,
  U extends StatusBucket | SeverityBucket
>(
  buckets: Array<BucketResult<U>>,
  sequence: T[],
  key: keyof Bucket<T>
): Array<BucketResult<U>> => {
  const temp = cloneDeep(buckets);
  const bucketsResp: Array<BucketResult<U>> = [];
  temp.forEach((b, i) => {
    const itemKey = sequence.indexOf(b.key);

    if (itemKey >= 0) {
      bucketsResp[itemKey] = b;
    }
  });
  return bucketsResp;
};
