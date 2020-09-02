/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Immutable, TrustedApp } from '../../../../../common/endpoint/types';

import { PaginationInfo, TrustedAppsListPageState } from '../state/trusted_apps_list_page_state';

import {
  getCurrentError,
  getLastPresentData,
  isInProgressBinding,
  isOutdatedBinding,
} from '../state/async_data_binding';

const pageInfosEqual = (pageInfo1: PaginationInfo, pageInfo2: PaginationInfo): boolean =>
  pageInfo1.index === pageInfo2.index && pageInfo1.size === pageInfo2.size;

export const needsRefreshOfListData = (state: Immutable<TrustedAppsListPageState>): boolean => {
  const currentPageInfo = state.listView.currentPaginationInfo;
  const currentPage = state.listView.currentListData;

  return (
    state.active &&
    isOutdatedBinding(currentPage, (data) => pageInfosEqual(currentPageInfo, data.paginationInfo))
  );
};

export const getListItems = (
  state: Immutable<TrustedAppsListPageState>
): Immutable<TrustedApp[]> => {
  return getLastPresentData(state.listView.currentListData)?.items || [];
};

export const getListCurrentPageIndex = (state: Immutable<TrustedAppsListPageState>): number => {
  return state.listView.currentPaginationInfo.index;
};

export const getListCurrentPageSize = (state: Immutable<TrustedAppsListPageState>): number => {
  return state.listView.currentPaginationInfo.size;
};

export const getListTotalItemsCount = (state: Immutable<TrustedAppsListPageState>): number => {
  return getLastPresentData(state.listView.currentListData)?.totalItemsCount || 0;
};

export const getListErrorMessage = (
  state: Immutable<TrustedAppsListPageState>
): string | undefined => {
  return getCurrentError(state.listView.currentListData)?.message;
};

export const isListLoading = (state: Immutable<TrustedAppsListPageState>): boolean => {
  return isInProgressBinding(state.listView.currentListData);
};
