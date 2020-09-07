/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TrustedApp } from '../../../../../common/endpoint/types';
import {
  FailedResourceState,
  LoadedResourceState,
  LoadingResourceState,
  PaginationInfo,
  TrustedAppsListData,
  TrustedAppsListPageState,
  UninitialisedResourceState,
} from '../state';

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
  error: {
    statusCode: 500,
    error: 'Internal Server Error',
    message,
  },
  lastLoadedState,
});

export const createListComplexLoadingResourceState = (
  paginationInfo: PaginationInfo,
  totalItemsCount: number
): LoadingResourceState<TrustedAppsListData> => ({
  type: 'LoadingResourceState',
  previousState: createListFailedResourceState(
    'Internal Server Error',
    createListLoadedResourceState(paginationInfo, totalItemsCount)
  ),
});

export const createDefaultPaginationInfo = () => ({ index: 0, size: 20 });

export const createDefaultListView = () => ({
  currentListResourceState: createUninitialisedResourceState(),
  currentPaginationInfo: createDefaultPaginationInfo(),
});

export const createListViewWithPagination = (
  paginationInfo: PaginationInfo = createDefaultPaginationInfo(),
  currentPaginationInfo: PaginationInfo = createDefaultPaginationInfo()
): TrustedAppsListPageState['listView'] => ({
  currentListResourceState: createListLoadedResourceState(paginationInfo, 200),
  currentPaginationInfo,
});
