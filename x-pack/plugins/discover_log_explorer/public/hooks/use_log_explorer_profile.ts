/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useActor } from '@xstate/react';
import { useCallback } from 'react';
import { LogExplorerProfileStateService } from '../state_machines/log_explorer_profile';
import { DatasetSelectionChange } from '../utils/dataset_selection';

export const useLogExplorerProfile = (
  logExplorerProfileStateService: LogExplorerProfileStateService
) => {
  const [logStreamPageState, logStreamPageSend] = useActor(logExplorerProfileStateService);

  const { datasetSelection } = logStreamPageState.context;

  const handleDatasetSelectionChange: DatasetSelectionChange = useCallback(
    (data) => {
      logStreamPageSend({ type: 'UPDATE_DATASET_SELECTION', data });
    },
    [logStreamPageSend]
  );

  return { datasetSelection, handleDatasetSelectionChange };
};
