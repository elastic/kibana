/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOG_RATE_ANALYSIS_P_VALUE_THRESHOLD = 0.02;

export const LOG_RATE_ANALYSIS_TYPE = {
  SPIKE: 'spike',
  DIP: 'dip',
} as const;
export type LogRateAnalysisType =
  typeof LOG_RATE_ANALYSIS_TYPE[keyof typeof LOG_RATE_ANALYSIS_TYPE];

// For the technical preview of Log Rate Analysis we use a hard coded seed.
// In future versions we might use a user specific seed or let the user costumise it.
export const RANDOM_SAMPLER_SEED = 3867412;
