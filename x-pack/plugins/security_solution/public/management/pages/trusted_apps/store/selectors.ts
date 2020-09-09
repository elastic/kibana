/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Immutable, TrustedApp } from '../../../../../common/endpoint/types';

import {
  AsyncResourceState,
  getCurrentResourceError,
  getLastLoadedResourceState,
  isLoadingResourceState,
  isOutdatedResourceState,
  LoadedResourceState,
  PaginationInfo,
  TrustedAppsListData,
  TrustedAppsListPageState,
} from '../state';

const pageInfosEqual = (pageInfo1: PaginationInfo, pageInfo2: PaginationInfo): boolean =>
  pageInfo1.index === pageInfo2.index && pageInfo1.size === pageInfo2.size;

export const needsRefreshOfListData = (state: Immutable<TrustedAppsListPageState>): boolean => {
  const currentPageInfo = state.listView.currentPaginationInfo;
  const currentPage = state.listView.currentListResourceState;

  return (
    state.active &&
    isOutdatedResourceState(currentPage, (data) =>
      pageInfosEqual(currentPageInfo, data.paginationInfo)
    )
  );
};

export const getCurrentListResourceState = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<AsyncResourceState<TrustedAppsListData>> | undefined => {
  return state.listView.currentListResourceState;
};

export const getLastLoadedListResourceState = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<LoadedResourceState<TrustedAppsListData>> | undefined => {
  return getLastLoadedResourceState(state.listView.currentListResourceState);
};

export const getListItems = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<TrustedApp[]> => {
  return getLastLoadedResourceState(state.listView.currentListResourceState)?.data.items || [];
};

export const getListCurrentPageIndex = (state: Immutable<TrustedAppsListPageState>): number => {
  return state.listView.currentPaginationInfo.index;
};

export const getListCurrentPageSize = (state: Immutable<TrustedAppsListPageState>): number => {
  return state.listView.currentPaginationInfo.size;
};

export const getListTotalItemsCount = (state: Immutable<TrustedAppsListPageState>): number => {
  return (
    getLastLoadedResourceState(state.listView.currentListResourceState)?.data.totalItemsCount || 0
  );
};

export const getListErrorMessage = (
  state: Immutable<TrustedAppsListPageState>
): string | undefined => {
  return getCurrentResourceError(state.listView.currentListResourceState)?.message;
};

export const isListLoading = (state: Immutable<TrustedAppsListPageState>): boolean => {
  return isLoadingResourceState(state.listView.currentListResourceState);
};
