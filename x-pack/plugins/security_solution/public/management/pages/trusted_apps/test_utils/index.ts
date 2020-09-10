/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ServerApiError } from '../../../../common/types';
import { TrustedApp } from '../../../../../common/endpoint/types';
import { RoutingAction } from '../../../../common/store/routing';

import {
  AsyncResourceState,
  FailedResourceState,
  LoadedResourceState,
  LoadingResourceState,
  PaginationInfo,
  StaleResourceState,
  TrustedAppsListData,
  TrustedAppsListPageState,
  UninitialisedResourceState,
} from '../state';

import { TrustedAppsListResourceStateChanged } from '../store/action';

const OS_LIST: Array<TrustedApp['os']> = ['windows', 'macos', 'linux'];

export const createSampleTrustedApps = (paginationInfo: PaginationInfo): TrustedApp[] => {
  return [...new Array(paginationInfo.size).keys()].map((i) => ({
    id: String(paginationInfo.index + i),
    name: `trusted app ${paginationInfo.index + i}`,
    description: `Trusted App ${paginationInfo.index + i}`,
    created_at: '1 minute ago',
    created_by: 'someone',
    os: OS_LIST[i % 3],
    entries: [],
  }));
};

export const createTrustedAppsListData = (
  paginationInfo: PaginationInfo,
  totalItemsCount: number
) => ({
  items: createSampleTrustedApps(paginationInfo),
  totalItemsCount,
  paginationInfo,
});

export const createServerApiError = (message: string) => ({
  statusCode: 500,
  error: 'Internal Server Error',
  message,
});

export const createUninitialisedResourceState = (): UninitialisedResourceState => ({
  type: 'UninitialisedResourceState',
});

export const createListLoadedResourceState = (
  paginationInfo: PaginationInfo,
  totalItemsCount: number
): LoadedResourceState<TrustedAppsListData> => ({
  type: 'LoadedResourceState',
  data: createTrustedAppsListData(paginationInfo, totalItemsCount),
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
  paginationInfo: PaginationInfo,
  totalItemsCount: number
): LoadingResourceState<TrustedAppsListData> =>
  createListLoadingResourceState(
    createListFailedResourceState(
      'Internal Server Error',
      createListLoadedResourceState(paginationInfo, totalItemsCount)
    )
  );

export const createDefaultPaginationInfo = () => ({ index: 0, size: 20 });

export const createDefaultListView = () => ({
  currentListResourceState: createUninitialisedResourceState(),
  currentPaginationInfo: createDefaultPaginationInfo(),
});

export const createLoadingListViewWithPagination = (
  currentPaginationInfo: PaginationInfo,
  previousState: StaleResourceState<TrustedAppsListData> = createUninitialisedResourceState()
): TrustedAppsListPageState['listView'] => ({
  currentListResourceState: { type: 'LoadingResourceState', previousState },
  currentPaginationInfo,
});

export const createLoadedListViewWithPagination = (
  paginationInfo: PaginationInfo = createDefaultPaginationInfo(),
  currentPaginationInfo: PaginationInfo = createDefaultPaginationInfo(),
  totalItemsCount: number = 200
): TrustedAppsListPageState['listView'] => ({
  currentListResourceState: createListLoadedResourceState(paginationInfo, totalItemsCount),
  currentPaginationInfo,
});

export const createFailedListViewWithPagination = (
  currentPaginationInfo: PaginationInfo,
  error: ServerApiError,
  lastLoadedState?: LoadedResourceState<TrustedAppsListData>
): TrustedAppsListPageState['listView'] => ({
  currentListResourceState: { type: 'FailedResourceState', error, lastLoadedState },
  currentPaginationInfo,
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
