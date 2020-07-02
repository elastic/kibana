/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getAggConfigFromEsAgg } from './pivot_aggs';
import {
  FilterAggForm,
  FilterTermForm,
} from '../sections/create_transform/components/step_define/common/filter_agg/components';

describe('getAggConfigFromEsAgg', () => {
  test('should throw an error for unsupported agg', () => {
    expect(() => getAggConfigFromEsAgg({ terms: {} }, 'test')).toThrowError();
  });

  test('should return a common config if the agg does not have a custom config defined', () => {
    expect(getAggConfigFromEsAgg({ avg: { field: 'region' } }, 'test_1')).toEqual({
      agg: 'avg',
      aggName: 'test_1',
      dropDownName: 'test_1',
      field: 'region',
    });
  });

  test('should return a custom config for recognized aggregation type', () => {
    expect(
      getAggConfigFromEsAgg({ filter: { term: { region: 'sa-west-1' } } }, 'test_2')
    ).toMatchObject({
      agg: 'filter',
      aggName: 'test_2',
      dropDownName: 'test_2',
      field: 'region',
      AggFormComponent: FilterAggForm,
      aggConfig: {
        filterAgg: 'term',
        aggTypeConfig: {
          FilterAggFormComponent: FilterTermForm,
          filterAggConfig: {
            value: 'sa-west-1',
          },
        },
      },
    });
  });

  test('should resolve sub-aggregations', () => {
    const esConfig = {
      filter: {
        term: { region: 'sa-west-1' },
      },
      aggs: {
        test_avg: {
          avg: {
            field: 'test_field',
          },
        },
      },
    };

    const result = getAggConfigFromEsAgg(esConfig, 'test_3');

    expect(result.subAggs!.test_avg).toEqual({
      agg: 'avg',
      aggName: 'test_avg',
      dropDownName: 'test_avg',
      field: 'test_field',
      parentAgg: result,
    });
  });
});
