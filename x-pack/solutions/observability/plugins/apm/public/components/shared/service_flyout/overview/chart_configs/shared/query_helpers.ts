/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { TIME_BUCKET_FIELD } from './constants';

export const TRANSACTION_COUNT_COLUMN = 'transactions';
export const THROUGHPUT_COLUMN = 'throughput';
/** Transactions per minute, the same unit the APM service overview page labels throughput with. */
export const THROUGHPUT_SUFFIX = ' tpm';

/**
 * Turns a per-bucket transaction count into transactions per minute, the unit the APM throughput API
 * reports through its `rate` aggregation, so both charts plot the same numbers.
 */
export function pipeThroughputPerMinute(query: ComposerQuery, bucketSizeInSeconds: number): void {
  const bucketSizeInMinutes = Number((bucketSizeInSeconds / 60).toFixed(6));
  query.pipe(
    `EVAL ${THROUGHPUT_COLUMN} = TO_DOUBLE(${TRANSACTION_COUNT_COLUMN}) / ${bucketSizeInMinutes}`
  );
  query.pipe(`KEEP ${TIME_BUCKET_FIELD}, ${THROUGHPUT_COLUMN}`);
  query.pipe(`SORT ${TIME_BUCKET_FIELD}`);
}
