/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Aggregators,
  CustomThresholdExpressionMetric,
} from '../../../../../common/custom_threshold_rule/types';

export const getLensOperationFromRuleMetric = (metric: CustomThresholdExpressionMetric): string => {
  const { aggType, field, filter } = metric;
  let operation: string = aggType;
  const operationArgs: string[] = [];
  const aggFilter = JSON.stringify(filter || '').replace(/"|\\/g, '');

  if (aggType === Aggregators.RATE) {
    return `counter_rate(max(${field}), kql='${aggFilter}')`;
  }

  if (aggType === Aggregators.AVERAGE) operation = 'average';
  if (aggType === Aggregators.CARDINALITY) operation = 'unique_count';
  if (aggType === Aggregators.P95 || aggType === Aggregators.P99) operation = 'percentile';
  if (aggType === Aggregators.COUNT) operation = 'count';

  let sourceField = field;

  if (aggType === Aggregators.COUNT) {
    sourceField = '___records___';
  }

  operationArgs.push(sourceField || '');

  if (aggType === Aggregators.P95) {
    operationArgs.push('percentile=95');
  }

  if (aggType === Aggregators.P99) {
    operationArgs.push('percentile=99');
  }

  if (aggFilter) operationArgs.push(`kql='${aggFilter}'`);

  return operation + '(' + operationArgs.join(', ') + ')';
};

export const getBufferThreshold = (threshold?: number): string =>
  (Math.ceil((threshold || 0) * 1.1 * 100) / 100).toFixed(2).toString();

export const LensFieldFormat = {
  NUMBER: 'number',
  PERCENT: 'percent',
  BITS: 'bits',
} as const;

export const lensFieldFormatter = (
  metrics: CustomThresholdExpressionMetric[]
): typeof LensFieldFormat[keyof typeof LensFieldFormat] => {
  if (metrics.length < 1 || !metrics[0].field) return LensFieldFormat.NUMBER;
  const firstMetricField = metrics[0].field;
  if (firstMetricField.endsWith('.pct')) return LensFieldFormat.PERCENT;
  if (firstMetricField.endsWith('.bytes')) return LensFieldFormat.BITS;
  return LensFieldFormat.NUMBER;
};

export const isRate = (metrics: CustomThresholdExpressionMetric[]): boolean =>
  Boolean(metrics.length > 0 && metrics[0].aggType === Aggregators.RATE);
