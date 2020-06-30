/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Unit } from '@elastic/datemath';
export const METRIC_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.threshold';

export enum Comparator {
  GT = '>',
  LT = '<',
  GT_OR_EQ = '>=',
  LT_OR_EQ = '<=',
  BETWEEN = 'between',
  OUTSIDE_RANGE = 'outside',
}

export enum Aggregators {
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

export enum AlertStates {
  OK,
  ALERT,
  NO_DATA,
  ERROR,
}

interface BaseMetricExpressionParams {
  timeSize: number;
  timeUnit: Unit;
  sourceId?: string;
  threshold: number[];
  comparator: Comparator;
}

interface NonCountMetricExpressionParams extends BaseMetricExpressionParams {
  aggType: Exclude<Aggregators, Aggregators.COUNT>;
  metric: string;
}

interface CountMetricExpressionParams extends BaseMetricExpressionParams {
  aggType: 'count';
  metric: never;
}

export type MetricExpressionParams = NonCountMetricExpressionParams | CountMetricExpressionParams;
