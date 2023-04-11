/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { AnomalyRecordDoc } from './anomalies';

/**
 * Base Interface for basic custom URL.
 */
export interface BaseUrlConfig {
  url_name: string;
  url_value: string;
}

export interface KibanaUrlConfig extends BaseUrlConfig {
  time_range?: string;
}

export interface KibanaUrlConfigWithTimeRange extends BaseUrlConfig {
  time_range: string;
}

export type UrlConfig = BaseUrlConfig | KibanaUrlConfig;

export interface CustomUrlAnomalyRecordDoc extends AnomalyRecordDoc {
  earliest: string;
  latest: string;
}

export function isKibanaUrlConfigWithTimeRange(arg: unknown): arg is KibanaUrlConfigWithTimeRange {
  return (
    isPopulatedObject(arg, ['url_name', 'url_value', 'time_range']) &&
    typeof arg.time_range === 'string'
  );
}
