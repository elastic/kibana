/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JobFieldType } from './index';

export interface Percentile {
  percent: number;
  minValue: number;
  maxValue: number;
}

export interface FieldRequestConfig {
  fieldName: string;
  type: JobFieldType;
  cardinality: number;
  existsInDocs: boolean;
}

export interface DocumentCountBuckets {
  [key: string]: number;
}

export interface DocumentCounts {
  buckets?: DocumentCountBuckets;
  interval?: number;
}

export interface FieldVisStats {
  error?: Error;
  cardinality?: number;
  count?: number;
  sampleCount?: number;
  trueCount?: number;
  falseCount?: number;
  earliest?: number;
  latest?: number;
  documentCounts?: {
    buckets?: DocumentCountBuckets;
    interval?: number;
  };
  avg?: number;
  distribution?: {
    percentiles: Percentile[];
    maxPercentile: number;
    minPercentile: 0;
  };
  fieldName?: string;
  isTopValuesSampled?: boolean;
  max?: number;
  median?: number;
  min?: number;
  topValues?: Array<{ key: number | string; doc_count: number }>;
  topValuesSampleSize?: number;
  topValuesSamplerShardSize?: number;
  examples?: Array<string | object>;
  timeRangeEarliest?: number;
  timeRangeLatest?: number;
}

export interface DVErrorObject {
  causedBy?: string;
  message: string;
  statusCode?: number;
  fullError?: Error;
}
