/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { Filter, Query } from '@kbn/es-query';
import * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { SEARCH_QUERY_LANGUAGE, SearchQueryLanguage } from '@kbn/ml-query-utils';
import { DATA_COMPARISON_TYPE } from './constants';

export interface DataComparisonAppState {
  searchString?: Query['query'];
  searchQuery?: estypes.QueryDslQueryContainer;
  searchQueryLanguage: SearchQueryLanguage;
  filters?: Filter[];
}

export type DataComparisonFullAppState = Required<DataComparisonAppState>;
export type BasicAppState = DataComparisonFullAppState;

const defaultSearchQuery = {
  match_all: {},
};

export const getDefaultDataComparisonState = (
  overrides?: Partial<DataComparisonAppState>
): DataComparisonFullAppState => ({
  searchString: '',
  searchQuery: defaultSearchQuery,
  searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
  filters: [],
  ...overrides,
});

export interface Histogram {
  doc_count: number;
  key: string | number;
  percentage?: number;
}

export interface ComparisonHistogram extends Histogram {
  g: string;
}

// Show the overview table
export interface Feature {
  featureName: string;
  fieldType: DataComparisonField['type'];
  driftDetected: boolean;
  similarityTestPValue: number;
  productionHistogram: Histogram[];
  referenceHistogram: Histogram[];
  comparisonDistribution: ComparisonHistogram[];
}

export interface DataComparisonField {
  field: string;
  type: DataComparisonType;
  secondaryType: string;
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
  errorBody?: string;
}

export interface TimeRange {
  start: string | number;
  end: string | number;
}

export interface Range {
  min: number;
  max: number;
  interval: number;
}

export interface NumericDriftData {
  type: 'numeric';
  pValue: number;
  range?: Range;
  referenceHistogram: Histogram[];
  productionHistogram: Histogram[];
  secondaryType: string;
}
export interface CategoricalDriftData {
  type: 'categorical';
  driftedTerms: Histogram[];
  driftedSumOtherDocCount: number;
  baselineTerms: Histogram[];
  baselineSumOtherDocCount: number;
  secondaryType: string;
}

export const isNumericDriftData = (arg: any): arg is NumericDriftData => {
  return isPopulatedObject(arg, ['type']) && arg.type === DATA_COMPARISON_TYPE.NUMERIC;
};

export const isCategoricalDriftData = (arg: any): arg is CategoricalDriftData => {
  return isPopulatedObject(arg, ['type']) && arg.type === DATA_COMPARISON_TYPE.CATEGORICAL;
};

export type DataComparisonType = typeof DATA_COMPARISON_TYPE[keyof typeof DATA_COMPARISON_TYPE];
