/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toEsQuery } from './to_es_query';

describe('viz-editor/query/to_es_query', () => {
  test('performs a limit without aggregations', () => {
    expect(
      toEsQuery({ index: 'a', select: [{ operation: 'col', argument: 'datacenter' }], size: 20 })
    ).toMatchObject({
      size: 20,
    });
  });

  test('performs a limit with aggregations', () => {
    expect(toEsQuery({ index: 'a', select: [{ operation: 'count' }], size: 20 })).toMatchObject({
      size: 0,
    });
  });

  test('performs a basic column selection', () => {
    expect(
      toEsQuery({
        index: 'a',
        select: [
          { operation: 'col', argument: 'datacenter' },
          { operation: 'col', argument: 'bytes' },
        ],
      })
    ).toMatchObject({
      docvalue_fields: [{ field: 'datacenter' }, { field: 'bytes' }],
    });
  });

  test('performs basic aggregations', () => {
    expect(
      toEsQuery({
        index: 'a',
        select: [
          { operation: 'count' },
          { operation: 'avg', alias: 'averagebytes', argument: 'bytes' },
          { operation: 'sum', argument: 'request_size' },
        ],
      })
    ).toMatchObject({
      aggregations: {
        count: {
          value_count: {
            field: '_id',
          },
        },
        averagebytes: {
          avg: {
            field: 'bytes',
          },
        },
        sum_request_size: {
          sum: {
            field: 'request_size',
          },
        },
      },
    });
  });

  test('performs grouped aggregations', () => {
    expect(
      toEsQuery({
        index: 'a',
        select: [
          { operation: 'col', alias: 'dc', argument: 'datacenter' },
          { operation: 'count' },
          { operation: 'sum', argument: 'bytes' },
        ],
        size: 123,
      })
    ).toMatchObject({
      aggregations: {
        groupby: {
          composite: {
            sources: [
              { dc: { terms: { field: 'datacenter', missing_bucket: true, order: 'asc' } } },
            ],
            size: 123,
          },
          aggregations: {
            count: {
              value_count: {
                field: '_id',
              },
            },
            sum_bytes: {
              sum: {
                field: 'bytes',
              },
            },
          },
        },
      },
    });
  });

  test('performs date_histograms', () => {
    expect(
      toEsQuery({
        index: 'a',
        select: [
          { operation: 'date_histogram', argument: { field: 'order_date', interval: 'month' } },
          { operation: 'count', alias: 'records_per_month' },
        ],
      })
    ).toMatchObject({
      aggregations: {
        order_date_month: {
          date_histogram: {
            field: 'order_date',
            interval: 'month',
          },
          aggregations: {
            records_per_month: {
              value_count: {
                field: '_id',
              },
            },
          },
        },
      },
    });
  });

  test('supports or clauses', () => {
    expect(
      toEsQuery({
        index: 'a',
        select: [{ operation: 'count' }],
        where: {
          operation: 'or',
          argument: [
            {
              operation: '=',
              argument: [
                { operation: 'col', argument: 'datacenter' },
                { operation: 'lit', argument: 'east-1' },
              ],
            },
            {
              operation: '=',
              argument: [
                { operation: 'col', argument: 'datacenter' },
                { operation: 'lit', argument: 'central-1' },
              ],
            },
          ],
        },
      })
    ).toMatchObject({
      query: {
        bool: {
          should: [
            {
              term: {
                datacenter: {
                  value: 'east-1',
                  boost: 1.0,
                },
              },
            },
            {
              term: {
                datacenter: {
                  value: 'central-1',
                  boost: 1.0,
                },
              },
            },
          ],
        },
      },
    });
  });

  test('supports and clauses', () => {
    expect(
      toEsQuery({
        index: 'a',
        select: [{ operation: 'count' }],
        where: {
          operation: 'and',
          argument: [
            {
              operation: '>',
              argument: [
                { operation: 'col', argument: 'bytes' },
                { operation: 'lit', argument: 300 },
              ],
            },
            {
              operation: '<=',
              argument: [
                { operation: 'col', argument: 'requests' },
                { operation: 'lit', argument: 10 },
              ],
            },
          ],
        },
      })
    ).toMatchObject({
      query: {
        bool: {
          must: [
            {
              range: {
                bytes: {
                  from: 300,
                  to: null,
                  include_lower: false,
                  include_upper: false,
                  boost: 1.0,
                },
              },
            },
            {
              range: {
                requests: {
                  from: null,
                  to: 10,
                  include_lower: false,
                  include_upper: true,
                  boost: 1.0,
                },
              },
            },
          ],
        },
      },
    });
  });
});
