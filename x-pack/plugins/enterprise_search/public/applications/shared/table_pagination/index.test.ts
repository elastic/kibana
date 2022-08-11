/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertMetaToPagination, handlePageChange, updateMetaPageIndex } from '.';

describe('convertMetaToPagination', () => {
  expect(
    convertMetaToPagination({
      page: {
        current: 1,
        size: 10,
        total_results: 25,
        total_pages: 3, // Not used, EuiBasicTable calculates pages on its own
      },
    })
  ).toEqual({
    pageIndex: 0,
    pageSize: 10,
    totalItemCount: 25,
  });
});

describe('handlePageChange', () => {
  it('creates an onChange handler that calls a passed callback with the new page index', () => {
    const mockCallback = jest.fn();
    const handler = handlePageChange(mockCallback);

    handler({ page: { index: 0 } });
    expect(mockCallback).toHaveBeenCalledWith(1);
  });
});

describe('updateMetaPageIndex', () => {
  it('updates meta.page.current without mutating meta.page', () => {
    const oldMeta = {
      page: {
        current: 5,
        size: 10,
        total_results: 100,
        total_pages: 10,
      },
      some_other_meta: true,
    };
    const newMeta = updateMetaPageIndex(oldMeta, 6);

    expect(newMeta.page.current).toEqual(6);
    expect(oldMeta.page === newMeta.page).toEqual(false); // Would be true if we had simply done oldMeta.page.current = 6
  });
});
