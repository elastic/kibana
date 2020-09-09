/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const ANALYSIS_CONFIG_TYPE = {
  OUTLIER_DETECTION: 'outlier_detection',
  REGRESSION: 'regression',
  CLASSIFICATION: 'classification',
} as const;
export const DEFAULT_RESULTS_FIELD = 'ml';
