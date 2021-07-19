/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

export interface Bucket {
  doc_count: number;
}

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
  documentCounts: {
    interval: number;
    buckets: { [key: string]: number };
  };
}

export interface FieldExamples {
  fieldName: string;
  examples: any[];
}

export interface NumericColumnStats {
  interval: number;
  min: number;
  max: number;
}
export type NumericColumnStatsMap = Record<string, NumericColumnStats>;

export interface AggHistogram {
  histogram: {
    field: string;
    interval: number;
  };
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

export interface FieldAggCardinality {
  field: string;
  percent?: any;
}

export interface ScriptAggCardinality {
  script: any;
}

export interface AggCardinality {
  cardinality: FieldAggCardinality | ScriptAggCardinality;
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
