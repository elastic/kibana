/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partialRowsOverride } from './partial_rows_override';
import { Datatable } from '@kbn/expressions-plugin/common';
import { createMockExecutionContext } from '@kbn/expressions-plugin/common/mocks';

describe('partialRows_override', () => {
  it('should override empty values in partial rows', async () => {
    const input: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'a', name: 'A', meta: { type: 'number' } },
        { id: 'b', name: 'B', meta: { type: 'number' } },
      ],
      rows: [
        { a: undefined, b: 2 },
        { a: 3, b: undefined },
        { a: undefined, b: 6 },
        { a: 7, b: undefined },
      ],
    };

    const result = await partialRowsOverride.fn(input, {}, createMockExecutionContext());

    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "a",
            "meta": Object {
              "type": "number",
            },
            "name": "A",
          },
          Object {
            "id": "b",
            "meta": Object {
              "type": "number",
            },
            "name": "B",
          },
        ],
        "rows": Array [
          Object {
            "a": "",
            "b": 2,
          },
          Object {
            "a": 3,
            "b": "",
          },
          Object {
            "a": "",
            "b": 6,
          },
          Object {
            "a": 7,
            "b": "",
          },
        ],
        "type": "datatable",
      }
    `);
  });

  it('should keep columns which are not partial', async () => {
    const input: Datatable = {
      type: 'datatable',
      columns: [
        { id: 'a', name: 'A', meta: { type: 'number' } },
        { id: 'b', name: 'B', meta: { type: 'number' } },
      ],
      rows: [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
        { a: 5, b: 6 },
        { a: 7, b: 8 },
      ],
    };

    const result = await partialRowsOverride.fn(input, {}, createMockExecutionContext());

    expect(result).toMatchInlineSnapshot(`
      Object {
        "columns": Array [
          Object {
            "id": "a",
            "meta": Object {
              "type": "number",
            },
            "name": "A",
          },
          Object {
            "id": "b",
            "meta": Object {
              "type": "number",
            },
            "name": "B",
          },
        ],
        "rows": Array [
          Object {
            "a": 1,
            "b": 2,
          },
          Object {
            "a": 3,
            "b": 4,
          },
          Object {
            "a": 5,
            "b": 6,
          },
          Object {
            "a": 7,
            "b": 8,
          },
        ],
        "type": "datatable",
      }
    `);
  });
});
