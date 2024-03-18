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
import { DataViewDescriptor } from '../../common/data_views/models/data_view_descriptor';
import { SortOrder } from '../../common/latest';
import { createDataViewsStateMachine } from '../state_machines/data_views';
import { LogsExplorerCustomizations } from '../controller';

interface DataViewsContextDeps {
  dataViewsService: DataViewsPublicPluginStart;
  events: LogsExplorerCustomizations['events'];
}

export interface SearchDataViewsParams {
  name: string;
  sortOrder: SortOrder;
}

export type SearchDataViews = (params: SearchDataViewsParams) => void;
export type LoadDataViews = () => void;
export type ReloadDataViews = () => void;
export type IsDataViewAvailable = (dataView: DataViewDescriptor) => boolean;

const useDataViews = ({ dataViewsService, events }: DataViewsContextDeps) => {
  const dataViewsStateService = useInterpret(() =>
    createDataViewsStateMachine({
      dataViews: dataViewsService,
    })
  );

  const dataViews = useSelector(dataViewsStateService, (state) => state.context.dataViews);

  const error = useSelector(dataViewsStateService, (state) => state.context.error);

  const isLoading = useSelector(dataViewsStateService, (state) => state.matches('loading'));

  const isDataViewAvailable: IsDataViewAvailable = useCallback(
    (dataView) =>
      dataView.isLogsDataType() ||
      (dataView.isUnknownDataType() && Boolean(events?.onUknownDataViewSelection)),
    [events?.onUknownDataViewSelection]
  );

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
    isDataViewAvailable,
    loadDataViews,
    reloadDataViews,
    searchDataViews,
    sortDataViews,
  };
};

export const [DataViewsProvider, useDataViewsContext] = createContainer(useDataViews);
