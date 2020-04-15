/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexThresholdAlertParams } from './types';
import { validateExpression } from './validation';

describe('expression params validation', () => {
  test('if index property is invalid should return proper error message', () => {
    const initialParams: IndexThresholdAlertParams = {
      index: [],
      aggType: 'count',
      threshold: [],
      timeWindowSize: 1,
      timeWindowUnit: 's',
    };
    expect(validateExpression(initialParams).errors.index.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.index[0]).toBe('Index is required.');
  });
  test('if timeField property is not defined should return proper error message', () => {
    const initialParams: IndexThresholdAlertParams = {
      index: ['test'],
      aggType: 'count',
      threshold: [],
      timeWindowSize: 1,
      timeWindowUnit: 's',
    };
    expect(validateExpression(initialParams).errors.timeField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.timeField[0]).toBe('Time field is required.');
  });
  test('if aggField property is invalid should return proper error message', () => {
    const initialParams: IndexThresholdAlertParams = {
      index: ['test'],
      aggType: 'avg',
      threshold: [],
      timeWindowSize: 1,
      timeWindowUnit: 's',
    };
    expect(validateExpression(initialParams).errors.aggField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.aggField[0]).toBe(
      'Aggregation field is required.'
    );
  });
  test('if termSize property is not set should return proper error message', () => {
    const initialParams: IndexThresholdAlertParams = {
      index: ['test'],
      aggType: 'count',
      groupBy: 'top',
      threshold: [],
      timeWindowSize: 1,
      timeWindowUnit: 's',
    };
    expect(validateExpression(initialParams).errors.termSize.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.termSize[0]).toBe('Term size is required.');
  });
  test('if termField property is not set should return proper error message', () => {
    const initialParams: IndexThresholdAlertParams = {
      index: ['test'],
      aggType: 'count',
      groupBy: 'top',
      threshold: [],
      timeWindowSize: 1,
      timeWindowUnit: 's',
    };
    expect(validateExpression(initialParams).errors.termField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.termField[0]).toBe('Term field is required.');
  });
  test('if threshold0 property is not set should return proper error message', () => {
    const initialParams: IndexThresholdAlertParams = {
      index: ['test'],
      aggType: 'count',
      groupBy: 'top',
      threshold: [],
      timeWindowSize: 1,
      timeWindowUnit: 's',
      thresholdComparator: '<',
    };
    expect(validateExpression(initialParams).errors.threshold0.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.threshold0[0]).toBe('Threshold0 is required.');
  });
  test('if threshold1 property is not set should return proper error message', () => {
    const initialParams: IndexThresholdAlertParams = {
      index: ['test'],
      aggType: 'count',
      groupBy: 'top',
      threshold: [1],
      timeWindowSize: 1,
      timeWindowUnit: 's',
      thresholdComparator: 'between',
    };
    expect(validateExpression(initialParams).errors.threshold1.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.threshold1[0]).toBe('Threshold1 is required.');
  });
});
