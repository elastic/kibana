/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Comparator } from '../../../../../common/alerting/metrics';
import { SnapshotMetricType } from '../../../../../common/inventory_models/types';
import { convertMetricValue } from './convert_metric_value';

export const createConditionScript = (
  conditionThresholds: number[],
  comparator: Comparator,
  metric: SnapshotMetricType
) => {
  const threshold = conditionThresholds.map((n) => convertMetricValue(metric, n));
  if (comparator === Comparator.BETWEEN && threshold.length === 2) {
    return `params.value > ${threshold[0]} && params.value < ${threshold[1]} ? 1 : 0`;
  }
  if (comparator === Comparator.OUTSIDE_RANGE && threshold.length === 2) {
    return `params.value < ${threshold[0]} && params.value > ${threshold[1]} ? 1 : 0`;
  }
  return `params.value ${comparator} ${threshold[0]} ? 1 : 0`;
};
