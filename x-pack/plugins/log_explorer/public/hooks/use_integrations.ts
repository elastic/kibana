/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import createContainer from 'constate';
import { useInterpret, useSelector } from '@xstate/react';
import { FindIntegrationsRequestQuery, SortOrder } from '../../common/latest';
import { IDatasetsClient } from '../services/datasets';
import { createIntegrationStateMachine } from '../state_machines/integrations';

interface IntegrationsContextDeps {
  datasetsClient: IDatasetsClient;
}

export interface SearchIntegrationsParams {
  name: string;
  sortOrder: SortOrder;
  integrationId?: string;
}

export type SearchIntegrations = (params: SearchIntegrationsParams) => void;
export type ReloadIntegrations = () => void;
export type LoadMoreIntegrations = () => void;

const useIntegrations = ({ datasetsClient }: IntegrationsContextDeps) => {
  const integrationsStateService = useInterpret(() =>
    createIntegrationStateMachine({
      datasetsClient,
    })
  );

  const integrations = useSelector(integrationsStateService, (state) => state.context.integrations);

  const error = useSelector(integrationsStateService, (state) => state.context.error);

  const isLoading = useSelector(integrationsStateService, (state) => state.matches('loading'));

  const isSearching = useSelector(
    integrationsStateService,
    (state) =>
      state.matches({ loaded: 'loadingMore' }) ||
      state.matches({ loaded: 'debounceSearchingIntegrations' }) ||
      state.matches({ loaded: 'debounceSearchingIntegrationsStreams' })
  );

  const searchIntegrations: SearchIntegrations = useCallback(
    (searchParams) =>
      integrationsStateService.send({
        type: 'SEARCH_INTEGRATIONS',
        search: formatSearchParams(searchParams),
      }),
    [integrationsStateService]
  );

  const sortIntegrations: SearchIntegrations = useCallback(
    (searchParams) =>
      integrationsStateService.send({
        type: 'SORT_INTEGRATIONS',
        search: formatSearchParams(searchParams),
      }),
    [integrationsStateService]
  );

  const searchIntegrationsStreams: SearchIntegrations = useCallback(
    (searchParams) =>
      integrationsStateService.send({
        type: 'SEARCH_INTEGRATIONS_STREAMS',
        search: formatSearchParams(searchParams),
      }),
    [integrationsStateService]
  );

  const sortIntegrationsStreams: SearchIntegrations = useCallback(
    (searchParams) =>
      integrationsStateService.send({
        type: 'SORT_INTEGRATIONS_STREAMS',
        search: formatSearchParams(searchParams),
      }),
    [integrationsStateService]
  );

  const reloadIntegrations = useCallback(
    () => integrationsStateService.send({ type: 'RELOAD_INTEGRATIONS' }),
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
    // Loading states
    isLoading,
    isSearching,
    // Data
    integrations,
    // Actions
    loadMore,
    reloadIntegrations,
    searchIntegrations,
    sortIntegrations,
    searchIntegrationsStreams,
    sortIntegrationsStreams,
  };
};

export const [IntegrationsProvider, useIntegrationsContext] = createContainer(useIntegrations);

/**
 * Utils
 */
const formatSearchParams = ({
  name,
  ...params
}: SearchIntegrationsParams): FindIntegrationsRequestQuery => ({
  nameQuery: name,
  ...params,
});
