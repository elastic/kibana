/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramsMock } from './__mocks__/params_match_all';
import { paramsSearchQueryMock } from './__mocks__/params_search_query';

import { getQueryWithParams } from './get_query_with_params';

describe('getQueryWithParams', () => {
  it('returns the most basic query filtering', () => {
    const query = getQueryWithParams({
      params: paramsSearchQueryMock,
    });
    expect(query).toEqual({
      bool: {
        filter: [
          {
            bool: {
              filter: [],
              minimum_should_match: 1,
              must_not: [],
              should: [{ term: { 'the-term': { value: 'the-value' } } }],
            },
          },
          {
            range: {
              'the-time-field-name': {
                format: 'epoch_millis',
                gte: 0,
                lte: 50,
              },
            },
          },
        ],
      },
    });
  });

  it('returns a query considering a custom field/value pair', () => {
    const query = getQueryWithParams({
      params: paramsSearchQueryMock,
      termFilters: [
        {
          fieldName: 'actualFieldName',
          fieldValue: 'actualFieldValue',
        },
      ],
    });
    expect(query).toEqual({
      bool: {
        filter: [
          {
            bool: {
              filter: [],
              minimum_should_match: 1,
              must_not: [],
              should: [{ term: { 'the-term': { value: 'the-value' } } }],
            },
          },
          {
            range: {
              'the-time-field-name': {
                format: 'epoch_millis',
                gte: 0,
                lte: 50,
              },
            },
          },
          {
            term: {
              actualFieldName: 'actualFieldValue',
            },
          },
        ],
      },
    });
  });

  it("should not add `searchQuery` if it's just a match_all query", () => {
    const query = getQueryWithParams({
      params: paramsMock,
    });
    expect(query).toEqual({
      bool: {
        filter: [
          {
            range: {
              'the-time-field-name': {
                format: 'epoch_millis',
                gte: 0,
                lte: 50,
              },
            },
          },
        ],
      },
    });
  });
});
