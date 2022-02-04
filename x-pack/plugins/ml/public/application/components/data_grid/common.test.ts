/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MultiColumnSorter, multiColumnSortFactory } from './common';

describe('Data Frame Analytics: Data Grid Common', () => {
  test('multiColumnSortFactory()', () => {
    const data = [
      { s: 'a', n: 1 },
      { s: 'a', n: 2 },
      { s: 'b', n: 3 },
      { s: 'b', n: 4 },
    ];

    const sortingColumns1: MultiColumnSorter[] = [{ id: 's', direction: 'desc', type: 'number' }];
    const multiColumnSort1 = multiColumnSortFactory(sortingColumns1);
    data.sort(multiColumnSort1);

    expect(data).toStrictEqual([
      { s: 'b', n: 3 },
      { s: 'b', n: 4 },
      { s: 'a', n: 1 },
      { s: 'a', n: 2 },
    ]);

    const sortingColumns2: MultiColumnSorter[] = [
      { id: 's', direction: 'asc', type: 'number' },
      { id: 'n', direction: 'desc', type: 'number' },
    ];
    const multiColumnSort2 = multiColumnSortFactory(sortingColumns2);
    data.sort(multiColumnSort2);

    expect(data).toStrictEqual([
      { s: 'a', n: 2 },
      { s: 'a', n: 1 },
      { s: 'b', n: 4 },
      { s: 'b', n: 3 },
    ]);

    const sortingColumns3: MultiColumnSorter[] = [
      { id: 'n', direction: 'desc', type: 'number' },
      { id: 's', direction: 'desc', type: 'number' },
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
