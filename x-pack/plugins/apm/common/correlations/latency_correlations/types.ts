/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FieldValuePair, HistogramItem } from '../types';

export interface LatencyCorrelation extends FieldValuePair {
  correlation: number;
  histogram?: HistogramItem[];
  ksTest: number;
  isFallbackResult?: boolean;
}

export interface LatencyCorrelationsResponse {
  ccsWarning: boolean;
  totalDocCount?: number;
  overallHistogram?: HistogramItem[];
  percentileThresholdValue?: number | null;
  latencyCorrelations?: LatencyCorrelation[];
}
