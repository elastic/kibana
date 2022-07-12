/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkActionsReducerAction, BulkActionsState } from '../../../../types';

const getAllRowsInPage = (pageSize: number) => new Set(Array.from(Array(pageSize).keys()));

export const bulkActionsReducer = (
  { rowSelection, pageSize: currentPageSize }: BulkActionsState,
  { action, rowIndex, pageSize }: BulkActionsReducerAction
): BulkActionsState => {
  const nextState = {
    rowSelection,
    isAllSelected: false,
    isPageSelected: false,
    pageSize: currentPageSize,
  };

  if (action === 'add' && rowIndex !== undefined) {
    const nextRowSelection = new Set(rowSelection);
    nextRowSelection.add(rowIndex);
    nextState.rowSelection = nextRowSelection;
  } else if (action === 'delete' && rowIndex !== undefined) {
    const nextRowSelection = new Set(rowSelection);
    nextRowSelection.delete(rowIndex);
    nextState.rowSelection = nextRowSelection;
  } else if (action === 'selectCurrentPage') {
    nextState.rowSelection = getAllRowsInPage(currentPageSize);
    nextState.isPageSelected = true;
  } else if (action === 'selectAll') {
    nextState.rowSelection = getAllRowsInPage(currentPageSize);
    nextState.isPageSelected = true;
    nextState.isAllSelected = true;
  } else if (action === 'clear') {
    nextState.rowSelection = new Set();
    nextState.isAllSelected = false;
    nextState.isPageSelected = false;
  } else if (action === 'updatePageSize' && pageSize !== undefined) {
    nextState.pageSize = pageSize;
  }

  return nextState;
};
