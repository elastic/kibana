/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Query } from '@kbn/es-query';
import { isPopulatedObject } from '../utils/object_utils';
import { IKibanaSearchResponse } from '../../../../../src/plugins/data/common';
import { TimeBucketsInterval } from '../services/time_buckets';

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

export interface HistogramField {
  fieldName: string;
  type: string;
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

export interface NumericFieldStats {
  fieldName: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  isTopValuesSampled: boolean;
  topValues: Bucket[];
  topValuesSampleSize: number;
  topValuesSamplerShardSize: number;
  median?: number;
  distribution?: Distribution;
}

export interface StringFieldStats {
  fieldName: string;
  isTopValuesSampled: boolean;
  topValues: Bucket[];
  topValuesSampleSize: number;
  topValuesSamplerShardSize: number;
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
  [key: string]: number | string;
}

export interface DocumentCountStats {
  interval: number;
  buckets: { [key: string]: number };
  timeRangeEarliest: number;
  timeRangeLatest: number;
}

export interface FieldExamples {
  fieldName: string;
  examples: unknown[];
}

export interface NumericColumnStats {
  interval: number;
  min: number;
  max: number;
}
export type NumericColumnStatsMap = Record<string, NumericColumnStats>;

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
  | NumericFieldStats
  | StringFieldStats
  | BooleanFieldStats
  | DateFieldStats
  | DocumentCountStats
  | FieldExamples;

export type FieldStats =
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
  samplerShardSize: number;
  timeFieldName?: string;
  earliestMs?: number | undefined;
  latestMs?: number | undefined;
  runtimeFieldMap?: estypes.MappingRuntimeFields;
  intervalMs?: number;
  query: estypes.QueryDslQueryContainer;
  maxExamples?: number;
}

export interface OverallStatsSearchStrategyParams {
  sessionId?: string;
  earliest?: number;
  latest?: number;
  aggInterval: TimeBucketsInterval;
  intervalMs?: number;
  searchQuery: Query['query'];
  samplerShardSize: number;
  index: string;
  timeFieldName?: string;
  runtimeFieldMap?: estypes.MappingRuntimeFields;
  aggregatableFields: string[];
  nonAggregatableFields: string[];
  fieldsToFetch?: string[];
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
}

export interface Aggs {
  [key: string]: estypes.AggregationsAggregationContainer;
}
