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

export const getSeverityCategoryForScore = (score: number): ANOMALY_SEVERITY | undefined => {
  if (score >= ANOMALY_THRESHOLD.CRITICAL) {
    return ANOMALY_SEVERITY.CRITICAL;
  } else if (score >= ANOMALY_THRESHOLD.MAJOR) {
    return ANOMALY_SEVERITY.MAJOR;
  } else if (score >= ANOMALY_THRESHOLD.MINOR) {
    return ANOMALY_SEVERITY.MINOR;
  } else if (score >= ANOMALY_THRESHOLD.WARNING) {
    return ANOMALY_SEVERITY.WARNING;
  } else {
    // Category is too low to include
    return ANOMALY_SEVERITY.LOW;
  }
};

export const formatAnomalyScore = (score: number) => {
  return Math.round(score);
};

export const formatOneDecimalPlace = (number: number) => {
  return Math.round(number * 10) / 10;
};

export const getFriendlyNameForPartitionId = (partitionId: string) => {
  return partitionId !== '' ? partitionId : 'unknown';
};

export const compareDatasetsByMaximumAnomalyScore = <
  Dataset extends { maximumAnomalyScore: number }
>(
  firstDataset: Dataset,
  secondDataset: Dataset
) => firstDataset.maximumAnomalyScore - secondDataset.maximumAnomalyScore;
