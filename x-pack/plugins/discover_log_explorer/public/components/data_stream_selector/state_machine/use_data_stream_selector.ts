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
  DataStreamSelectionHandler,
  DataStreamsSelectorSearchHandler,
  PanelId,
} from '../types';
import { createDataStreamsSelectorStateMachine } from './state_machine';
import { DataStreamsSelectorStateMachineDependencies } from './types';

export const useDataStreamSelector = ({
  onIntegrationsLoadMore,
  onIntegrationsReload,
  onIntegrationsSearch,
  onIntegrationsSort,
  onIntegrationsStreamsSearch,
  onIntegrationsStreamsSort,
  onUnmanagedStreamsSearch,
  onUnmanagedStreamsSort,
  onStreamSelected,
  onUnmanagedStreamsReload,
}: DataStreamsSelectorStateMachineDependencies) => {
  const dataStreamsSelectorStateService = useInterpret(() =>
    createDataStreamsSelectorStateMachine({
      onIntegrationsLoadMore,
      onIntegrationsReload,
      onIntegrationsSearch,
      onIntegrationsSort,
      onIntegrationsStreamsSearch,
      onIntegrationsStreamsSort,
      onUnmanagedStreamsSearch,
      onUnmanagedStreamsSort,
      onStreamSelected,
      onUnmanagedStreamsReload,
    })
  );

  const isOpen = useSelector(dataStreamsSelectorStateService, (state) => state.matches('open'));

  const panelId = useSelector(dataStreamsSelectorStateService, (state) => state.context.panelId);
  const search = useSelector(dataStreamsSelectorStateService, (state) => state.context.search);

  const changePanel = useCallback<ChangePanelHandler>(
    (panelDetails) =>
      dataStreamsSelectorStateService.send({
        type: 'CHANGE_PANEL',
        panelId: panelDetails.panelId as PanelId,
      }),
    [dataStreamsSelectorStateService]
  );

  const scrollToIntegrationsBottom = useCallback(
    () => dataStreamsSelectorStateService.send({ type: 'SCROLL_TO_INTEGRATIONS_BOTTOM' }),
    [dataStreamsSelectorStateService]
  );

  const searchByName = useCallback<DataStreamsSelectorSearchHandler>(
    (params) => dataStreamsSelectorStateService.send({ type: 'SEARCH_BY_NAME', search: params }),
    [dataStreamsSelectorStateService]
  );

  const selectDataStream = useCallback<DataStreamSelectionHandler>(
    (dataStream) => dataStreamsSelectorStateService.send({ type: 'SELECT_STREAM', dataStream }),
    [dataStreamsSelectorStateService]
  );

  const sortByOrder = useCallback<DataStreamsSelectorSearchHandler>(
    (params) => dataStreamsSelectorStateService.send({ type: 'SORT_BY_ORDER', search: params }),
    [dataStreamsSelectorStateService]
  );

  const togglePopover = useCallback(
    () => dataStreamsSelectorStateService.send({ type: 'TOGGLE' }),
    [dataStreamsSelectorStateService]
  );

  return {
    // Data
    isOpen,
    panelId,
    search,
    // Actions
    changePanel,
    scrollToIntegrationsBottom,
    searchByName,
    selectDataStream,
    sortByOrder,
    togglePopover,
  };
};
