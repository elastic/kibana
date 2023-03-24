/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CustomMetricExpressionParams,
  MetricExpressionParams,
  NonCountMetricExpressionParams,
} from '../../../../../common/alerting/metrics';

export const isNotCountOrCustom = (
  metricExpressionParams: MetricExpressionParams
): metricExpressionParams is NonCountMetricExpressionParams => {
  const { aggType } = metricExpressionParams;
  return aggType !== 'count' && aggType !== 'custom';
};

export const isCustom = (
  metricExpressionParams: MetricExpressionParams
): metricExpressionParams is CustomMetricExpressionParams => {
  const { aggType } = metricExpressionParams;
  return aggType === 'custom';
};
