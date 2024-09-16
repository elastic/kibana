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

type MetricFormatType = 'number' | 'duration' | 'bytes' | 'percentage' | 'currency';

interface MetricFormat {
  type: MetricFormatType;
}

interface MetricEntityBase<
  TMetricType extends MetricType,
  TAdditionalProperties extends Record<string, any> = {}
> {
  type: string;
  label: string;
  metric: {
    type: TMetricType;
    format: MetricFormat;
    grouping?: {
      field?: string;
    };
  } & TAdditionalProperties;
}

type CountMetric = MetricEntityBase<'count', {}>;
type CountDistinctMetric = MetricEntityBase<'count_distinct', { field: string }>;
type AvgMetric = MetricEntityBase<'avg', { field: string }>;
type WeightedAvgMetric = MetricEntityBase<'weighted_avg', { field: string; weight: string }>;
type SumMetric = MetricEntityBase<'sum', { field: string }>;
type MinMetric = MetricEntityBase<'min', { field: string }>;
type MaxMetric = MetricEntityBase<'max', { field: string }>;
type PercentileMetric = MetricEntityBase<'percentile', { field: string; percentile: number }>;

export interface MetricDefinition {
  filter?: string;
  metric: Metric;
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
