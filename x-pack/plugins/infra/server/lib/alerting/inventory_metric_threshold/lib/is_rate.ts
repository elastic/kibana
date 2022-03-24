/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash';
import { MetricsUIAggregation } from '../../../../../common/inventory_models/types';
import { SnapshotCustomMetricInput } from '../../../../../common/http_api';

export const isMetricRate = (metric: MetricsUIAggregation | undefined): boolean => {
  if (metric != null) {
    const values = Object.values(metric);
    return values.some((agg) => has(agg, 'derivative')) && values.some((agg) => has(agg, 'max'));
  }
  return false;
};

export const isCustomMetricRate = (customMetric: SnapshotCustomMetricInput) => {
  return customMetric.aggregation === 'rate';
};

export const isInterfaceRateAgg = (metric: MetricsUIAggregation | undefined) => {
  if (metric != null) {
    const values = Object.values(metric);
    return values.some((agg) => has(agg, 'terms')) && values.some((agg) => has(agg, 'sum_bucket'));
  }
  return false;
};

export const isRate = (
  metric: MetricsUIAggregation | undefined,
  customMetric?: SnapshotCustomMetricInput
) => {
  return (
    isMetricRate(metric) ||
    isInterfaceRateAgg(metric) ||
    (customMetric && isCustomMetricRate(customMetric))
  );
};
