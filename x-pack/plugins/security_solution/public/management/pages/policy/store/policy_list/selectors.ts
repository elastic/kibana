/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { parse } from 'query-string';
import { matchPath } from 'react-router-dom';
import { PolicyListState, PolicyListUrlSearchParams } from '../../types';
import { Immutable } from '../../../../../../common/endpoint/types';
import { MANAGEMENT_ROUTING_POLICIES_PATH } from '../../../../common/constants';

const PAGE_SIZES = Object.freeze([10, 20, 50]);

export const selectPolicyItems = (state: Immutable<PolicyListState>) => state.policyItems;

export const selectPageIndex = (state: Immutable<PolicyListState>) => state.pageIndex;

export const selectPageSize = (state: Immutable<PolicyListState>) => state.pageSize;

export const selectTotal = (state: Immutable<PolicyListState>) => state.total;

export const selectIsLoading = (state: Immutable<PolicyListState>) => state.isLoading;

export const selectApiError = (state: Immutable<PolicyListState>) => state.apiError;

export const selectIsDeleting = (state: Immutable<PolicyListState>) => state.isDeleting;

export const selectDeleteStatus = (state: Immutable<PolicyListState>) => state.deleteStatus;

export const selectAgentStatusSummary = (state: Immutable<PolicyListState>) =>
  state.agentStatusSummary;

export const isOnPolicyListPage = (state: Immutable<PolicyListState>) => {
  return (
    matchPath(state.location?.pathname ?? '', {
      path: MANAGEMENT_ROUTING_POLICIES_PATH,
      exact: true,
    }) !== null
  );
};

const routeLocation = (state: Immutable<PolicyListState>) => state.location;

/**
 * Returns the supported URL search params, populated with defaults if none where present in the URL
 */
export const urlSearchParams: (
  state: Immutable<PolicyListState>
) => PolicyListUrlSearchParams = createSelector(routeLocation, (location) => {
  const searchParams = {
    page_index: 0,
    page_size: 10,
  };
  if (!location) {
    return searchParams;
  }

  const query = parse(location.search);

  // Search params can appear multiple times in the URL, in which case the value for them,
  // once parsed, would be an array. In these case, we take the last value defined
  searchParams.page_index = Number(
    (Array.isArray(query.page_index)
      ? query.page_index[query.page_index.length - 1]
      : query.page_index) ?? 0
  );
  searchParams.page_size = Number(
    (Array.isArray(query.page_size)
      ? query.page_size[query.page_size.length - 1]
      : query.page_size) ?? 10
  );

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

/**
 * Returns package information for Endpoint
 * @param state
 */
export const endpointPackageInfo = (state: Immutable<PolicyListState>) => state.endpointPackageInfo;

/**
 * Returns the version number for the endpoint package.
 */
export const endpointPackageVersion = createSelector(
  endpointPackageInfo,
  (info) => info?.version ?? undefined
);
