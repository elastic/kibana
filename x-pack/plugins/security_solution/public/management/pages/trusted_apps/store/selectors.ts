/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Immutable } from '../../../../../common/endpoint/types';
import { TrustedAppsPageState } from '../state/trusted_apps_page_state';
import { pageInfosEqual } from '../state/items_page';
import { isStaleBinding } from '../state/async_data_binding';

export const needsRefreshOfListData = (state: Immutable<TrustedAppsPageState>) => {
  const currentPageInfo = state.list.currentPageInfo;
  const currentPage = state.list.currentPage;

  return (
    state.active &&
    isStaleBinding(currentPage, (data) => pageInfosEqual(currentPageInfo, data.pageInfo))
  );
};

export const getListViewState = (state: Immutable<TrustedAppsPageState>) => {
  return state.list;
};
