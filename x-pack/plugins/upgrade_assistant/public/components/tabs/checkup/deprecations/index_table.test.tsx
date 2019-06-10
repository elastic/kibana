/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { IndexDeprecationTableProps, IndexDeprecationTableUI } from './index_table';

describe('IndexDeprecationTable', () => {
  const defaultProps = {
    indices: [
      { index: 'index1', details: 'Index 1 deets', reindex: true },
      { index: 'index2', details: 'Index 2 deets', reindex: true },
      { index: 'index3', details: 'Index 3 deets', reindex: true },
    ],
  } as IndexDeprecationTableProps;

  // Relying pretty heavily on EUI to implement the table functionality correctly.
  // This test simply verifies that the props passed to EuiBaseTable are the ones
  // expected.
  test('render', () => {
    expect(shallowWithIntl(<IndexDeprecationTableUI {...defaultProps} />)).toMatchInlineSnapshot(`
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
        "details": "Index 1 deets",
        "index": "index1",
        "reindex": true,
      },
      Object {
        "details": "Index 2 deets",
        "index": "index2",
        "reindex": true,
      },
      Object {
        "details": "Index 3 deets",
        "index": "index3",
        "reindex": true,
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
  sorting={
    Object {
      "sort": Object {
        "direction": "asc",
        "field": "index",
      },
    }
  }
/>
`);
  });
});
