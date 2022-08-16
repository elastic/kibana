/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAggConfigFromEsAgg, isSpecialSortField } from './pivot_aggs';
import {
  FilterAggForm,
  FilterTermForm,
} from '../sections/create_transform/components/step_define/common/filter_agg/components';

describe('getAggConfigFromEsAgg', () => {
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
          fieldName: 'region',
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

  test('should resolve percentiles and terms agg in sub-aggregations', () => {
    const esConfig = {
      filter: {
        exists: {
          field: 'customer_phone',
        },
      },
      aggs: {
        'products.base_price.percentiles': {
          percentiles: {
            field: 'products.base_price',
            percents: [1, 5, 25, 50, 75, 95, 99],
          },
        },
        check_terms: {
          terms: {
            field: 'products.base_price',
            size: 3,
          },
        },
      },
    };

    const result = getAggConfigFromEsAgg(esConfig, 'test_sub_percentiles');

    expect(result.subAggs!['products.base_price.percentiles']).toMatchObject({
      agg: 'percentiles',
      aggName: 'products.base_price.percentiles',
      dropDownName: 'products.base_price.percentiles',
      field: 'products.base_price',
      parentAgg: result,
      aggConfig: {
        percents: '1,5,25,50,75,95,99',
      },
    });

    expect(result.subAggs!.check_terms).toMatchObject({
      agg: 'terms',
      aggName: 'check_terms',
      dropDownName: 'check_terms',
      field: 'products.base_price',
      parentAgg: result,
      aggConfig: {
        size: 3,
      },
    });
  });

  test('restore config for the exists filter', () => {
    expect(
      getAggConfigFromEsAgg({ filter: { exists: { field: 'instance' } } }, 'test_3')
    ).toMatchObject({
      agg: 'filter',
      aggName: 'test_3',
      dropDownName: 'test_3',
      field: 'instance',
      aggConfig: {
        filterAgg: 'exists',
        aggTypeConfig: {
          fieldName: 'instance',
        },
      },
    });
  });

  test('restore config for the range filter', () => {
    expect(
      getAggConfigFromEsAgg(
        {
          filter: {
            range: {
              'products.base_price': {
                gte: 11,
                lt: 20,
              },
            },
          },
        },
        'test_4'
      )
    ).toMatchObject({
      agg: 'filter',
      aggName: 'test_4',
      dropDownName: 'test_4',
      field: 'products.base_price',
      aggConfig: {
        filterAgg: 'range',
        aggTypeConfig: {
          fieldName: 'products.base_price',
          filterAggConfig: {
            from: 11,
            to: 20,
            includeFrom: true,
            includeTo: false,
          },
        },
      },
    });
  });
});

describe('isSpecialSortField', () => {
  test('detects special sort field', () => {
    expect(isSpecialSortField('_score')).toBe(true);
  });
  test('rejects special fields that not supported yet', () => {
    expect(isSpecialSortField('_doc')).toBe(false);
  });
});
