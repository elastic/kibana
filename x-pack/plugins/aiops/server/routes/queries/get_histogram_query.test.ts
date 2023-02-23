/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getHistogramQuery } from './get_histogram_query';

const paramsMock = {
  index: 'the-index',
  timeFieldName: 'the-time-field-name',
  start: 1577836800000,
  end: 1609459200000,
  baselineMin: 10,
  baselineMax: 20,
  deviationMin: 30,
  deviationMax: 40,
  includeFrozen: false,
  searchQuery: '{"bool":{"filter":[],"must":[{"match_all":{}}],"must_not":[]}}',
};

describe('getHistogramQuery', () => {
  it('returns histogram query without additional filters', () => {
    const query = getHistogramQuery(paramsMock);
    expect(query).toEqual({
      bool: {
        filter: [
          { bool: { filter: [], must: [{ match_all: {} }], must_not: [] } },
          {
            range: {
              'the-time-field-name': {
                format: 'epoch_millis',
                gte: 1577836800000,
                lte: 1609459200000,
              },
            },
          },
        ],
      },
    });
  });

  it('returns histogram query with additional filters', () => {
    const query = getHistogramQuery(paramsMock, [
      {
        term: { ['the-filter-fieldName']: 'the-filter-fieldValue' },
      },
    ]);
    expect(query).toEqual({
      bool: {
        filter: [
          { bool: { filter: [], must: [{ match_all: {} }], must_not: [] } },
          {
            term: {
              'the-filter-fieldName': 'the-filter-fieldValue',
            },
          },
          {
            range: {
              'the-time-field-name': {
                format: 'epoch_millis',
                gte: 1577836800000,
                lte: 1609459200000,
              },
            },
          },
        ],
      },
    });
  });
});
