/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertEsSortToEventLogSort } from './convert_es_sort_to_event_log_sort';

describe('convertEsSortToEventLogSort', () => {
  test('should throw when given invalid inputs', () => {
    expect(() => {
      convertEsSortToEventLogSort('should failed');
    }).toThrow('Invalid sort type - sort must contain sort field and sort order');

    expect(() => {
      convertEsSortToEventLogSort({});
    }).toThrow(`Invalid sort order type - sortOrder object must contain an 'order' property`);

    expect(() => {
      convertEsSortToEventLogSort({ test: 'asc' });
    }).toThrow(`Invalid sort order type - sortOrder object must contain an 'order' property`);
  });

  test('should format ES sort into event logger sort', () => {
    expect(
      convertEsSortToEventLogSort({
        'test-field': {
          order: 'desc',
        },
      })
    ).toEqual([
      {
        sort_field: 'test-field',
        sort_order: 'desc',
      },
    ]);

    expect(
      convertEsSortToEventLogSort([
        {
          'test-field-1': {
            order: 'desc',
          },
        },
        {
          'test-field-2': {
            order: 'asc',
          },
        },
      ])
    ).toEqual([
      {
        sort_field: 'test-field-1',
        sort_order: 'desc',
      },
      {
        sort_field: 'test-field-2',
        sort_order: 'asc',
      },
    ]);
  });
});
