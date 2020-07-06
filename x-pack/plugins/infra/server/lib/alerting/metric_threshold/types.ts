/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Unit } from '@elastic/datemath';
import { Comparator, AlertStates } from '../common/types';

export { Comparator, AlertStates };
export const METRIC_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.threshold';

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
