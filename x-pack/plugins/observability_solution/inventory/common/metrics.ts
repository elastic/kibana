/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type MetricType =
  | 'count'
  | 'count_distinct'
  | 'sum'
  | 'avg'
  | 'weighted_avg'
  | 'max'
  | 'min'
  | 'percentile';

type FormatType = 'number' | 'duration' | 'bytes' | 'percentage' | 'currency';

interface Format {
  type: FormatType;
}

export interface BaseMetric {
  label: string;
  type: MetricType;
  grouping?: string;
  format?: Format;
  filter?: string;
}

export interface CountMetric extends BaseMetric {
  type: 'count';
}
export interface CountDistinctMetric extends BaseMetric {
  field: string;
  type: 'count_distinct';
}

export interface SumMetric extends BaseMetric {
  type: 'sum';
  field: string;
}

export interface AvgMetric extends BaseMetric {
  type: 'avg';
  field: string;
}

export interface WeightedAvgMetric extends BaseMetric {
  type: 'weighted_avg';
  field: string;
  by: string;
}

export interface MaxMetric extends BaseMetric {
  type: 'max';
  field: string;
}

export interface MinMetric extends BaseMetric {
  type: 'min';
  field: string;
}

export interface PercentileMetric extends BaseMetric {
  type: 'percentile';
  field: string;
  percentile: number;
}

export type Metric =
  | CountMetric
  | CountDistinctMetric
  | SumMetric
  | AvgMetric
  | WeightedAvgMetric
  | MaxMetric
  | MinMetric
  | PercentileMetric;

export interface MetricDefinition {
  filter?: string;
  metric: Metric;
}
