/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface HistogramItem {
  key: number;
  doc_count: number;
}

export interface ResponseHitSource {
  [s: string]: unknown;
}

export interface ResponseHit {
  _source: ResponseHitSource;
}

export interface SearchServiceParams {
  environment: string;
  kuery: string;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  start?: string;
  end?: string;
  percentileThreshold?: number;
  analyzeCorrelations?: boolean;
}

export interface SearchServiceFetchParams extends SearchServiceParams {
  index: string;
  includeFrozen?: boolean;
}

export interface SearchServiceValue {
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
