/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsQueryAlertParams } from './types';
import { validateExpression } from './validation';

describe('expression params validation', () => {
  test('if index property is invalid should return proper error message', () => {
    const initialParams: EsQueryAlertParams = {
      index: [],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
    };
    expect(validateExpression(initialParams).errors.index.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.index[0]).toBe('Index is required.');
  });

  test('if timeField property is not defined should return proper error message', () => {
    const initialParams: EsQueryAlertParams = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
    };
    expect(validateExpression(initialParams).errors.timeField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.timeField[0]).toBe('Time field is required.');
  });

  test('if esQuery property is invalid JSON should return proper error message', () => {
    const initialParams: EsQueryAlertParams = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n`,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
    };
    expect(validateExpression(initialParams).errors.esQuery.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.esQuery[0]).toBe('Query must be valid JSON.');
  });

  test('if esQuery property is invalid should return proper error message', () => {
    const initialParams: EsQueryAlertParams = {
      index: ['test'],
      esQuery: `{\n  \"aggs\":{\n    \"match_all\" : {}\n  }\n}`,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
    };
    expect(validateExpression(initialParams).errors.esQuery.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.esQuery[0]).toBe(`Query field is required.`);
  });

  test('if threshold0 property is not set should return proper error message', () => {
    const initialParams: EsQueryAlertParams = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      threshold: [],
      timeWindowSize: 1,
      timeWindowUnit: 's',
      thresholdComparator: '<',
    };
    expect(validateExpression(initialParams).errors.threshold0.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.threshold0[0]).toBe('Threshold 0 is required.');
  });

  test('if threshold1 property is needed by thresholdComparator but not set should return proper error message', () => {
    const initialParams: EsQueryAlertParams = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      threshold: [1],
      timeWindowSize: 1,
      timeWindowUnit: 's',
      thresholdComparator: 'between',
    };
    expect(validateExpression(initialParams).errors.threshold1.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.threshold1[0]).toBe('Threshold 1 is required.');
  });

  test('if threshold0 property greater than threshold1 property should return proper error message', () => {
    const initialParams: EsQueryAlertParams = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      threshold: [10, 1],
      timeWindowSize: 1,
      timeWindowUnit: 's',
      thresholdComparator: 'between',
    };
    expect(validateExpression(initialParams).errors.threshold1.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.threshold1[0]).toBe(
      'Threshold 1 must be > Threshold 0.'
    );
  });
});
