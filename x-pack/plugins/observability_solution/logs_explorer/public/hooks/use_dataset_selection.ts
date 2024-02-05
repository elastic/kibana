/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from '@xstate/react';
import { useCallback } from 'react';
import { DatasetSelectionChange } from '../../common/dataset_selection';
import { LogsExplorerControllerStateService } from '../state_machines/logs_explorer_controller';

export const useDatasetSelection = (
  logsExplorerControllerStateService: LogsExplorerControllerStateService
) => {
  const datasetSelection = useSelector(logsExplorerControllerStateService, (state) => {
    return state.context.datasetSelection;
  });

  const handleDatasetSelectionChange: DatasetSelectionChange = useCallback(
    (data) => {
      logsExplorerControllerStateService.send({ type: 'UPDATE_DATASET_SELECTION', data });
    },
    [logsExplorerControllerStateService]
  );

  return { datasetSelection, handleDatasetSelectionChange };
};
