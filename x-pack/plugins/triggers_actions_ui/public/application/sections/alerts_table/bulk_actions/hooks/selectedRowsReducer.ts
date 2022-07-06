/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RowSelectionAction, RowSelectionState } from '../../../../../types';

export const selectedRowsReducer = (
  { rowSelection }: RowSelectionState,
  { action, rowIndex, rowsCount }: RowSelectionAction
): RowSelectionState => {
  const nextState = { rowSelection, isAllSelected: false, isPageSelected: false };
  if (action === 'add' && rowIndex !== undefined) {
    const nextRowSelection = new Set(rowSelection);
    nextRowSelection.add(parseInt(rowIndex, 10));
    nextState.rowSelection = nextRowSelection;
  } else if (action === 'delete' && rowIndex !== undefined) {
    const nextRowSelection = new Set(rowSelection);
    nextRowSelection.delete(parseInt(rowIndex, 10));
    nextState.rowSelection = nextRowSelection;
  } else if (action === 'selectCurrentPage' && rowsCount) {
    nextState.rowSelection = new Set(Array.from(Array(rowsCount).keys()));
    nextState.isPageSelected = true;
  } else if (action === 'clear') {
    nextState.rowSelection = new Set();
    nextState.isAllSelected = false;
    nextState.isPageSelected = false;
  } else if (action === 'selectAll') {
    nextState.isAllSelected = true;
  }
  return nextState;
};
