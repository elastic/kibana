/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregators, Comparator } from '../../../../common/alerting/metrics';
import { MetricExpression } from '../types';
import { generateUniqueKey } from './generate_unique_key';

const mockedCriterion: MetricExpression = {
  aggType: Aggregators.COUNT,
  comparator: Comparator.LT,
  threshold: [2000, 5000],
  timeSize: 15,
  timeUnit: 'm',
};

describe('generateUniqueKey', () => {
  it('should generate unique key correctly', () => {
    const uniqueKey = generateUniqueKey(mockedCriterion);
    expect(uniqueKey).toBe('count<2000,5000');
  });
});
