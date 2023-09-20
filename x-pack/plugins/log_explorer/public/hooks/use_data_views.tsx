/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import createContainer from 'constate';
import { useInterpret, useSelector } from '@xstate/react';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { SortOrder } from '../../common/latest';
import { createDataViewsStateMachine } from '../state_machines/data_views';

interface DataViewsContextDeps {
  dataViews: DataViewsPublicPluginStart;
}

export interface SearchDataViewsParams {
  name: string;
  sortOrder: SortOrder;
}

export type SearchDataViews = (params: SearchDataViewsParams) => void;
export type LoadDataViews = () => void;
export type ReloadDataViews = () => void;

const useDataViews = ({ dataViews }: DataViewsContextDeps) => {
  const datasetsStateService = useInterpret(() =>
    createDataViewsStateMachine({
      dataViews,
    })
  );

  const datasets = useSelector(datasetsStateService, (state) => state.context.datasets);

  const error = useSelector(datasetsStateService, (state) => state.context.error);

  const isLoading = useSelector(
    datasetsStateService,
    (state) => state.matches('loading') || state.matches('debounceSearchingDataViews')
  );

  const loadDataViews = useCallback(
    () => datasetsStateService.send({ type: 'LOAD_DATA_VIEWS' }),
    [datasetsStateService]
  );

  const reloadDataViews = useCallback(
    () => datasetsStateService.send({ type: 'RELOAD_DATA_VIEWS' }),
    [datasetsStateService]
  );

  const searchDataViews: SearchDataViews = useCallback(
    (searchParams) =>
      datasetsStateService.send({
        type: 'SEARCH_DATA_VIEWS',
        search: formatSearchParams(searchParams),
      }),
    [datasetsStateService]
  );

  const sortDataViews: SearchDataViews = useCallback(
    (searchParams) =>
      datasetsStateService.send({
        type: 'SORT_DATA_VIEWS',
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
    loadDataViews,
    reloadDataViews,
    searchDataViews,
    sortDataViews,
  };
};

export const [DataViewsProvider, useDataViewsContext] = createContainer(useDataViews);

/**
 * Utils
 */
const formatSearchParams = ({
  name,
  ...params
}: SearchDataViewsParams): FindDataViewsRequestQuery => ({
  datasetQuery: name,
  ...params,
});
