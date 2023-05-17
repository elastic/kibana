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
import { IDataStreamsClient } from '../services/data_streams';

interface IntegrationsContextDeps {
  dataStreamsClient: IDataStreamsClient;
}

export type SearchIntegrations = (params: IntegrationsSearchParams) => void;
export type LoadMoreIntegrations = () => void;

const useIntegrations = ({ dataStreamsClient }: IntegrationsContextDeps) => {
  const integrationsStateService = useInterpret(() =>
    createIntegrationStateMachine({
      dataStreamsClient,
    })
  );

  const integrations = useSelector(integrationsStateService, (state) => state.context.integrations);
  const search = useSelector(integrationsStateService, (state) => state.context.search);

  const error = useSelector(integrationsStateService, (state) => state.context.error);

  const isUninitialized = useSelector(integrationsStateService, (state) =>
    state.matches('uninitialized')
  );

  const isLoading = useSelector(
    integrationsStateService,
    (state) =>
      state.matches('loading') || state.matches('loadingMore') || state.matches('debouncingSearch')
  );

  const hasFailedLoading = useSelector(integrationsStateService, (state) =>
    state.matches('loadingFailed')
  );

  const searchIntegrations: SearchIntegrations = useCallback(
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
    error,
    hasFailedLoading,

    // Loading states
    isUninitialized,
    isLoading,

    // Data
    integrations,
    search,

    // Actions
    searchIntegrations,
    loadMore,
  };
};

export const [IntegrationsProvider, useIntegrationsContext] = createContainer(useIntegrations);
