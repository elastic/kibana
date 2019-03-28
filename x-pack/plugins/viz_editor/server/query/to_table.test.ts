/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Query } from '../../common';
import { toTable } from './to_table';

describe('viz-editor/query/to_table', () => {
  test('tabularizes raw docs', () => {
    const query: Query = {
      datasourceRef: 'a',
      select: [
        { operation: 'column', alias: 'total_price', argument: { field: 'price' } },
        { operation: 'column', argument: { field: 'discount' } },
      ],
    };
    const result: any = {
      hits: {
        hits: [
          {
            fields: {
              total_price: [22.22],
              discount: [0],
            },
          },
          {
            fields: {
              total_price: [33.33],
              discount: [11.11],
            },
          },
        ],
      },
    };
    expect(toTable(query, result)).toMatchObject([
      { total_price: 22.22, discount: 0 },
      { total_price: 33.33, discount: 11.11 },
    ]);
  });

  test('tabularizes root aggregations', () => {
    const query: Query = {
      datasourceRef: 'a',
      select: [
        { operation: 'sum', alias: 'total_price', argument: { field: 'price' } },
        { operation: 'count', alias: 'num_recs' },
        { operation: 'avg', alias: 'avg_price', argument: { field: 'price' } },
      ],
    };
    const result: any = {
      aggregations: {
        total_price: {
          value: 350884.12890625,
        },
        num_recs: {
          value: 4675,
        },
        avg_price: {
          value: 75.05542864304813,
        },
      },
    };
    expect(toTable(query, result)).toMatchObject([
      {
        total_price: 350884.12890625,
        num_recs: 4675,
        avg_price: 75.05542864304813,
      },
    ]);
  });

  test('tabularizes a group by', () => {
    const query: Query = {
      datasourceRef: 'a',
      select: [
        { operation: 'column', alias: 'airport', argument: { field: 'air_port' } },
        { operation: 'column', alias: 'destination', argument: { field: 'dest' } },
        { operation: 'count', alias: 'num_recs' },
        { operation: 'avg', alias: 'avg_price', argument: { field: 'price' } },
      ],
    };
    const result: any = {
      aggregations: {
        groupby: {
          buckets: [
            {
              key: {
                airport: 'gvl',
                destination: 'atl',
              },
              num_recs: {
                value: 2,
              },
              avg_price: {
                value: 99,
              },
            },
            {
              key: {
                airport: 'sea',
                destination: 'por',
              },
              num_recs: {
                value: 77,
              },
              avg_price: {
                value: 88,
              },
            },
          ],
        },
      },
    };
    expect(toTable(query, result)).toMatchObject([
      {
        airport: 'gvl',
        destination: 'atl',
        num_recs: 2,
        avg_price: 99,
      },
      {
        airport: 'sea',
        destination: 'por',
        num_recs: 77,
        avg_price: 88,
      },
    ]);
  });

  test('tabularizes a date_histogram', () => {
    const query: Query = {
      datasourceRef: 'a',
      select: [
        {
          operation: 'date_histogram',
          alias: 'order_month',
          argument: { field: 'timestamp', interval: 'month' },
        },
        { operation: 'count', alias: 'num_recs' },
        { operation: 'avg', alias: 'avg_price', argument: { field: 'price' } },
      ],
    };
    const result: any = {
      aggregations: {
        order_month: {
          buckets: [
            {
              key_as_string: '2019-01-01',
              num_recs: {
                value: 2,
              },
              avg_price: {
                value: 99,
              },
            },
            {
              key_as_string: '2019-02-01',
              num_recs: {
                value: 77,
              },
              avg_price: {
                value: 88,
              },
            },
          ],
        },
      },
    };
    expect(toTable(query, result)).toMatchObject([
      {
        order_month: '2019-01-01',
        num_recs: 2,
        avg_price: 99,
      },
      {
        order_month: '2019-02-01',
        num_recs: 77,
        avg_price: 88,
      },
    ]);
  });
});
