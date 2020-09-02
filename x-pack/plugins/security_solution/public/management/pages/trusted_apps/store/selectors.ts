/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Immutable } from '../../../../../common/endpoint/types';

import { TrustedAppsPageState } from '../state/trusted_apps_page_state';
import { pageInfosEqual } from '../state/items_page';
import {
  getCurrentError,
  getLastPresentData,
  isInProgressBinding,
  isOutdatedBinding,
} from '../state/async_data_binding';

export const needsRefreshOfListData = (state: Immutable<TrustedAppsPageState>) => {
  const currentPageInfo = state.list.currentPageInfo;
  const currentPage = state.list.currentPage;

  return (
    state.active &&
    isOutdatedBinding(currentPage, (data) => pageInfosEqual(currentPageInfo, data.pageInfo))
  );
};

export const getListItems = (state: Immutable<TrustedAppsPageState>) => {
  return getLastPresentData(state.list.currentPage)?.items || [];
};

export const getListCurrentPageIndex = (state: Immutable<TrustedAppsPageState>) => {
  return state.list.currentPageInfo.index;
};

export const getListCurrentPageSize = (state: Immutable<TrustedAppsPageState>) => {
  return state.list.currentPageInfo.size;
};

export const getListTotalItemsCount = (state: Immutable<TrustedAppsPageState>) => {
  return getLastPresentData(state.list.currentPage)?.totalItemsCount || 0;
};

export const getListErrorMessage = (state: Immutable<TrustedAppsPageState>) => {
  return getCurrentError(state.list.currentPage)?.message;
};

export const isListLoading = (state: Immutable<TrustedAppsPageState>) => {
  return isInProgressBinding(state.list.currentPage);
};

export const getListViewState = (state: Immutable<TrustedAppsPageState>) => {
  return state.list;
};
