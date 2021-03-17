/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ANOMALY_DETECTION_ENABLE_TIME_RANGE = 'ml:anomalyDetection:results:enableTimeDefaults';
export const ANOMALY_DETECTION_DEFAULT_TIME_RANGE = 'ml:anomalyDetection:results:timeDefaults';

export const DEFAULT_AD_RESULTS_TIME_FILTER = {
  from: 'now-15m',
  to: 'now',
};
export const DEFAULT_ENABLE_AD_RESULTS_TIME_FILTER = false;
