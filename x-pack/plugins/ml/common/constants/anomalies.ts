/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

export const PARTITION_FIELDS = ['partition_field', 'over_field', 'by_field'] as const;
