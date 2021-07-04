/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { IndexDeprecationTableProps, IndexDeprecationTable } from './index_table';

describe('IndexDeprecationTable', () => {
  const defaultProps = {
    indices: [
      { index: 'index1', details: 'Index 1 deets', correctiveAction: { type: 'reindex' } },
      { index: 'index2', details: 'Index 2 deets', correctiveAction: { type: 'reindex' } },
      { index: 'index3', details: 'Index 3 deets', correctiveAction: { type: 'reindex' } },
    ],
  } as IndexDeprecationTableProps;

  // Relying pretty heavily on EUI to implement the table functionality correctly.
  // This test simply verifies that the props passed to EuiBaseTable are the ones
  // expected.
  test('render', () => {
    expect(shallow(<IndexDeprecationTable {...defaultProps} />)).toMatchInlineSnapshot(`
      <EuiBasicTable
        columns={
          Array [
            Object {
              "field": "index",
              "name": "Index",
              "sortable": true,
            },
            Object {
              "field": "details",
              "name": "Details",
            },
            Object {
              "actions": Array [
                Object {
                  "render": [Function],
                },
              ],
            },
          ]
        }
        hasActions={false}
        items={
          Array [
            Object {
              "correctiveAction": Object {
                "type": "reindex",
              },
              "details": "Index 1 deets",
              "index": "index1",
            },
            Object {
              "correctiveAction": Object {
                "type": "reindex",
              },
              "details": "Index 2 deets",
              "index": "index2",
            },
            Object {
              "correctiveAction": Object {
                "type": "reindex",
              },
              "details": "Index 3 deets",
              "index": "index3",
            },
          ]
        }
        noItemsMessage="No items found"
        onChange={[Function]}
        pagination={
          Object {
            "hidePerPageOptions": true,
            "pageIndex": 0,
            "pageSize": 10,
            "pageSizeOptions": Array [],
            "totalItemCount": 3,
          }
        }
        responsive={true}
        rowProps={[Function]}
        sorting={
          Object {
            "sort": Object {
              "direction": "asc",
              "field": "index",
            },
          }
        }
        tableLayout="fixed"
      />
    `);
  });
});
