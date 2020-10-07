/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { combineReducers, createStore } from 'redux';
import { TrustedApp } from '../../../../../common/endpoint/types';
import { RoutingAction } from '../../../../common/store/routing';

import {
  MANAGEMENT_DEFAULT_PAGE,
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_PAGE_SIZE_OPTIONS,
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_TRUSTED_APPS_NAMESPACE,
} from '../../../common/constants';

import {
  AsyncResourceState,
  FailedResourceState,
  LoadedResourceState,
  LoadingResourceState,
  Pagination,
  StaleResourceState,
  TrustedAppsListData,
  TrustedAppsListPageState,
  UninitialisedResourceState,
} from '../state';

import { trustedAppsPageReducer } from '../store/reducer';
import { TrustedAppsListResourceStateChanged } from '../store/action';

const OS_LIST: Array<TrustedApp['os']> = ['windows', 'macos', 'linux'];

export const createSampleTrustedApp = (i: number): TrustedApp => {
  return {
    id: String(i),
    name: `trusted app ${i}`,
    description: `Trusted App ${i}`,
    created_at: '1 minute ago',
    created_by: 'someone',
    os: OS_LIST[i % 3],
    entries: [],
  };
};

export const createSampleTrustedApps = (pagination: Partial<Pagination>): TrustedApp[] => {
  const fullPagination = { ...createDefaultPagination(), ...pagination };

  return [...new Array(fullPagination.pageSize).keys()].map(createSampleTrustedApp);
};

export const createTrustedAppsListData = (pagination: Partial<Pagination>, timestamp: number) => {
  const fullPagination = { ...createDefaultPagination(), ...pagination };

  return {
    items: createSampleTrustedApps(fullPagination),
    pageSize: fullPagination.pageSize,
    pageIndex: fullPagination.pageIndex,
    totalItemsCount: fullPagination.totalItemCount,
    timestamp,
  };
};

export const createServerApiError = (message: string) => ({
  statusCode: 500,
  error: 'Internal Server Error',
  message,
});

export const createUninitialisedResourceState = (): UninitialisedResourceState => ({
  type: 'UninitialisedResourceState',
});

export const createListLoadedResourceState = (
  pagination: Partial<Pagination>,
  timestamp: number
): LoadedResourceState<TrustedAppsListData> => ({
  type: 'LoadedResourceState',
  data: createTrustedAppsListData(pagination, timestamp),
});

export const createListFailedResourceState = (
  message: string,
  lastLoadedState?: LoadedResourceState<TrustedAppsListData>
): FailedResourceState<TrustedAppsListData> => ({
  type: 'FailedResourceState',
  error: createServerApiError(message),
  lastLoadedState,
});

export const createListLoadingResourceState = (
  previousState: StaleResourceState<TrustedAppsListData> = createUninitialisedResourceState()
): LoadingResourceState<TrustedAppsListData> => ({
  type: 'LoadingResourceState',
  previousState,
});

export const createListComplexLoadingResourceState = (
  pagination: Partial<Pagination>,
  timestamp: number
): LoadingResourceState<TrustedAppsListData> =>
  createListLoadingResourceState(
    createListFailedResourceState(
      'Internal Server Error',
      createListLoadedResourceState(pagination, timestamp)
    )
  );

export const createDefaultPagination = (): Pagination => ({
  pageIndex: MANAGEMENT_DEFAULT_PAGE,
  pageSize: MANAGEMENT_DEFAULT_PAGE_SIZE,
  totalItemCount: 200,
  pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
});

export const createLoadedListViewWithPagination = (
  freshDataTimestamp: number,
  pagination: Partial<Pagination> = createDefaultPagination()
): TrustedAppsListPageState['listView'] => ({
  listResourceState: createListLoadedResourceState(pagination, freshDataTimestamp),
  freshDataTimestamp,
});

export const createUserChangedUrlAction = (path: string, search: string = ''): RoutingAction => {
  return { type: 'userChangedUrl', payload: { pathname: path, search, hash: '' } };
};

export const createTrustedAppsListResourceStateChangedAction = (
  newState: AsyncResourceState<TrustedAppsListData>
): TrustedAppsListResourceStateChanged => ({
  type: 'trustedAppsListResourceStateChanged',
  payload: { newState },
});

export const createGlobalNoMiddlewareStore = () => {
  return createStore(
    combineReducers({
      [MANAGEMENT_STORE_GLOBAL_NAMESPACE]: combineReducers({
        [MANAGEMENT_STORE_TRUSTED_APPS_NAMESPACE]: trustedAppsPageReducer,
      }),
    })
  );
};
