/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { queryToES } from './standard_query';

describe('StandardQuery', () => {
  test('performs a limit', () => {
    expect(queryToES({ limit: 20 })).toEqual({ size: 20 });
  });

  test('supports selection of fields', () => {
    expect(
      queryToES({
        select: [{ op: 'col', arg: 'Carrier' }],
        limit: 1000,
      })
    ).toEqual({
      _source: false,
      stored_fields: '_none_',
      docvalue_fields: [
        {
          field: 'Carrier',
        },
      ],
      size: 1000,
    });
  });

  test('supports multiple aggregations', () => {
    expect(
      queryToES({
        select: [
          { op: 'col', arg: 'Carrier' },
          { op: 'count' },
          { op: 'sum', arg: { op: 'col', arg: 'AvgTicketPrice' } },
        ],
        limit: 1000,
      })
    ).toEqual({
      _source: false,
      stored_fields: '_none_',
      aggregations: {
        groupby: {
          composite: {
            sources: [
              { Carrier: { terms: { field: 'Carrier', missing_bucket: true, order: 'asc' } } },
            ],
            size: 1000,
          },
          aggregations: { sum_AvgTicketPrice: { sum: { field: 'AvgTicketPrice' } } },
        },
      },
      size: 0,
    });
  });

  test('supports sum', () => {
    expect(
      queryToES({
        select: [
          { op: 'col', arg: 'Carrier' },
          { op: 'sum', alias: 'foo', arg: { op: 'col', arg: 'AvgTicketPrice' } },
        ],
        limit: 1000,
      })
    ).toEqual({
      _source: false,
      stored_fields: '_none_',
      aggregations: {
        groupby: {
          composite: {
            sources: [
              { Carrier: { terms: { field: 'Carrier', missing_bucket: true, order: 'asc' } } },
            ],
            size: 1000,
          },
          aggregations: { foo: { sum: { field: 'AvgTicketPrice' } } },
        },
      },
      size: 0,
    });
  });

  test('supports count', () => {
    expect(
      queryToES({
        select: [
          { op: 'col', arg: 'Carrier' },
          { op: 'col', arg: 'DestCityName' },
          { op: 'count' },
        ],
        limit: 1000,
      })
    ).toEqual({
      _source: false,
      stored_fields: '_none_',
      aggregations: {
        groupby: {
          composite: {
            sources: [
              { Carrier: { terms: { field: 'Carrier', missing_bucket: true, order: 'asc' } } },
              {
                DestCityName: {
                  terms: { field: 'DestCityName', missing_bucket: true, order: 'asc' },
                },
              },
            ],
            size: 1000,
          },
        },
      },
      size: 0,
    });
  });

  test('supports where gt', () => {
    expect(
      queryToES({
        select: [{ op: 'col', arg: 'Carrier' }],
        where: { op: 'gt', arg: [{ op: 'col', arg: 'DistanceMiles' }, { op: 'lit', arg: 32 }] },
        limit: 1000,
      })
    ).toEqual({
      size: 1000,
      query: {
        range: {
          DistanceMiles: {
            from: 32,
            to: null,
            include_lower: false,
            include_upper: false,
            boost: 1.0,
          },
        },
      },
      _source: false,
      stored_fields: '_none_',
      docvalue_fields: [
        {
          field: 'Carrier',
        },
      ],
    });
  });
});
