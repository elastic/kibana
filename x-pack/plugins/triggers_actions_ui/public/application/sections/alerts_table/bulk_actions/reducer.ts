/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BulkActionsReducerAction, BulkActionsState, BulkActionsVerbs } from '../../../../types';

const getAllRowsInPage = (rowCount: number) => new Set(Array.from(Array(rowCount).keys()));

export const bulkActionsReducer = (
  currentState: BulkActionsState,
  { action, rowIndex, rowCount }: BulkActionsReducerAction
): BulkActionsState => {
  const { rowSelection, rowCount: currentRowCount } = currentState;
  const nextState = { ...currentState };

  if (action === BulkActionsVerbs.add && rowIndex !== undefined) {
    const nextRowSelection = new Set(rowSelection);
    nextRowSelection.add(rowIndex);
    nextState.rowSelection = nextRowSelection;
  } else if (action === BulkActionsVerbs.delete && rowIndex !== undefined) {
    const nextRowSelection = new Set(rowSelection);
    nextRowSelection.delete(rowIndex);
    nextState.rowSelection = nextRowSelection;
  } else if (action === BulkActionsVerbs.selectCurrentPage) {
    nextState.rowSelection = getAllRowsInPage(currentRowCount);
  } else if (action === BulkActionsVerbs.selectAll) {
    nextState.rowSelection = getAllRowsInPage(currentRowCount);
    nextState.isAllSelected = true;
  } else if (action === BulkActionsVerbs.clear) {
    nextState.rowSelection = new Set();
    nextState.isAllSelected = false;
  } else if (action === BulkActionsVerbs.rowCountUpdate && rowCount !== undefined) {
    nextState.rowCount = rowCount;
  }

  nextState.areAllVisibleRowsSelected = nextState.rowSelection.size === nextState.rowCount;

  return nextState;
};
