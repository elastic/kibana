/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { Filter, Query } from '@kbn/es-query';
import type { SearchQueryLanguage } from '@kbn/ml-query-utils';
import { SEARCH_QUERY_LANGUAGE } from '@kbn/ml-query-utils';
import type { Histogram } from '@kbn/ml-chi2test';

import { DATA_COMPARISON_TYPE } from './constants';

export interface DataComparisonQueryState {
  searchString?: Query['query'];
  searchQuery?: estypes.QueryDslQueryContainer;
  searchQueryLanguage: SearchQueryLanguage;
  filters?: Filter[];
}

export interface DataComparisonAppState extends DataComparisonQueryState {
  reference: DataComparisonQueryState;
  comparison: DataComparisonQueryState;
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
  reference: {
    searchString: '',
    searchQuery: defaultSearchQuery,
    searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
    filters: [],
  },
  comparison: {
    searchString: '',
    searchQuery: defaultSearchQuery,
    searchQueryLanguage: SEARCH_QUERY_LANGUAGE.KUERY,
    filters: [],
  },
  ...overrides,
});

export interface ComparisonHistogram extends Histogram {
  g: string;
}

interface Domain {
  min: number;
  max: number;
}
// Show the overview table
export interface Feature {
  featureName: string;
  fieldType: DataDriftField['type'];
  secondaryType: DataDriftField['secondaryType'];
  driftDetected: boolean;
  similarityTestPValue: number;
  comparisonHistogram: Histogram[];
  referenceHistogram: Histogram[];
  comparisonDistribution: ComparisonHistogram[];
  domain?: {
    doc_count: Domain;
    percentage: Domain;
    x: Domain;
  };
}

export interface DataDriftField {
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
  comparisonHistogram: Histogram[];
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

export type DataComparisonType = (typeof DATA_COMPARISON_TYPE)[keyof typeof DATA_COMPARISON_TYPE];
