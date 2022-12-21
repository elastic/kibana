/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFilters } from './get_filters';

describe('getFilters', () => {
  it('returns an empty array with no timeFieldName and searchQuery supplied', () => {
    const filters = getFilters({
      index: 'the-index',
      timeFieldName: '',
      searchQuery: '{"bool":{"filter":[],"must":[{"match_all":{}}],"must_not":[]}}',
      start: 1577836800000,
      end: 1609459200000,
      baselineMin: 10,
      baselineMax: 20,
      deviationMin: 30,
      deviationMax: 40,
    });
    expect(filters).toEqual([]);
  });

  it('returns a range filter when timeFieldName is supplied', () => {
    const filters = getFilters({
      index: 'the-index',
      timeFieldName: 'the-time-field-name',
      searchQuery: '{"bool":{"filter":[],"must":[{"match_all":{}}],"must_not":[]}}',
      start: 1577836800000,
      end: 1609459200000,
      baselineMin: 10,
      baselineMax: 20,
      deviationMin: 30,
      deviationMax: 40,
    });
    expect(filters).toEqual([
      {
        range: {
          'the-time-field-name': {
            format: 'epoch_millis',
            gte: 1577836800000,
            lte: 1609459200000,
          },
        },
      },
    ]);
  });
});
