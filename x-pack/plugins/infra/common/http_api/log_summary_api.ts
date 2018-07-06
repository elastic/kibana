/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogSummaryBucket, LogSummaryFieldsMapping } from '../log_summary';
import { TimedApiResponse } from './timed_api';

export type BucketSize = 'y' | 'M' | 'w' | 'd' | 'h' | 'm' | 's';

export interface LogSummaryApiPostPayload {
  after: number;
  before: number;
  bucketSize: {
    unit: BucketSize;
    value: number;
  };
  fields: LogSummaryFieldsMapping;
  indices: string[];
  target: number;
}

export interface LogSummaryApiPostResponse extends TimedApiResponse {
  buckets: LogSummaryBucket[];
}
