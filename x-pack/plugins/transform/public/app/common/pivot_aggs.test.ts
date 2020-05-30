/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAggConfigFromEsAgg } from './pivot_aggs';

describe('getAggConfigFromEsAgg', () => {
  test('should throw an error for unsupported agg', () => {
    expect(() => getAggConfigFromEsAgg({ terms: {} }, 'test')).toThrowError();
  });

  test('should return a common config if the agg does not have a custom config defined', () => {
    expect(getAggConfigFromEsAgg({ avg: {} }, 'test')).toEqual({});
  });

  test('should return a config with populated values', () => {
    expect(getAggConfigFromEsAgg({ filter: { term: { region: 'sa-west-1' } } }, 'test')).toEqual({
      agg: 'filter',
      aggName: 'test',
      field: 'region',
      aggConfig: {
        value: 'sa-west',
      },
    });
  });
});
