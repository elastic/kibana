/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ML_ALERT_TYPES = {
  ANOMALY_DETECTION: 'xpack.ml.anomaly_detection_alert',
  AD_JOBS_HEALTH: 'xpack.ml.anomaly_detection_jobs_health',
} as const;

export type MlAlertType = typeof ML_ALERT_TYPES[keyof typeof ML_ALERT_TYPES];

export const ALERT_PREVIEW_SAMPLE_SIZE = 5;

export const TOP_N_BUCKETS_COUNT = 1;

export const ALL_JOBS_SELECTION = '*';
