/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryFilterType, getQueryFilterFromTypeValue } from './get_query_filter_from_type_value';

describe('get_query_filter_from_type_value', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns an ip if given an ip', () => {
    const queryFilter = getQueryFilterFromTypeValue({
      listId: 'list-123',
      type: 'ip',
      value: ['127.0.0.1'],
    });
    const expected: QueryFilterType = [
      { term: { list_id: 'list-123' } },
      { terms: { ip: ['127.0.0.1'] } },
    ];
    expect(queryFilter).toEqual(expected);
  });

  test('it returns two ip if given two ip', () => {
    const queryFilter = getQueryFilterFromTypeValue({
      listId: 'list-123',
      type: 'ip',
      value: ['127.0.0.1', '127.0.0.2'],
    });
    const expected: QueryFilterType = [
      { term: { list_id: 'list-123' } },
      { terms: { ip: ['127.0.0.1', '127.0.0.2'] } },
    ];
    expect(queryFilter).toEqual(expected);
  });

  test('it returns a keyword if given a keyword', () => {
    const queryFilter = getQueryFilterFromTypeValue({
      listId: 'list-123',
      type: 'keyword',
      value: ['host-name-1'],
    });
    const expected: QueryFilterType = [
      { term: { list_id: 'list-123' } },
      { terms: { keyword: ['host-name-1'] } },
    ];
    expect(queryFilter).toEqual(expected);
  });

  test('it returns two keywords if given two values', () => {
    const queryFilter = getQueryFilterFromTypeValue({
      listId: 'list-123',
      type: 'keyword',
      value: ['host-name-1', 'host-name-2'],
    });
    const expected: QueryFilterType = [
      { term: { list_id: 'list-123' } },
      { terms: { keyword: ['host-name-1', 'host-name-2'] } },
    ];
    expect(queryFilter).toEqual(expected);
  });

  test('it returns an empty keyword given an empty value', () => {
    const queryFilter = getQueryFilterFromTypeValue({
      listId: 'list-123',
      type: 'keyword',
      value: [],
    });
    const expected: QueryFilterType = [
      { term: { list_id: 'list-123' } },
      { terms: { keyword: [] } },
    ];
    expect(queryFilter).toEqual(expected);
  });

  test('it returns an empty ip given an empty value', () => {
    const queryFilter = getQueryFilterFromTypeValue({
      listId: 'list-123',
      type: 'ip',
      value: [],
    });
    const expected: QueryFilterType = [{ term: { list_id: 'list-123' } }, { terms: { ip: [] } }];
    expect(queryFilter).toEqual(expected);
  });
});
