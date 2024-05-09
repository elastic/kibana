/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Aggregators,
  Comparator,
  CustomMetricExpressionParams,
} from '../../../../../common/custom_threshold_rule/types';
import { Evaluation } from '../lib/evaluate_rule';

const customThresholdNonCountCriterion: CustomMetricExpressionParams = {
  comparator: Comparator.GT,
  metrics: [
    {
      aggType: Aggregators.AVERAGE,
      name: 'A',
      field: 'test.metric.1',
    },
  ],
  timeSize: 1,
  timeUnit: 'm',
  threshold: [0],
};

export const alertResultsMultipleConditions: Array<Record<string, Evaluation>> = [
  {
    '*': {
      ...customThresholdNonCountCriterion,
      comparator: Comparator.GT,
      threshold: [0.75],
      currentValue: 1.0,
      timestamp: new Date().toISOString(),
      shouldFire: true,
      isNoData: false,
      bucketKey: { groupBy0: '*' },
    },
  },
  {
    '*': {
      ...customThresholdNonCountCriterion,
      comparator: Comparator.GT,
      threshold: [0.75],
      currentValue: 3.0,
      timestamp: new Date().toISOString(),
      shouldFire: true,
      isNoData: false,
      bucketKey: { groupBy0: '*' },
    },
  },
];
