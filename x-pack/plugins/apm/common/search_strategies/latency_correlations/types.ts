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

// Type guard for populated array of LatencyCorrelation
export function isLatencyCorrelations(
  arg: unknown
): arg is LatencyCorrelation[] {
  return (
    Array.isArray(arg) &&
    arg.length > 0 &&
    arg.every(
      (d) =>
        typeof d === 'object' &&
        d !== null &&
        Object.keys(d).length === 5 &&
        typeof d.correlation === 'number' &&
        typeof d.fieldName === 'string' &&
        typeof d.fieldValue === 'string' &&
        Array.isArray(d.histogram) &&
        typeof d.ksTest === 'number'
    )
  );
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
