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

export interface Field {
  fieldName: string;
  type: string;
  cardinality: number;
}

export interface Aggs {
  [key: string]: estypes.AggregationsAggregationContainer;
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

export const isTopValuesStats = (arg: unknown): arg is TopValuesStats => {
  return isPopulatedObject(arg, ['topValues', 'topValuesSampleSize']);
};

export interface NumericFieldStats extends TopValuesStats {
  min: number;
  max: number;
  avg: number;
  median?: number;
}

export type KeywordFieldStats = TopValuesStats;

export interface BooleanFieldStats {
  fieldName: string;
  count: number;
  trueCount: number;
  falseCount: number;
  [key: string]: number | string;
}

export type FieldStats =
  | NumericFieldStats
  | KeywordFieldStats
  | BooleanFieldStats;
