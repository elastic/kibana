/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useInterpret, useSelector } from '@xstate/react';
import createContainer from 'constate';
import { useCallback } from 'react';
import {
  createIntegrationStateMachine,
  IntegrationsSearchParams,
} from '../state_machines/integrations';
import { IIntegrationsClient } from '../services/integrations';

interface IntegrationsContextDeps {
  integrationsClient: IIntegrationsClient;
}

export type SearchIntegrations = (params: IntegrationsSearchParams) => void;

const useIntegrations = ({ integrationsClient }: IntegrationsContextDeps) => {
  const integrationsStateService = useInterpret(() =>
    createIntegrationStateMachine({
      integrationsClient,
    })
  );

  const integrations = useSelector(integrationsStateService, (state) => state.context.integrations);

  const isUninitialized = useSelector(integrationsStateService, (state) =>
    state.matches('uninitialized')
  );

  const isLoading = useSelector(integrationsStateService, (state) => state.matches('loading'));

  const hasFailedLoading = useSelector(integrationsStateService, (state) =>
    state.matches('loadingFailed')
  );

  const search: SearchIntegrations = useCallback(
    (searchParams) =>
      integrationsStateService.send({
        type: 'SEARCH_INTEGRATIONS',
        search: searchParams,
      }),
    [integrationsStateService]
  );

  const loadMore = useCallback(
    () => integrationsStateService.send({ type: 'LOAD_MORE_INTEGRATIONS' }),
    [integrationsStateService]
  );

  return {
    // Underlying state machine
    integrationsStateService,

    // Failure states
    hasFailedLoading,

    // Loading states
    isUninitialized,
    isLoading,

    // Data
    integrations,

    // Actions
    search,
    loadMore,
  };
};

export const [IntegrationsProvider, useIntegrationsContext] = createContainer(useIntegrations);
