/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  QueryFilterType,
  getEmptyQuery,
  getQueryFilterFromTypeValue,
  getTermsQuery,
} from './get_query_filter_from_type_value';

describe('get_query_filter_from_type_value', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getQueryFilterFromTypeValue', () => {
    test('it returns an ip if given an ip', () => {
      const queryFilter = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'ip',
        value: ['127.0.0.1'],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [{ term: { ip: { _name: '0.0', value: '127.0.0.1' } } }],
          },
        },
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
        {
          bool: {
            minimum_should_match: 1,
            should: [
              { term: { ip: { _name: '0.0', value: '127.0.0.1' } } },
              { term: { ip: { _name: '1.0', value: '127.0.0.2' } } },
            ],
          },
        },
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
        {
          bool: {
            minimum_should_match: 1,
            should: [{ term: { keyword: { _name: '0.0', value: 'host-name-1' } } }],
          },
        },
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
        {
          bool: {
            minimum_should_match: 1,
            should: [
              { term: { keyword: { _name: '0.0', value: 'host-name-1' } } },
              { term: { keyword: { _name: '1.0', value: 'host-name-2' } } },
            ],
          },
        },
      ];
      expect(queryFilter).toEqual(expected);
    });

    test('it returns an empty query given an empty value', () => {
      const queryFilter = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'keyword',
        value: [],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_none: {
                  _name: 'empty',
                },
              },
            ],
          },
        },
      ];
      expect(queryFilter).toEqual(expected);
    });

    test('it returns an empty query object given an empty array', () => {
      const queryFilter = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'ip',
        value: [],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_none: {
                  _name: 'empty',
                },
              },
            ],
          },
        },
      ];
      expect(queryFilter).toEqual(expected);
    });

    test('it returns an empty query object given an array with only null values', () => {
      const queryFilter = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'ip',
        value: [null, null],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [
              {
                match_none: {
                  _name: 'empty',
                },
              },
            ],
          },
        },
      ];
      expect(queryFilter).toEqual(expected);
    });

    test('it filters out a null value if mixed with a string value for non-text based query', () => {
      const queryFilter = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'ip',
        value: [null, 'host-name-1'],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [{ term: { ip: { _name: '1.0', value: 'host-name-1' } } }],
          },
        },
      ];
      expect(queryFilter).toEqual(expected);
    });

    test('it filters out a null value if mixed with a string value for text based query', () => {
      const queryFilter = getQueryFilterFromTypeValue({
        listId: 'list-123',
        type: 'text',
        value: [null, 'host-name-1'],
      });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        {
          bool: {
            minimum_should_match: 1,
            should: [{ match: { text: { _name: '1.0', operator: 'and', query: 'host-name-1' } } }],
          },
        },
      ];
      expect(queryFilter).toEqual(expected);
    });
  });

  describe('getEmptyQuery', () => {
    test('it returns an empty query given a list_id', () => {
      const emptyQuery = getEmptyQuery({ listId: 'list-123' });
      const expected: QueryFilterType = [
        { term: { list_id: 'list-123' } },
        { bool: { minimum_should_match: 1, should: [{ match_none: { _name: 'empty' } }] } },
      ];
      expect(emptyQuery).toEqual(expected);
    });
  });

  describe('getTermsQuery', () => {
    describe('scalar values', () => {
      test('it returns a expected terms query give a single string value, listId, and type', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: ['127.0.0.1'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ term: { ip: { _name: '0.0', value: '127.0.0.1' } } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns two expected terms query given two string values, listId, and type', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: ['127.0.0.1', '127.0.0.2'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { term: { ip: { _name: '0.0', value: '127.0.0.1' } } },
                { term: { ip: { _name: '1.0', value: '127.0.0.2' } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns two expected numeric terms without converting them into strings', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [5, 3],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { term: { ip: { _name: '0.0', value: 5 } } },
                { term: { ip: { _name: '1.0', value: 3 } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns a string and a numeric without converting them into a homogenous type', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [5, '3'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { term: { ip: { _name: '0.0', value: 5 } } },
                { term: { ip: { _name: '1.0', value: '3' } } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it filters out a null value if mixed with a string value', () => {
        const queryFilter = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [null, 'host-name-1'],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ term: { ip: { _name: '1.0', value: 'host-name-1' } } }],
            },
          },
        ];
        expect(queryFilter).toEqual(expected);
      });
    });

    describe('array values', () => {
      test('it returns a expected terms query give a single string value, listId, and type', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [['127.0.0.1']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ terms: { _name: '0.0', ip: ['127.0.0.1'] } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns two expected terms query given two string values, listId, and type', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [['127.0.0.1'], ['127.0.0.2']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { terms: { _name: '0.0', ip: ['127.0.0.1'] } },
                { terms: { _name: '1.0', ip: ['127.0.0.2'] } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns two expected numeric terms without converting them into strings', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [[5], [3]],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ terms: { _name: '0.0', ip: [5] } }, { terms: { _name: '1.0', ip: [3] } }],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it returns a string and a numeric without converting them into a homogenous type', () => {
        const query = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [[5], ['3']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [
                { terms: { _name: '0.0', ip: [5] } },
                { terms: { _name: '1.0', ip: ['3'] } },
              ],
            },
          },
        ];
        expect(query).toEqual(expected);
      });

      test('it filters out a null value if mixed with a string value', () => {
        const queryFilter = getTermsQuery({
          listId: 'list-123',
          type: 'ip',
          value: [[null], ['host-name-1']],
        });
        const expected: QueryFilterType = [
          { term: { list_id: 'list-123' } },
          {
            bool: {
              minimum_should_match: 1,
              should: [{ terms: { _name: '1.0', ip: ['host-name-1'] } }],
            },
          },
        ];
        expect(queryFilter).toEqual(expected);
      });
    });
  });
});
