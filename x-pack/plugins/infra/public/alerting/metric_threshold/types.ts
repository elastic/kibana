/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MetricExpressionParams,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from '../../../server/lib/alerting/metric_threshold/types';
import { MetricsExplorerOptions } from '../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';
import { FilterQuery } from '../../../common/alerting/metrics';
import { MetricsExplorerSeries } from '../../../common/http_api/metrics_explorer';

export interface AlertContextMeta {
  currentOptions?: Partial<MetricsExplorerOptions>;
  series?: MetricsExplorerSeries;
}

export type MetricExpression = Omit<MetricExpressionParams, 'metric' | 'timeSize' | 'timeUnit'> & {
  metric?: MetricExpressionParams['metric'];
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
