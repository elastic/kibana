/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsQueryAlertParams, SearchType } from './types';
import { validateExpression } from './validation';

describe('expression params validation', () => {
  test('if index property is invalid should return proper error message', () => {
    const initialParams: EsQueryAlertParams<SearchType.esQuery> = {
      index: [],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
    };
    expect(validateExpression(initialParams).errors.index.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.index[0]).toBe('Index is required.');
  });

  test('if timeField property is not defined should return proper error message', () => {
    const initialParams: EsQueryAlertParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
    };
    expect(validateExpression(initialParams).errors.timeField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.timeField[0]).toBe('Time field is required.');
  });

  test('if esQuery property is invalid JSON should return proper error message', () => {
    const initialParams: EsQueryAlertParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
    };
    expect(validateExpression(initialParams).errors.esQuery.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.esQuery[0]).toBe('Query must be valid JSON.');
  });

  test('if esQuery property is invalid should return proper error message', () => {
    const initialParams: EsQueryAlertParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"aggs\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
    };
    expect(validateExpression(initialParams).errors.esQuery.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.esQuery[0]).toBe(`Query field is required.`);
  });

  test('if searchConfiguration property is not set should return proper error message', () => {
    const initialParams = {
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      searchType: SearchType.searchSource,
    } as EsQueryAlertParams<SearchType.searchSource>;
    expect(validateExpression(initialParams).errors.searchConfiguration.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.searchConfiguration[0]).toBe(
      `Search source configuration is required.`
    );
  });

  test('if threshold0 property is not set should return proper error message', () => {
    const initialParams: EsQueryAlertParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      threshold: [],
      timeWindowSize: 1,
      timeWindowUnit: 's',
      thresholdComparator: '<',
      timeField: '',
    };
    expect(validateExpression(initialParams).errors.threshold0.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.threshold0[0]).toBe('Threshold 0 is required.');
  });

  test('if threshold1 property is needed by thresholdComparator but not set should return proper error message', () => {
    const initialParams: EsQueryAlertParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      threshold: [1],
      timeWindowSize: 1,
      timeWindowUnit: 's',
      thresholdComparator: 'between',
      timeField: '',
    };
    expect(validateExpression(initialParams).errors.threshold1.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.threshold1[0]).toBe('Threshold 1 is required.');
  });

  test('if threshold0 property greater than threshold1 property should return proper error message', () => {
    const initialParams: EsQueryAlertParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      threshold: [10, 1],
      timeWindowSize: 1,
      timeWindowUnit: 's',
      thresholdComparator: 'between',
      timeField: '',
    };
    expect(validateExpression(initialParams).errors.threshold1.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.threshold1[0]).toBe(
      'Threshold 1 must be > Threshold 0.'
    );
  });

  test('if size property is < 0 should return proper error message', () => {
    const initialParams: EsQueryAlertParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n`,
      size: -1,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
    };
    expect(validateExpression(initialParams).errors.size.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.size[0]).toBe(
      'Size must be between 0 and 10,000.'
    );
  });

  test('if size property is > 10000 should return proper error message', () => {
    const initialParams: EsQueryAlertParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n`,
      size: 25000,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
    };
    expect(validateExpression(initialParams).errors.size.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.size[0]).toBe(
      'Size must be between 0 and 10,000.'
    );
  });
});
