/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogEntryFieldsMapping } from '../log_entry';
import { SearchSummaryBucket } from '../log_search_summary';
import { SummaryBucketSize } from '../log_summary';
import { TimedApiResponse } from './timed_api';

export interface SearchSummaryApiPostPayload {
  bucketSize: {
    unit: SummaryBucketSize;
    value: number;
  };
  fields: LogEntryFieldsMapping;
  indices: string[];
  start: number;
  end: number;
  query: string;
}

export interface SearchSummaryApiPostResponse extends TimedApiResponse {
  buckets: SearchSummaryBucket[];
}
