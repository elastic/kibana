/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AnomalyRecordDoc } from './anomalies';

/**
 * Base Interface for basic custom URL.
 */
export interface BaseUrlConfig {
  url_name: string;
  url_value: string;
}

export interface KibanaUrlConfig extends BaseUrlConfig {
  time_range: string;
}

export type UrlConfig = BaseUrlConfig | KibanaUrlConfig;

export interface CustomUrlAnomalyRecordDoc extends AnomalyRecordDoc {
  earliest: string;
  latest: string;
}
