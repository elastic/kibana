/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import createContainer from 'constate';
import { useInterpret, useSelector } from '@xstate/react';
import { FindDataStreamsRequestQuery, SortOrder } from '../../common';
import { IDataStreamsClient } from '../services/data_streams';
import { createDataStreamsStateMachine } from '../state_machines/data_streams';

interface DataStreamsContextDeps {
  dataStreamsClient: IDataStreamsClient;
}

export interface SearchDataStreamsParams {
  name: string;
  sortOrder: SortOrder;
}

export type SearchDataStreams = (params: SearchDataStreamsParams) => void;
export type LoadDataStreams = () => void;
export type ReloadDataStreams = () => void;

const useDataStreams = ({ dataStreamsClient }: DataStreamsContextDeps) => {
  const dataStreamsStateService = useInterpret(() =>
    createDataStreamsStateMachine({
      dataStreamsClient,
    })
  );

  const dataStreams = useSelector(dataStreamsStateService, (state) => state.context.dataStreams);

  const error = useSelector(dataStreamsStateService, (state) => state.context.error);

  const isUninitialized = useSelector(dataStreamsStateService, (state) =>
    state.matches('uninitialized')
  );

  const isLoading = useSelector(
    dataStreamsStateService,
    (state) => state.matches('loading') || state.matches('debounceSearchingDataStreams')
  );

  const hasFailedLoading = useSelector(dataStreamsStateService, (state) =>
    state.matches('loadingFailed')
  );

  const loadDataStreams = useCallback(
    () => dataStreamsStateService.send({ type: 'LOAD_DATA_STREAMS' }),
    [dataStreamsStateService]
  );

  const reloadDataStreams = useCallback(
    () => dataStreamsStateService.send({ type: 'RELOAD_DATA_STREAMS' }),
    [dataStreamsStateService]
  );

  const searchDataStreams: SearchDataStreams = useCallback(
    (searchParams) =>
      dataStreamsStateService.send({
        type: 'SEARCH_DATA_STREAMS',
        search: formatSearchParams(searchParams),
      }),
    [dataStreamsStateService]
  );

  const sortDataStreams: SearchDataStreams = useCallback(
    (searchParams) =>
      dataStreamsStateService.send({
        type: 'SORT_DATA_STREAMS',
        search: formatSearchParams(searchParams),
      }),
    [dataStreamsStateService]
  );

  return {
    // Underlying state machine
    dataStreamsStateService,

    // Failure states
    error,
    hasFailedLoading,

    // Loading states
    isUninitialized,
    isLoading,

    // Data
    dataStreams,

    // Actions
    loadDataStreams,
    reloadDataStreams,
    searchDataStreams,
    sortDataStreams,
  };
};

export const [DataStreamsProvider, useDataStreamsContext] = createContainer(useDataStreams);

/**
 * Utils
 */
const formatSearchParams = ({
  name,
  ...params
}: SearchDataStreamsParams): FindDataStreamsRequestQuery => ({
  datasetQuery: name,
  ...params,
});
