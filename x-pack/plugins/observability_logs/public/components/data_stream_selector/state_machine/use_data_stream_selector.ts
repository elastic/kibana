/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInterpret, useSelector } from '@xstate/react';
import { useCallback } from 'react';
import { PanelId } from '../types';
import { createDataStreamsSelectorStateMachine } from './state_machine';
import { ChangePanelHandler } from './types';

export const useDataStreamSelector = () => {
  const dataStreamsSelectorStateService = useInterpret(() =>
    createDataStreamsSelectorStateMachine({})
  );

  const isOpen = useSelector(dataStreamsSelectorStateService, (state) => state.matches('open'));

  const panelId = useSelector(dataStreamsSelectorStateService, (state) => state.context.panelId);

  const togglePopover = useCallback(
    () => dataStreamsSelectorStateService.send({ type: 'TOGGLE' }),
    [dataStreamsSelectorStateService]
  );

  const changePanel = useCallback<ChangePanelHandler>(
    (panelDetails) =>
      dataStreamsSelectorStateService.send({
        type: 'CHANGE_PANEL',
        panelId: panelDetails.panelId as PanelId,
      }),
    [dataStreamsSelectorStateService]
  );

  return {
    // Data
    isOpen,
    panelId,

    // Failure states

    // Loading states

    // Actions
    changePanel,
    togglePopover,
  };
};

// export const [IntegrationsProvider, useIntegrationsContext] =
//   createContainer(useDataStreamSelector);
