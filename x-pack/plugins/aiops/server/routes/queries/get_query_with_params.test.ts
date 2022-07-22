/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getQueryWithParams } from './get_query_with_params';

describe('getQueryWithParams', () => {
  it('returns the most basic query filtering', () => {
    const query = getQueryWithParams({
      params: {
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
      },
    });
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

  it('returns a query considering a custom field/value pair', () => {
    const query = getQueryWithParams({
      params: {
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
      },
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
          {
            term: {
              actualFieldName: 'actualFieldValue',
            },
          },
        ],
      },
    });
  });
});
