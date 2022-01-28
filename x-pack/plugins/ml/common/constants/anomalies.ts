/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Labels displayed in the ML UI to indicate the severity of the anomaly according
 * to the normalized anomaly score.
 */
export enum ANOMALY_SEVERITY {
  /**
   * Anomalies are displayed as critical severity when the score is greater than or equal to 75.
   */
  CRITICAL = 'critical',

  /**
   * Anomalies are displayed as major severity when the score is greater than or equal to 50 and less than 75.
   */
  MAJOR = 'major',

  /**
   * Anomalies are displayed as minor severity when the score is greater than or equal to 25 and less than 50.
   */
  MINOR = 'minor',

  /**
   * Anomalies are displayed as warning severity when the score is greater than or equal to 3 and less than 25.
   * Note in some parts of the UI, warning severity is used when the score is greater than or equal to 0.
   */
  WARNING = 'warning',

  /**
   * Anomalies are displayed as low severity in some parts of the ML UI when the score is greater than or equal to 0 and less than 3.
   */
  LOW = 'low',

  /**
   * Anomalies are displayed as unknown severity if the anomaly score is not known.
   */
  UNKNOWN = 'unknown',
}

/**
 * Anomaly score numeric thresholds to indicate the severity of the anomaly.
 */
export enum ANOMALY_THRESHOLD {
  /**
   * Threshold at which anomalies are labelled in the UI as critical.
   */
  CRITICAL = 75,

  /**
   * Threshold at which anomalies are labelled in the UI as major.
   */
  MAJOR = 50,

  /**
   * Threshold at which anomalies are labelled in the UI as minor.
   */
  MINOR = 25,

  /**
   * Threshold at which anomalies are labelled in the UI as warning.
   */
  WARNING = 3,

  /**
   * Threshold at which anomalies are labelled in the UI as low.
   */
  LOW = 0,
}

/**
 * RGB hex codes used to indicate the severity of an anomaly according to its anomaly score.
 */
export const SEVERITY_COLORS = {
  /**
   * Color used in the UI to indicate a critical anomaly, with a score greater than or equal to 75.
   */
  CRITICAL: '#fe5050',

  /**
   * Color used in the UI to indicate a major anomaly, with a score greater than or equal to 50 and less than 75 .
   */
  MAJOR: '#fba740',

  /**
   * Color used in the UI to indicate a minor anomaly, with a score greater than or equal to 25 and less than 50.
   */
  MINOR: '#fdec25',

  /**
   * Color used in the UI to indicate a warning anomaly, with a score greater than or equal to 3 and less than 25.
   * Note in some parts of the UI, warning severity is used when the score is greater than or equal to 0.
   */
  WARNING: '#8bc8fb',

  /**
   * Color used in some parts of the UI to indicate a low severity anomaly, with a score greater than or equal to 0 and less than 3.
   */
  LOW: '#d2e9f7',

  /**
   * Color used in the UI to indicate an anomaly for which the score is unknown.
   */
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
