/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { paramsSearchQueryMock } from './__mocks__/params_search_query';

import { getFilters } from './get_filters';

describe('getFilters', () => {
  it('returns an empty array with no timeFieldName and searchQuery supplied', () => {
    const filters = getFilters({
      ...paramsSearchQueryMock,
      timeFieldName: '',
    });
    expect(filters).toEqual([]);
  });

  it('returns a range filter when timeFieldName is supplied', () => {
    const filters = getFilters(paramsSearchQueryMock);
    expect(filters).toEqual([
      {
        range: {
          'the-time-field-name': {
            format: 'epoch_millis',
            gte: 0,
            lte: 50,
          },
        },
      },
    ]);
  });
});
