/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { useCallback } from 'react';
import { DatasetSelectionChange } from '../../common/dataset_selection';
import { LogExplorerControllerStateService } from '../state_machines/log_explorer_controller';

export const useDatasetSelection = (
  logExplorerControllerStateService: LogExplorerControllerStateService
) => {
  const datasetSelection = useSelector(logExplorerControllerStateService, (state) => {
    return state.context.datasetSelection;
  });

  const handleDatasetSelectionChange: DatasetSelectionChange = useCallback(
    (data) => {
      logExplorerControllerStateService.send({ type: 'UPDATE_DATASET_SELECTION', data });
    },
    [logExplorerControllerStateService]
  );

  return { datasetSelection, handleDatasetSelectionChange };
};
