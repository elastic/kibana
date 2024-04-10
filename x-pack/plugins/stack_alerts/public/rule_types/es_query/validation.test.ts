/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EsQueryRuleParams, SearchType } from './types';
import { validateExpression, hasExpressionValidationErrors } from './validation';

describe('expression params validation', () => {
  test('if params are not set should return a proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> =
      {} as EsQueryRuleParams<SearchType.esQuery>;
    expect(validateExpression(initialParams).errors.searchType.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.searchType[0].toString()).toBe(
      'Query type is required.'
    );
  });

  test('if index property is invalid should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: [],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'all',
    };
    expect(validateExpression(initialParams).errors.index.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.index[0].toString()).toBe('Index is required.');
  });

  test('if timeField property is not defined should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'all',
    };
    expect(validateExpression(initialParams).errors.timeField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.timeField[0].toString()).toBe(
      'Time field is required.'
    );
  });

  test('if aggField property is invalid should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'avg',
      groupBy: 'all',
    };
    expect(validateExpression(initialParams).errors.aggField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.aggField[0].toString()).toBe(
      'Aggregation field is required.'
    );
  });

  test('if termSize property is not set should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'top',
    };
    expect(validateExpression(initialParams).errors.termSize.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.termSize[0].toString()).toBe(
      'Term size is required.'
    );
  });
  test('if termField property is not set should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'top',
      termSize: 10,
    };
    expect(validateExpression(initialParams).errors.termField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.termField[0].toString()).toBe(
      'Term field is required.'
    );
  });

  test('if termField property is an array but has no items should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'top',
      termSize: 10,
      termField: [],
    };
    expect(validateExpression(initialParams).errors.termField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.termField[0].toString()).toBe(
      'Term field is required.'
    );
  });

  test('if termField property is an array but has more than 4 items, should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'top',
      termSize: 10,
      termField: ['term', 'term2', 'term3', 'term4', 'term5'],
    };
    expect(validateExpression(initialParams).errors.termField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.termField[0].toString()).toBe(
      'Cannot select more than 4 terms'
    );
  });

  test('if esQuery property is invalid JSON should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'all',
    };
    expect(validateExpression(initialParams).errors.esQuery.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.esQuery[0].toString()).toBe(
      'Query must be valid JSON.'
    );
  });

  test('if esQuery property is invalid should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"aggs\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'all',
    };
    expect(validateExpression(initialParams).errors.esQuery.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.esQuery[0].toString()).toBe(
      `Query field is required.`
    );
    expect(hasExpressionValidationErrors(initialParams)).toBe(true);
  });

  test('if searchConfiguration property is not set should return proper error message', () => {
    const initialParams = {
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      searchType: SearchType.searchSource,
    } as EsQueryRuleParams<SearchType.searchSource>;
    expect(validateExpression(initialParams).errors.searchConfiguration.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.searchConfiguration[0].toString()).toBe(
      `Search source configuration is required.`
    );
  });

  test('if threshold0 property is not set should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      threshold: [],
      timeWindowSize: 1,
      timeWindowUnit: 's',
      thresholdComparator: '<',
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'all',
    };
    expect(validateExpression(initialParams).errors.threshold0.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.threshold0[0].toString()).toBe(
      'Threshold 0 is required.'
    );
  });

  test('if threshold1 property is needed by thresholdComparator but not set should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      threshold: [1],
      timeWindowSize: 1,
      timeWindowUnit: 's',
      thresholdComparator: 'between',
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'all',
    };
    expect(validateExpression(initialParams).errors.threshold1.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.threshold1[0].toString()).toBe(
      'Threshold 1 is required.'
    );
  });

  test('if threshold0 property greater than threshold1 property should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      threshold: [10, 1],
      timeWindowSize: 1,
      timeWindowUnit: 's',
      thresholdComparator: 'between',
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'all',
    };
    expect(validateExpression(initialParams).errors.threshold1.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.threshold1[0].toString()).toBe(
      'Threshold 1 must be > Threshold 0.'
    );
  });

  test('if size property is < 0 should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n`,
      size: -1,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'all',
    };
    expect(validateExpression(initialParams).errors.size.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.size[0].toString()).toBe(
      'Size must be between 0 and 10,000.'
    );
  });

  test('if size property is 0 should not return error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n`,
      size: 0,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'all',
    };
    expect(validateExpression(initialParams).errors.size.length).toBe(0);
  });

  test('if size property is > 10000 should return proper error message', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n`,
      size: 25000,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'all',
    };
    expect(validateExpression(initialParams).errors.size.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.size[0].toString()).toBe(
      'Size must be between 0 and 10,000.'
    );
  });

  test('should not return error messages if all is correct', () => {
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: '{"query":{"match_all":{}}}',
      size: 250,
      timeWindowSize: 100,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '@timestamp',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'all',
    };
    expect(validateExpression(initialParams).errors.size.length).toBe(0);
    expect(hasExpressionValidationErrors(initialParams)).toBe(false);
  });

  test('if esqlQuery property is not set should return proper error message', () => {
    const initialParams = {
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '@timestamp',
      searchType: SearchType.esqlQuery,
    } as EsQueryRuleParams<SearchType.esqlQuery>;
    expect(validateExpression(initialParams).errors.esqlQuery.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.esqlQuery[0].toString()).toBe(
      `ES|QL query is required.`
    );
  });

  test('if esqlQuery timeField property is not defined should return proper error message', () => {
    const initialParams = {
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      esqlQuery: { esql: 'test' },
      searchType: SearchType.esqlQuery,
    } as EsQueryRuleParams<SearchType.esqlQuery>;
    expect(validateExpression(initialParams).errors.timeField.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.timeField[0].toString()).toBe(
      'Time field is required.'
    );
  });

  test('if esqlQuery thresholdComparator property is not gt should return proper error message', () => {
    const initialParams = {
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      esqlQuery: { esql: 'test' },
      searchType: SearchType.esqlQuery,
      thresholdComparator: '<',
      timeField: '@timestamp',
    } as EsQueryRuleParams<SearchType.esqlQuery>;
    expect(validateExpression(initialParams).errors.thresholdComparator.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.thresholdComparator[0].toString()).toBe(
      'Threshold comparator is required to be greater than.'
    );
  });

  test('if esqlQuery threshold property is not 0 should return proper error message', () => {
    const initialParams = {
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [8],
      esqlQuery: { esql: 'test' },
      searchType: SearchType.esqlQuery,
      timeField: '@timestamp',
    } as EsQueryRuleParams<SearchType.esqlQuery>;
    expect(validateExpression(initialParams).errors.threshold0.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.threshold0[0].toString()).toBe(
      'Threshold is required to be 0.'
    );
  });

  test('if sourceFields property is an array but has more than 5 items, should return proper error message', () => {
    const sourceField = { label: 'test', searchPath: 'test' };
    const initialParams: EsQueryRuleParams<SearchType.esQuery> = {
      index: ['test'],
      esQuery: `{\n  \"query\":{\n    \"match_all\" : {}\n  }\n}`,
      size: 100,
      timeWindowSize: 1,
      timeWindowUnit: 's',
      threshold: [0],
      timeField: '',
      excludeHitsFromPreviousRun: true,
      aggType: 'count',
      groupBy: 'top',
      termSize: 10,
      termField: ['term'],
      sourceFields: [sourceField, sourceField, sourceField, sourceField, sourceField, sourceField],
    };
    expect(validateExpression(initialParams).errors.sourceFields.length).toBeGreaterThan(0);
    expect(validateExpression(initialParams).errors.sourceFields[0].toString()).toBe(
      'Cannot select more than 5 fields'
    );
  });
});
