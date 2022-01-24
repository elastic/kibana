/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum ANOMALY_SEVERITY {
  CRITICAL = 'critical',
  MAJOR = 'major',
  MINOR = 'minor',
  WARNING = 'warning',
  LOW = 'low',
  UNKNOWN = 'unknown',
}

export enum ANOMALY_THRESHOLD {
  CRITICAL = 75,
  MAJOR = 50,
  MINOR = 25,
  WARNING = 3,
  LOW = 0,
}

export const SEVERITY_COLORS = {
  CRITICAL: '#fe5050',
  MAJOR: '#fba740',
  MINOR: '#fdec25',
  WARNING: '#8bc8fb',
  LOW: '#d2e9f7',
  BLANK: '#ffffff',
};

export const SEVERITY_COLOR_RAMP = [
  {
    stop: ANOMALY_THRESHOLD.LOW,
    color: SEVERITY_COLORS.WARNING,
  },
  {
    stop: ANOMALY_THRESHOLD.MINOR,
    color: SEVERITY_COLORS.MINOR,
  },
  {
    stop: ANOMALY_THRESHOLD.MAJOR,
    color: SEVERITY_COLORS.MAJOR,
  },
  {
    stop: ANOMALY_THRESHOLD.CRITICAL,
    color: SEVERITY_COLORS.CRITICAL,
  },
];

export const ANOMALY_RESULT_TYPE = {
  BUCKET: 'bucket',
  RECORD: 'record',
  INFLUENCER: 'influencer',
} as const;

export const PARTITION_FIELDS = ['partition_field', 'over_field', 'by_field'] as const;
export const JOB_ID = 'job_id';
export const PARTITION_FIELD_VALUE = 'partition_field_value';
