/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Unit } from '@elastic/datemath';
import {
  Aggregators,
  AlertStates,
  Comparator,
  METRIC_THRESHOLD_ALERT_TYPE_ID,
} from '../../../../common/alerting/metrics';

export { Comparator, AlertStates, METRIC_THRESHOLD_ALERT_TYPE_ID };

interface BaseMetricExpressionParams {
  timeSize: number;
  timeUnit: Unit;
  sourceId?: string;
  threshold: number[];
  comparator: Comparator;
  warningComparator?: Comparator;
  warningThreshold?: number[];
}

export interface NonCountMetricExpressionParams extends BaseMetricExpressionParams {
  aggType: Exclude<Aggregators, Aggregators.COUNT>;
  metric: string;
}

export interface CountMetricExpressionParams extends BaseMetricExpressionParams {
  aggType: Aggregators.COUNT;
  metric: never;
}

export type MetricExpressionParams = NonCountMetricExpressionParams | CountMetricExpressionParams;
