/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregators, Comparator } from '../../../../common/alerting/metrics';
import { MetricExpression } from '../types';
import { generateUniqueKey } from './generate_unique_key';

describe('generateUniqueKey', () => {
  const mockedCriteria: Array<[MetricExpression, string]> = [
    [
      {
        aggType: Aggregators.COUNT,
        comparator: Comparator.LT,
        threshold: [2000, 5000],
        timeSize: 15,
        timeUnit: 'm',
      },
      'count<2000,5000',
    ],
    [
      {
        aggType: Aggregators.CUSTOM,
        comparator: Comparator.GT_OR_EQ,
        threshold: [30],
        timeSize: 15,
        timeUnit: 'm',
      },
      'custom>=30',
    ],
    [
      {
        aggType: Aggregators.AVERAGE,
        comparator: Comparator.LT_OR_EQ,
        threshold: [500],
        timeSize: 15,
        timeUnit: 'm',
        metric: 'metric',
      },
      'avg(metric)<=500',
    ],
  ];
  it.each(mockedCriteria)('unique key of %p is %s', (input, output) => {
    const uniqueKey = generateUniqueKey(input);

    expect(uniqueKey).toBe(output);
  });
});
