/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInterpret, useSelector } from '@xstate/react';
import { useCallback } from 'react';
import { createDataStreamsSelectorStateMachine } from './state_machine';

export const useDataStreamSelector = () => {
  const dataStreamsSelectorStateService = useInterpret(() =>
    createDataStreamsSelectorStateMachine({})
  );

  const isOpen = useSelector(dataStreamsSelectorStateService, (state) => state.matches('open'));

  const togglePopover = useCallback(
    () => dataStreamsSelectorStateService.send({ type: 'TOGGLE' }),
    [dataStreamsSelectorStateService]
  );

  return {
    // Data
    isOpen,

    // Failure states

    // Loading states

    // Actions
    togglePopover,
  };
};

// export const [IntegrationsProvider, useIntegrationsContext] =
//   createContainer(useDataStreamSelector);
