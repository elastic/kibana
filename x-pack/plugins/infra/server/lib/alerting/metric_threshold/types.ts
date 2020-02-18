/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MetricsExplorerAggregation } from '../../../../common/http_api/metrics_explorer';

export const METRIC_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.threshold';

export enum Comparator {
  GT = '>',
  LT = '<',
  GT_OR_EQ = '>=',
  LT_OR_EQ = '<=',
}

export enum AlertStates {
  OK,
  ALERT,
}

export interface MetricThresholdAlertTypeParams {
  aggregation: MetricsExplorerAggregation;
  metric: string;
  searchField: {
    name: string;
    value: string;
  };
  interval: string;
  indexPattern: string;
  threshold: number;
  comparator: Comparator;
}
