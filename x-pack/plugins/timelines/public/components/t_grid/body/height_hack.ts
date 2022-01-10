/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useLayoutEffect } from 'react';

// Hard coded height for every page size
// rowHeight * pageSize + (filtersHeight + headerHeight + paginationHeight + 1)
// +1 is for useLayoutEffect to detect the change
const DATA_GRID_HEIGHT_BY_PAGE_SIZE: { [key: number]: number } = {
  10: 389,
  25: 809,
  50: 1509,
  100: 2909,
};

/**
 * HUGE HACK!!!
 * DataGrid height isn't properly calculated when the grid has horizontal scroll.
 * https://github.com/elastic/eui/issues/5030
 *
 * In order to get around this bug we are calculating `DataGrid` height here and setting it as a prop.
 *
 * Please delete me and allow DataGrid to calculate its height when the bug is fixed.
 */

const filtersHeight = 32;
const headerHeight = 40;
const paginationHeight = 36;
const rowHeight = 28;

export const useDataGridHeightHack = (pageSize: number, rowCount: number) => {
  const [height, setHeight] = useState(DATA_GRID_HEIGHT_BY_PAGE_SIZE[pageSize]);

  useLayoutEffect(() => {
    if (rowCount < pageSize) {
      setHeight(rowHeight * rowCount + (headerHeight + filtersHeight + paginationHeight));
    } else {
      setHeight(DATA_GRID_HEIGHT_BY_PAGE_SIZE[pageSize]);
    }
  }, [pageSize, rowCount]);

  return height;
};
