/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { parse } from 'query-string';
import { PolicyListState, PolicyListUrlSearchParams } from '../../types';

const PAGE_SIZES = Object.freeze([10, 20, 50]);

export const selectPolicyItems = (state: PolicyListState) => state.policyItems;

export const selectPageIndex = (state: PolicyListState) => state.pageIndex;

export const selectPageSize = (state: PolicyListState) => state.pageSize;

export const selectTotal = (state: PolicyListState) => state.total;

export const selectIsLoading = (state: PolicyListState) => state.isLoading;

export const selectApiError = (state: PolicyListState) => state.apiError;

export const isOnPolicyListPage = (state: PolicyListState) => {
  return state.location?.pathname === '/policy';
};

export const routeLocation = (state: PolicyListState) => state.location;

/**
 * Returns the supported URL search params, populated with defaults if none where present in the URL
 */
export const urlSearchParams: (
  state: PolicyListState
) => PolicyListUrlSearchParams = createSelector(routeLocation, location => {
  const searchParams = {
    page_index: 0,
    page_size: 10,
  };
  if (!location) {
    return searchParams;
  }

  const query = parse(location.search);

  searchParams.page_index = Number(query.page_index ?? 0);
  searchParams.page_size = Number(query.page_size ?? 10);

  // If pageIndex is not a valid positive integer, set it to 0
  if (!Number.isFinite(searchParams.page_index) || searchParams.page_index < 0) {
    searchParams.page_index = 0;
  }

  // if pageSize is not one of the expected page sizes, reset it to 10
  if (!PAGE_SIZES.includes(searchParams.page_size)) {
    searchParams.page_size = 10;
  }

  return searchParams;
});
