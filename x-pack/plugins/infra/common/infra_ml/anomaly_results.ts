/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { ML_ANOMALY_THRESHOLD } from '@kbn/ml-anomaly-utils/anomaly_threshold';

export const getSeverityCategoryForScore = (score: number): ML_ANOMALY_SEVERITY | undefined => {
  if (score >= ML_ANOMALY_THRESHOLD.CRITICAL) {
    return ML_ANOMALY_SEVERITY.CRITICAL;
  } else if (score >= ML_ANOMALY_THRESHOLD.MAJOR) {
    return ML_ANOMALY_SEVERITY.MAJOR;
  } else if (score >= ML_ANOMALY_THRESHOLD.MINOR) {
    return ML_ANOMALY_SEVERITY.MINOR;
  } else if (score >= ML_ANOMALY_THRESHOLD.WARNING) {
    return ML_ANOMALY_SEVERITY.WARNING;
  } else {
    // Category is too low to include
    return ML_ANOMALY_SEVERITY.LOW;
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
