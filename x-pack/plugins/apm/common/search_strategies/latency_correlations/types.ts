/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  HistogramItem,
  RawResponseBase,
  SearchStrategyClientParams,
} from '../types';

export interface LatencyCorrelation {
  histogram: HistogramItem[];
  value: string;
  field: string;
  correlation: number;
  ksTest: number;
  duplicatedFields?: string[];
}

export interface AsyncSearchProviderProgress {
  started: number;
  loadedHistogramStepsize: number;
  loadedOverallHistogram: number;
  loadedFieldCanditates: number;
  loadedFieldValuePairs: number;
  loadedHistograms: number;
}

export interface LatencyCorrelationsParams extends SearchStrategyClientParams {
  percentileThreshold: number;
  analyzeCorrelations: boolean;
}

export interface LatencyCorrelationsRawResponse extends RawResponseBase {
  log: string[];
  overallHistogram?: HistogramItem[];
  percentileThresholdValue?: number;
  latencyCorrelations?: LatencyCorrelation[];
}
