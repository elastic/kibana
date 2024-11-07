/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash';
import {
  MetricsUIAggregation,
  isBasicMetricAgg,
  isDerivativeAgg,
  isSumBucketAgg,
  isTermsWithAggregation,
} from '@kbn/metrics-data-access-plugin/common';
import { SnapshotCustomMetricInput } from '../../../../../common/http_api';

export const isMetricRate = (metric: MetricsUIAggregation | undefined): boolean => {
  if (!metric) {
    return false;
  }
  const values = Object.values(metric);
  return (
    values.some((agg) => isDerivativeAgg(agg)) &&
    values.some((agg) => isBasicMetricAgg(agg) && has(agg, 'max'))
  );
};

export const isCustomMetricRate = (customMetric: SnapshotCustomMetricInput) => {
  return customMetric.aggregation === 'rate';
};

export const isInterfaceRateAgg = (metric: MetricsUIAggregation | undefined) => {
  if (!metric) {
    return false;
  }
  const values = Object.values(metric);
  return (
    values.some((agg) => isTermsWithAggregation(agg)) && values.some((agg) => isSumBucketAgg(agg))
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
