/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LensFilterEvent } from './types';
import { desanitizeFilterContext } from './utils';

describe('desanitizeFilterContext', () => {
  it(`When filtered value equals '(empty)' replaces it with '' in table and in value.`, () => {
    const table = {
      rows: [
        {
          'f903668f-1175-4705-a5bd-713259d10326': 1589414640000,
          '5d5446b2-72e8-4f86-91e0-88380f0fa14c': '(empty)',
          'col-1-9f0b6f88-c399-43a0-a993-0ad943c9af25': 1,
        },
        {
          'f903668f-1175-4705-a5bd-713259d10326': 1589414670000,
          'col-1-9f0b6f88-c399-43a0-a993-0ad943c9af25': 0,
        },
        {
          'f903668f-1175-4705-a5bd-713259d10326': 1589414880000,
          '5d5446b2-72e8-4f86-91e0-88380f0fa14c': '123123123',
          'col-1-9f0b6f88-c399-43a0-a993-0ad943c9af25': 1,
        },
        {
          'f903668f-1175-4705-a5bd-713259d10326': 1589414910000,
          '5d5446b2-72e8-4f86-91e0-88380f0fa14c': '(empty)',
          'col-1-9f0b6f88-c399-43a0-a993-0ad943c9af25': 1,
        },
      ],
      columns: [
        {
          id: 'f903668f-1175-4705-a5bd-713259d10326',
          name: 'order_date per 30 seconds',
        },
        {
          id: '5d5446b2-72e8-4f86-91e0-88380f0fa14c',
          name: 'Top values of customer_phone',
        },
        {
          id: '9f0b6f88-c399-43a0-a993-0ad943c9af25',
          name: 'Count of records',
        },
      ],
    };

    const contextWithEmptyValue: LensFilterEvent['data'] = {
      data: [
        {
          row: 3,
          column: 0,
          value: 1589414910000,
          table,
        },
        {
          row: 0,
          column: 1,
          value: '(empty)',
          table,
        },
      ],
      timeFieldName: 'order_date',
    };

    const desanitizedFilterContext = desanitizeFilterContext(contextWithEmptyValue);

    expect(desanitizedFilterContext).toEqual({
      data: [
        {
          row: 3,
          column: 0,
          value: 1589414910000,
          table,
        },
        {
          value: '',
          row: 0,
          column: 1,
          table: {
            rows: [
              {
                'f903668f-1175-4705-a5bd-713259d10326': 1589414640000,
                '5d5446b2-72e8-4f86-91e0-88380f0fa14c': '',
                'col-1-9f0b6f88-c399-43a0-a993-0ad943c9af25': 1,
              },
              {
                'f903668f-1175-4705-a5bd-713259d10326': 1589414670000,
                'col-1-9f0b6f88-c399-43a0-a993-0ad943c9af25': 0,
              },
              {
                'f903668f-1175-4705-a5bd-713259d10326': 1589414880000,
                '5d5446b2-72e8-4f86-91e0-88380f0fa14c': '123123123',
                'col-1-9f0b6f88-c399-43a0-a993-0ad943c9af25': 1,
              },
              {
                'f903668f-1175-4705-a5bd-713259d10326': 1589414910000,
                '5d5446b2-72e8-4f86-91e0-88380f0fa14c': '(empty)',
                'col-1-9f0b6f88-c399-43a0-a993-0ad943c9af25': 1,
              },
            ],
            columns: table.columns,
          },
        },
      ],
      timeFieldName: 'order_date',
    });
  });
});
