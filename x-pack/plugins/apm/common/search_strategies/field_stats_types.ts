/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { SearchStrategyParams } from './types';
import { isPopulatedObject } from '../utils/object_utils';

export interface FieldStatsCommonRequestParams extends SearchStrategyParams {
  samplerShardSize: number;
  runtimeFieldMap?: estypes.MappingRuntimeFields;
}

export interface FieldData {
  fieldName: string;
  existsInDocs: boolean;
  stats?: {
    sampleCount?: number;
    count?: number;
    cardinality?: number;
  };
}

export interface Field {
  fieldName: string;
  type: string;
  cardinality: number;
}

export interface HistogramField {
  fieldName: string;
  type: string;
}

export interface Distribution {
  percentiles: any[];
  minPercentile: number;
  maxPercentile: number;
}

export interface Aggs {
  [key: string]: any;
}

export interface TopValueBucket {
  key: string | number;
  doc_count: number;
}

export interface TopValuesStats {
  count?: number;
  fieldName: string;
  topValues: TopValueBucket[];
  topValuesSampleSize: number;
  isTopValuesSampled?: boolean;
  topValuesSamplerShardSize?: number;
}
export interface NumericFieldStats extends TopValuesStats {
  min: number;
  max: number;
  avg: number;
  median?: number;
  distribution?: Distribution;
}

export type KeywordFieldStats = TopValuesStats;
export const isErrorMessage = (arg: unknown): arg is Error => {
  return arg instanceof Error;
};

export const isTopValuesStats = (arg: unknown): arg is TopValuesStats => {
  return isPopulatedObject(arg, ['topValues', 'topValuesSampleSize']);
};
export interface DateFieldStats {
  fieldName: string;
  count: number;
  earliest: number;
  latest: number;
}

export interface BooleanFieldStats {
  fieldName: string;
  count: number;
  trueCount: number;
  falseCount: number;
  [key: string]: number | string;
}

export interface FieldExamples {
  fieldName: string;
  examples: any[];
}

export type FieldStats =
  | NumericFieldStats
  | KeywordFieldStats
  | BooleanFieldStats
  | DateFieldStats
  | FieldExamples;
