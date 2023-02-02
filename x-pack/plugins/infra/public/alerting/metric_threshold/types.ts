/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterQuery, MetricExpressionParams } from '../../../common/alerting/metrics';
import { MetricsExplorerSeries } from '../../../common/http_api/metrics_explorer';
import { MetricsExplorerOptions } from '../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';

export interface AlertContextMeta {
  currentOptions?: Partial<MetricsExplorerOptions>;
  series?: MetricsExplorerSeries;
}

export type MetricExpression = Omit<
  MetricExpressionParams,
  'metric' | 'timeSize' | 'timeUnit' | 'metrics' | 'equation' | 'customMetrics'
> & {
  metric?: MetricExpressionParams['metric'];
  customMetrics?: MetricExpressionParams['customMetrics'];
  label?: MetricExpressionParams['label'];
  equation?: MetricExpressionParams['equation'];
  timeSize?: MetricExpressionParams['timeSize'];
  timeUnit?: MetricExpressionParams['timeUnit'];
};

export enum AGGREGATION_TYPES {
  COUNT = 'count',
  AVERAGE = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  RATE = 'rate',
  CARDINALITY = 'cardinality',
  P95 = 'p95',
  P99 = 'p99',
  CUSTOM = 'custom',
}

export interface MetricThresholdAlertParams {
  criteria?: MetricExpression[];
  groupBy?: string | string[];
  filterQuery?: string;
  sourceId?: string;
}

export interface ExpressionChartRow {
  timestamp: number;
  value: number;
}

export type ExpressionChartSeries = ExpressionChartRow[][];

export interface ExpressionChartData {
  id: string;
  series: ExpressionChartSeries;
}

export interface AlertParams {
  criteria: MetricExpression[];
  groupBy?: string | string[];
  filterQuery?: FilterQuery;
  sourceId: string;
  filterQueryText?: string;
  alertOnNoData?: boolean;
  alertOnGroupDisappear?: boolean;
  shouldDropPartialBuckets?: boolean;
}
