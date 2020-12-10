/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDataGridSorting } from '@elastic/eui';

import { multiColumnSortFactory } from './common';

describe('Data Frame Analytics: Data Grid Common', () => {
  test('multiColumnSortFactory()', () => {
    const data = [
      { s: 'a', n: 1 },
      { s: 'a', n: 2 },
      { s: 'b', n: 3 },
      { s: 'b', n: 4 },
    ];

    const sortingColumns1: EuiDataGridSorting['columns'] = [{ id: 's', direction: 'desc' }];
    const multiColumnSort1 = multiColumnSortFactory(sortingColumns1);
    data.sort(multiColumnSort1);

    expect(data).toStrictEqual([
      { s: 'b', n: 3 },
      { s: 'b', n: 4 },
      { s: 'a', n: 1 },
      { s: 'a', n: 2 },
    ]);

    const sortingColumns2: EuiDataGridSorting['columns'] = [
      { id: 's', direction: 'asc' },
      { id: 'n', direction: 'desc' },
    ];
    const multiColumnSort2 = multiColumnSortFactory(sortingColumns2);
    data.sort(multiColumnSort2);

    expect(data).toStrictEqual([
      { s: 'a', n: 2 },
      { s: 'a', n: 1 },
      { s: 'b', n: 4 },
      { s: 'b', n: 3 },
    ]);

    const sortingColumns3: EuiDataGridSorting['columns'] = [
      { id: 'n', direction: 'desc' },
      { id: 's', direction: 'desc' },
    ];
    const multiColumnSort3 = multiColumnSortFactory(sortingColumns3);
    data.sort(multiColumnSort3);

    expect(data).toStrictEqual([
      { s: 'b', n: 4 },
      { s: 'b', n: 3 },
      { s: 'a', n: 2 },
      { s: 'a', n: 1 },
    ]);
  });
});
