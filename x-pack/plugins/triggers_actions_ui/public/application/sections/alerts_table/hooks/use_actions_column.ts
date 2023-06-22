/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { UseActionsColumnRegistry, BulkActionsVerbs } from '../../../../types';
import { BulkActionsContext } from '../bulk_actions/context';

const DEFAULT_ACTIONS_COLUMNS_WIDTH = 75;

interface UseActionsColumnProps {
  options?: UseActionsColumnRegistry;
}

export const useActionsColumn = ({ options }: UseActionsColumnProps) => {
  const [, updateBulkActionsState] = useContext(BulkActionsContext);

  const useUserActionsColumn = options
    ? options
    : () => ({
        renderCustomActionsRow: undefined,
        width: undefined,
      });

  const { renderCustomActionsRow, width: actionsColumnWidth = DEFAULT_ACTIONS_COLUMNS_WIDTH } =
    useUserActionsColumn();

  // we save the rowIndex when creating the function to be used by the clients
  // so they don't have to manage it
  const getSetIsActionLoadingCallback =
    (rowIndex: number) =>
    (isLoading: boolean = true) => {
      updateBulkActionsState({
        action: BulkActionsVerbs.updateRowLoadingState,
        rowIndex,
        isLoading,
      });
    };

  return {
    renderCustomActionsRow,
    actionsColumnWidth,
    getSetIsActionLoadingCallback,
  };
};
