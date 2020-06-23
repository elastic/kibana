/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsDataTypeUnion, Type } from '../../../common/schemas';

import { transformListItemToElasticQuery } from './transform_list_item_to_elastic_query';

describe('transform_elastic_to_elastic_query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it transforms a ip type and value to a union', () => {
    const elasticQuery = transformListItemToElasticQuery({
      type: 'ip',
      value: '127.0.0.1',
    });
    const expected: EsDataTypeUnion = { ip: '127.0.0.1' };
    expect(elasticQuery).toEqual(expected);
  });

  test('it transforms a keyword type and value to a union', () => {
    const elasticQuery = transformListItemToElasticQuery({
      type: 'keyword',
      value: 'host-name',
    });
    const expected: EsDataTypeUnion = { keyword: 'host-name' };
    expect(elasticQuery).toEqual(expected);
  });

  test('it throws if the type is not known', () => {
    const type: Type = 'made-up' as Type;
    expect(() =>
      transformListItemToElasticQuery({
        type,
        value: 'some-value',
      })
    ).toThrow('Unknown type: "made-up" in transformListItemToElasticQuery');
  });
});
