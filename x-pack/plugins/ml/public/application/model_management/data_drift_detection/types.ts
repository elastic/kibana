/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';

export interface Histogram {
  doc_count: 0;
  key: string | number;
  percentage?: number;
}

export interface ComparisionHistogram extends Histogram {
  g: string;
}

// Show the overview table
export interface Feature {
  featureName: string;
  featureType: string;
  driftDetected: boolean;
  similarityTestPValue: number;
  productionHistogram: Histogram[];
  referenceHistogram: Histogram[];
  comparisonDistribution: ComparisionHistogram[];
}

export interface DataDriftField {
  field: string;
  type: 'numeric' | 'categoric' | 'unsupported';
  displayName: string;
}
export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  NOT_INITIATED = 'not_initiated',
}

export interface Result<T extends unknown> {
  status: FETCH_STATUS;
  data?: T;
  error?: string;
}

export interface Range {
  min: number;
  max: number;
  interval: number;
}

export interface NumericDriftData {
  type: 'numeric';
  pValue: number;
  range: Range;
  referenceHistogram: Histogram[];
  productionHistogram: Histogram[];
}
export interface CategoricalDriftData {
  type: 'categoric';
  driftedTerms: Histogram[];
  driftedSumOtherDocCount: number;
  baselineTerms: Histogram[];
  baselineSumOtherDocCount: number;
}

export const isNumericDriftData = (arg: any): arg is NumericDriftData => {
  return isPopulatedObject(arg, ['type']) && arg.type === 'numeric';
};

export const isCategoricalDriftData = (arg: any): arg is CategoricalDriftData => {
  return isPopulatedObject(arg, ['type']) && arg.type === 'categoric';
};
