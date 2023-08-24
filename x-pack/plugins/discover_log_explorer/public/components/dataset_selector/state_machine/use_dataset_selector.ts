/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useInterpret, useSelector } from '@xstate/react';
import {
  ChangePanelHandler,
  DatasetSelectionHandler,
  DatasetsSelectorSearchHandler,
  PanelId,
} from '../types';
import { createDatasetsSelectorStateMachine } from './state_machine';
import { DatasetsSelectorStateMachineDependencies } from './types';

export const useDatasetSelector = ({
  initialContext,
  onIntegrationsLoadMore,
  onIntegrationsReload,
  onIntegrationsSearch,
  onIntegrationsSort,
  onIntegrationsStreamsSearch,
  onIntegrationsStreamsSort,
  onSelectionChange,
  onUnmanagedStreamsSearch,
  onUnmanagedStreamsSort,
  onUnmanagedStreamsReload,
}: DatasetsSelectorStateMachineDependencies) => {
  const datasetsSelectorStateService = useInterpret(() =>
    createDatasetsSelectorStateMachine({
      initialContext,
      onIntegrationsLoadMore,
      onIntegrationsReload,
      onIntegrationsSearch,
      onIntegrationsSort,
      onIntegrationsStreamsSearch,
      onIntegrationsStreamsSort,
      onSelectionChange,
      onUnmanagedStreamsSearch,
      onUnmanagedStreamsSort,
      onUnmanagedStreamsReload,
    })
  );

  const isOpen = useSelector(datasetsSelectorStateService, (state) =>
    state.matches('popover.open')
  );

  const panelId = useSelector(datasetsSelectorStateService, (state) => state.context.panelId);
  const search = useSelector(datasetsSelectorStateService, (state) => state.context.search);

  const changePanel = useCallback<ChangePanelHandler>(
    (panelDetails) =>
      datasetsSelectorStateService.send({
        type: 'CHANGE_PANEL',
        panelId: panelDetails.panelId as PanelId,
      }),
    [datasetsSelectorStateService]
  );

  const scrollToIntegrationsBottom = useCallback(
    () => datasetsSelectorStateService.send({ type: 'SCROLL_TO_INTEGRATIONS_BOTTOM' }),
    [datasetsSelectorStateService]
  );

  const searchByName = useCallback<DatasetsSelectorSearchHandler>(
    (params) => datasetsSelectorStateService.send({ type: 'SEARCH_BY_NAME', search: params }),
    [datasetsSelectorStateService]
  );

  const selectAllLogDataset = useCallback(
    () => datasetsSelectorStateService.send({ type: 'SELECT_ALL_LOGS_DATASET' }),
    [datasetsSelectorStateService]
  );

  const selectDataset = useCallback<DatasetSelectionHandler>(
    (dataset) => datasetsSelectorStateService.send({ type: 'SELECT_DATASET', dataset }),
    [datasetsSelectorStateService]
  );

  const sortByOrder = useCallback<DatasetsSelectorSearchHandler>(
    (params) => datasetsSelectorStateService.send({ type: 'SORT_BY_ORDER', search: params }),
    [datasetsSelectorStateService]
  );

  const closePopover = useCallback(
    () => datasetsSelectorStateService.send({ type: 'CLOSE' }),
    [datasetsSelectorStateService]
  );

  const togglePopover = useCallback(
    () => datasetsSelectorStateService.send({ type: 'TOGGLE' }),
    [datasetsSelectorStateService]
  );

  return {
    // Data
    isOpen,
    panelId,
    search,
    // Actions
    closePopover,
    changePanel,
    scrollToIntegrationsBottom,
    searchByName,
    selectAllLogDataset,
    selectDataset,
    sortByOrder,
    togglePopover,
  };
};
