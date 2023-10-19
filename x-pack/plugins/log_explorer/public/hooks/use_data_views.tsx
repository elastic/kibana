/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import createContainer from 'constate';
import { useInterpret, useSelector } from '@xstate/react';
import { DataViewListItem, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { SortOrder } from '../../common/latest';
import { createDataViewsStateMachine } from '../state_machines/data_views';

interface DataViewsContextDeps {
  dataViewsService: DataViewsPublicPluginStart;
  discoverService: DiscoverStart;
}

export interface SearchDataViewsParams {
  name: string;
  sortOrder: SortOrder;
}

export type DataViewSelectionHandler = (dataView: DataViewListItem) => void;
export type SearchDataViews = (params: SearchDataViewsParams) => void;
export type LoadDataViews = () => void;
export type ReloadDataViews = () => void;

const useDataViews = ({ dataViewsService, discoverService }: DataViewsContextDeps) => {
  const dataViewsStateService = useInterpret(() =>
    createDataViewsStateMachine({
      dataViews: dataViewsService,
      discover: discoverService,
    })
  );

  const dataViews = useSelector(dataViewsStateService, (state) => state.context.dataViews);

  const error = useSelector(dataViewsStateService, (state) => state.context.error);

  const isLoading = useSelector(dataViewsStateService, (state) => state.matches('loading'));

  const loadDataViews = useCallback(
    () => dataViewsStateService.send({ type: 'LOAD_DATA_VIEWS' }),
    [dataViewsStateService]
  );

  const reloadDataViews = useCallback(
    () => dataViewsStateService.send({ type: 'RELOAD_DATA_VIEWS' }),
    [dataViewsStateService]
  );

  const searchDataViews: SearchDataViews = useCallback(
    (searchParams) =>
      dataViewsStateService.send({
        type: 'SEARCH_DATA_VIEWS',
        search: searchParams,
      }),
    [dataViewsStateService]
  );

  const selectDataView: DataViewSelectionHandler = useCallback(
    (dataView) =>
      dataViewsStateService.send({
        type: 'SELECT_DATA_VIEW',
        dataView,
      }),
    [dataViewsStateService]
  );

  const sortDataViews: SearchDataViews = useCallback(
    (searchParams) =>
      dataViewsStateService.send({
        type: 'SORT_DATA_VIEWS',
        search: searchParams,
      }),
    [dataViewsStateService]
  );

  return {
    // Underlying state machine
    dataViewsStateService,

    // Failure states
    error,

    // Loading states
    isLoading,

    // Data
    dataViews,

    // Actions
    loadDataViews,
    reloadDataViews,
    searchDataViews,
    selectDataView,
    sortDataViews,
  };
};

export const [DataViewsProvider, useDataViewsContext] = createContainer(useDataViews);
