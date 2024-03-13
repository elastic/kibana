/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Query } from '@kbn/es-query';
import type { IKibanaSearchResponse } from '@kbn/data-plugin/common';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { TimeBucketsInterval } from '../services/time_buckets';

export interface RandomSamplingOption {
  mode: 'random_sampling';
  seed: string;
  probability: number;
}

export interface NormalSamplingOption {
  mode: 'normal_sampling';
  seed: string;
  shardSize: number;
}

export interface NoSamplingOption {
  mode: 'no_sampling';
  seed: string;
}

export type SamplingOption = RandomSamplingOption | NormalSamplingOption | NoSamplingOption;

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
  safeFieldName: string;
}

export function isValidField(arg: unknown): arg is Field {
  return isPopulatedObject(arg, ['fieldName', 'type']) && typeof arg.fieldName === 'string';
}

export interface Distribution {
  percentiles: Array<{ value?: number; percent: number; minValue: number; maxValue: number }>;
  minPercentile: number;
  maxPercentile: number;
}

export interface Bucket {
  doc_count: number;
}

export interface FieldStatsError {
  fieldName?: string;
  fields?: Field[];
  error: Error;
}

export const isIKibanaSearchResponse = (arg: unknown): arg is IKibanaSearchResponse => {
  return isPopulatedObject(arg, ['rawResponse']);
};

export interface NonSampledNumericFieldStats {
  fieldName: string;
  count?: number;
  min?: number;
  max?: number;
  avg?: number;
  median?: number;
  distribution?: Distribution;
}

export interface NumericFieldStats extends NonSampledNumericFieldStats {
  isTopValuesSampled: boolean;
  topValues: Bucket[];
  topValuesSampleSize: number;
  topValuesSamplerShardSize: number;
}

export interface StringFieldStats {
  fieldName: string;
  isTopValuesSampled: boolean;
  topValues: Bucket[];
  topValuesSampleSize?: number;
  topValuesSamplerShardSize?: number;
}

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
  topValues: Bucket[];
  topValuesSampleSize: number;
}

export interface DocumentCountStats {
  interval?: number;
  buckets?: { [key: string]: number };
  timeRangeEarliest?: number;
  timeRangeLatest?: number;
  totalCount: number;
  probability?: number | null;
  took?: number;
  randomlySampled?: boolean;
}

export interface FieldExamples {
  fieldName: string;
  examples: unknown[];
}

export interface AggHistogram {
  histogram: estypes.AggregationsHistogramAggregation;
}

export interface AggTerms {
  terms: {
    field: string;
    size: number;
  };
}

export interface NumericDataItem {
  key: number;
  key_as_string?: string;
  doc_count: number;
}

export interface NumericChartData {
  data: NumericDataItem[];
  id: string;
  interval: number;
  stats: [number, number];
  type: 'numeric';
}

export interface OrdinalDataItem {
  key: string;
  key_as_string?: string;
  doc_count: number;
}

export interface OrdinalChartData {
  type: 'ordinal' | 'boolean';
  cardinality: number;
  data: OrdinalDataItem[];
  id: string;
}

export interface UnsupportedChartData {
  id: string;
  type: 'unsupported';
}

export interface AggCardinality {
  cardinality: estypes.AggregationsCardinalityAggregation;
}

export type ChartRequestAgg = AggHistogram | AggCardinality | AggTerms;

export type ChartData = NumericChartData | OrdinalChartData | UnsupportedChartData;

export type BatchStats =
  | NonSampledNumericFieldStats
  | NumericFieldStats
  | StringFieldStats
  | BooleanFieldStats
  | DateFieldStats
  | DocumentCountStats
  | FieldExamples;

export type FieldStats =
  | NonSampledNumericFieldStats
  | NumericFieldStats
  | StringFieldStats
  | BooleanFieldStats
  | DateFieldStats
  | FieldExamples
  | FieldStatsError;

export function isValidFieldStats(arg: unknown): arg is FieldStats {
  return isPopulatedObject(arg, ['fieldName', 'type', 'count']);
}

export interface FieldStatsCommonRequestParams {
  index: string;
  timeFieldName?: string;
  earliestMs?: number | undefined;
  latestMs?: number | undefined;
  runtimeFieldMap?: estypes.MappingRuntimeFields;
  intervalMs?: number;
  query: estypes.QueryDslQueryContainer;
  maxExamples?: number;
  samplingProbability: number | null;
  browserSessionSeed: number;
  samplingOption: SamplingOption;
  embeddableExecutionContext?: KibanaExecutionContext;
}

export type SupportedAggs = Set<string>;

export interface OverallStatsSearchStrategyParams {
  sessionId?: string;
  earliest?: number;
  latest?: number;
  aggInterval: TimeBucketsInterval;
  intervalMs?: number;
  searchQuery: Query['query'];
  index: string;
  timeFieldName?: string;
  runtimeFieldMap?: estypes.MappingRuntimeFields;
  aggregatableFields: Array<{
    name: string;
    supportedAggs: SupportedAggs;
  }>;
  nonAggregatableFields: string[];
  fieldsToFetch?: string[];
  browserSessionSeed: number;
  samplingOption: SamplingOption;
  embeddableExecutionContext?: KibanaExecutionContext;
}

export interface FieldStatsSearchStrategyReturnBase {
  progress: DataStatsFetchProgress;
  fieldStats: Map<string, FieldStats> | undefined;
  startFetch: () => void;
  cancelFetch: () => void;
}

export interface DataStatsFetchProgress {
  error?: Error;
  isRunning: boolean;
  loaded: number;
  total: number;
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
  safeFieldName: string;
  supportedAggs?: Set<string>;
}

export interface Aggs {
  [key: string]: estypes.AggregationsAggregationContainer;
}

export const EMBEDDABLE_SAMPLER_OPTION = {
  RANDOM: 'random_sampling',
  NORMAL: 'normal_sampling',
};
export type FieldStatsEmbeddableSamplerOption =
  typeof EMBEDDABLE_SAMPLER_OPTION[keyof typeof EMBEDDABLE_SAMPLER_OPTION];

export function isRandomSamplingOption(arg: SamplingOption): arg is RandomSamplingOption {
  return arg.mode === 'random_sampling';
}
export function isNormalSamplingOption(arg: SamplingOption): arg is NormalSamplingOption {
  return arg.mode === 'normal_sampling';
}
export function isNoSamplingOption(arg: SamplingOption): arg is NoSamplingOption {
  return arg.mode === 'no_sampling' || (arg.mode === 'random_sampling' && arg.probability === 1);
}
