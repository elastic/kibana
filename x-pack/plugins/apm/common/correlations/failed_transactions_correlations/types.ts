/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldValuePair, HistogramItem } from '../types';

import { CORRELATIONS_IMPACT_THRESHOLD } from './constants';
import { FieldStats } from '../field_stats_types';

export interface FailedTransactionsCorrelation extends FieldValuePair {
  doc_count: number;
  bg_count: number;
  score: number;
  pValue: number | null;
  normalizedScore: number;
  failurePercentage: number;
  successPercentage: number;
  histogram: HistogramItem[];
}

export type FailedTransactionsCorrelationsImpactThreshold =
  typeof CORRELATIONS_IMPACT_THRESHOLD[keyof typeof CORRELATIONS_IMPACT_THRESHOLD];

export interface FailedTransactionsCorrelationsResponse {
  ccsWarning: boolean;
  failedTransactionsCorrelations?: FailedTransactionsCorrelation[];
  percentileThresholdValue?: number;
  overallHistogram?: HistogramItem[];
  errorHistogram?: HistogramItem[];
  fieldStats?: FieldStats[];
  fallbackResult?: FailedTransactionsCorrelation;
}
