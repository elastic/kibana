/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FieldValuePair,
  HistogramItem,
  RawResponseBase,
  SearchStrategyClientParams,
} from '../types';

export interface LatencyCorrelation extends FieldValuePair {
  correlation: number;
  histogram: HistogramItem[];
  ksTest: number;
}

export interface LatencyCorrelationSearchServiceProgress {
  started: number;
  loadedHistogramStepsize: number;
  loadedOverallHistogram: number;
  loadedFieldCandidates: number;
  loadedFieldValuePairs: number;
  loadedHistograms: number;
}

export interface LatencyCorrelationsParams {
  percentileThreshold: number;
  analyzeCorrelations: boolean;
}

export type LatencyCorrelationsRequestParams = LatencyCorrelationsParams &
  SearchStrategyClientParams;

export interface LatencyCorrelationsRawResponse extends RawResponseBase {
  log: string[];
  overallHistogram?: HistogramItem[];
  percentileThresholdValue?: number;
  latencyCorrelations?: LatencyCorrelation[];
}
