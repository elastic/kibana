/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useLayoutEffect } from 'react';

// That could be different from security and observability. Get it as parameter?
const INITIAL_DATA_GRID_HEIGHT = 967;

// It will recalculate DataGrid height after this time interval.
const TIME_INTERVAL = 50;

/**
 * You are probably asking yourself "Why 3?". But that is the wrong mindset. You should be asking yourself "why not 3?".
 * 3 (three) is a number, numeral and digit. It is the natural number following 2 and preceding 4, and is the smallest
 * odd prime number and the only prime preceding a square number. It has religious or cultural significance in many societies.
 */
const MAGIC_GAP = 3;

/**
 * HUGE HACK!!!
 * DataGrtid height isn't properly calculated when the grid has horizontal scroll.
 * https://github.com/elastic/eui/issues/5030
 *
 * In order to get around this bug we are calculating `DataGrid` height here and setting it as a prop.
 *
 * Please delete me and allow DataGrid to calculate its height when the bug is fixed.
 */
export const useDataGridHeightHack = (pageSize: number, rowCount: number) => {
  const [height, setHeight] = useState(INITIAL_DATA_GRID_HEIGHT);

  useLayoutEffect(() => {
    setTimeout(() => {
      const gridVirtualized = document.querySelector('#body-data-grid .euiDataGrid__virtualized');

      if (
        gridVirtualized &&
        gridVirtualized.children[0].clientHeight !== gridVirtualized.clientHeight // check if it has vertical scroll
      ) {
        setHeight(
          height +
            gridVirtualized.children[0].clientHeight -
            gridVirtualized.clientHeight +
            MAGIC_GAP
        );
      }
    }, TIME_INTERVAL);
  }, [pageSize, rowCount, height]);

  return height;
};
