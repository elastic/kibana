/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash';
import {
  MetricsUIAggregation,
  MetricsUIAggregationRT,
  ESSumBucketAggRT,
  ESTermsWithAggregationRT,
  ESDerivativeAggRT,
  ESBasicMetricAggRT,
} from '../../../../../common/inventory_models/types';
import { SnapshotCustomMetricInput } from '../../../../../common/http_api';

export const isMetricRate = (metric: MetricsUIAggregation | undefined): boolean => {
  if (!MetricsUIAggregationRT.is(metric)) {
    return false;
  }
  const values = Object.values(metric);
  return (
    values.some((agg) => ESDerivativeAggRT.is(agg)) &&
    values.some((agg) => ESBasicMetricAggRT.is(agg) && has(agg, 'max'))
  );
};

export const isCustomMetricRate = (customMetric: SnapshotCustomMetricInput) => {
  return customMetric.aggregation === 'rate';
};

export const isInterfaceRateAgg = (metric: MetricsUIAggregation | undefined) => {
  if (!MetricsUIAggregationRT.is(metric)) {
    return false;
  }
  const values = Object.values(metric);
  return (
    values.some((agg) => ESTermsWithAggregationRT.is(agg)) &&
    values.some((agg) => ESSumBucketAggRT.is(agg))
  );
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
