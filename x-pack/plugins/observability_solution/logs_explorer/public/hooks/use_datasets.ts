/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import createContainer from 'constate';
import { useInterpret, useSelector } from '@xstate/react';
import { FindDatasetsRequestQuery, SortOrder } from '../../common/latest';
import { IDatasetsClient } from '../services/datasets';
import { createDatasetsStateMachine } from '../state_machines/datasets';

interface DatasetsContextDeps {
  datasetsClient: IDatasetsClient;
}

export interface SearchDatasetsParams {
  name: string;
  sortOrder: SortOrder;
}

export type SearchDatasets = (params: SearchDatasetsParams) => void;
export type LoadDatasets = () => void;
export type ReloadDatasets = () => void;

const useDatasets = ({ datasetsClient }: DatasetsContextDeps) => {
  const datasetsStateService = useInterpret(() =>
    createDatasetsStateMachine({
      datasetsClient,
    })
  );

  const datasets = useSelector(datasetsStateService, (state) => state.context.datasets);

  const error = useSelector(datasetsStateService, (state) => state.context.error);

  const isLoading = useSelector(
    datasetsStateService,
    (state) => state.matches('loading') || state.matches('debounceSearchingDatasets')
  );

  const loadDatasets = useCallback(
    () => datasetsStateService.send({ type: 'LOAD_DATASETS' }),
    [datasetsStateService]
  );

  const reloadDatasets = useCallback(
    () => datasetsStateService.send({ type: 'RELOAD_DATASETS' }),
    [datasetsStateService]
  );

  const searchDatasets: SearchDatasets = useCallback(
    (searchParams) =>
      datasetsStateService.send({
        type: 'SEARCH_DATASETS',
        search: formatSearchParams(searchParams),
      }),
    [datasetsStateService]
  );

  return {
    // Underlying state machine
    datasetsStateService,

    // Failure states
    error,

    // Loading states
    isLoading,

    // Data
    datasets,

    // Actions
    loadDatasets,
    reloadDatasets,
    searchDatasets,
  };
};

export const [DatasetsProvider, useDatasetsContext] = createContainer(useDatasets);

/**
 * Utils
 */
const formatSearchParams = ({
  name,
  ...params
}: SearchDatasetsParams): FindDatasetsRequestQuery => ({
  datasetQuery: name,
  ...params,
});
