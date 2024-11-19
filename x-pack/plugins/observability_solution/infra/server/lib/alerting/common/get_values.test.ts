/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getEvaluationValues, getThresholds } from './get_values';

describe('getValue helpers', () => {
  describe('getThresholds', () => {
    test('should return undefined when there is at least one multiple thresholds comparator (such as in between)', () => {
      const criteriaMultipleConditions = [
        {
          aggType: 'avg',
          comparator: 'between',
          threshold: [4, 5],
          timeSize: 1,
          timeUnit: 'm',
          metric: 'system.cpu.system.pct',
        },
        {
          aggType: 'count',
          comparator: '>',
          threshold: [4],
          timeSize: 1,
          timeUnit: 'm',
        },
      ];
      expect(getThresholds(criteriaMultipleConditions)).toEqual(undefined);
    });

    test('should return threshold for multiple conditions', () => {
      const criteriaMultipleConditions = [
        {
          aggType: 'avg',
          comparator: '>',
          threshold: [1],
          timeSize: 1,
          timeUnit: 'm',
          metric: 'system.cpu.system.pct',
        },
        {
          aggType: 'count',
          comparator: '>',
          threshold: [4],
          timeSize: 1,
          timeUnit: 'm',
        },
      ];
      expect(getThresholds(criteriaMultipleConditions)).toEqual([1, 4]);
    });
  });

  describe('getEvaluationValues', () => {
    test('should return evaluation values ', () => {
      const alertResultsMultipleConditions = [
        {
          'host-0': {
            metric: 'cpu',
            comparator: '>',
            threshold: [1.0],
            timeSize: 1,
            timeUnit: 'm',
            currentValue: 0.85,
          },
        },
      ];
      expect(getEvaluationValues(alertResultsMultipleConditions, 'host-0')).toEqual([0.85]);
    });
  });
});
