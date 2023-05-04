/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './types';
export const INFRA_ALERT_PREVIEW_PATH = '/api/infra/alerting/preview';

export const TOO_MANY_BUCKETS_PREVIEW_EXCEPTION = 'TOO_MANY_BUCKETS_PREVIEW_EXCEPTION';
export interface TooManyBucketsPreviewExceptionMetadata {
  TOO_MANY_BUCKETS_PREVIEW_EXCEPTION: boolean;
  maxBuckets: any;
}
export const isTooManyBucketsPreviewException = (
  value: any
): value is TooManyBucketsPreviewExceptionMetadata =>
  Boolean(value && value.TOO_MANY_BUCKETS_PREVIEW_EXCEPTION);

export const LINK_TO_METRICS_EXPLORER = '/app/metrics/explorer';
