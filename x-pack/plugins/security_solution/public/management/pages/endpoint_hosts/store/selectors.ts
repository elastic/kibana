/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import { createSelector } from 'reselect';
import { matchPath } from 'react-router-dom';
import { decode } from '@kbn/rison';
import type { Query } from '@kbn/es-query';
import type { EndpointSortableField, Immutable } from '../../../../../common/endpoint/types';
import type { EndpointIndexUIQueryParams, EndpointState } from '../types';
import { extractListPaginationParams } from '../../../common/routing';
import {
  MANAGEMENT_DEFAULT_PAGE,
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
} from '../../../common/constants';
import {
  isFailedResourceState,
  isLoadedResourceState,
  isLoadingResourceState,
  isUninitialisedResourceState,
} from '../../../state';

import type { ServerApiError } from '../../../../common/types';

export const listData = (state: Immutable<EndpointState>) => state.hosts;

export const pageIndex = (state: Immutable<EndpointState>): number => state.pageIndex;

export const pageSize = (state: Immutable<EndpointState>): number => state.pageSize;

export const sortField = (state: Immutable<EndpointState>): EndpointSortableField =>
  state.sortField;

export const sortDirection = (state: Immutable<EndpointState>): 'asc' | 'desc' =>
  state.sortDirection;

export const totalHits = (state: Immutable<EndpointState>): number => state.total;

export const listLoading = (state: Immutable<EndpointState>): boolean => state.loading;

export const listError = (state: Immutable<EndpointState>) => state.error;

export const policyItems = (state: Immutable<EndpointState>) => state.policyItems;

export const policyItemsLoading = (state: Immutable<EndpointState>) => state.policyItemsLoading;

export const isInitialized = (state: Immutable<EndpointState>) => state.isInitialized;

export const selectedPolicyId = (state: Immutable<EndpointState>) => state.selectedPolicyId;
export const endpointPackageInfo = (state: Immutable<EndpointState>) => state.endpointPackageInfo;
export const getIsEndpointPackageInfoUninitialized: (state: Immutable<EndpointState>) => boolean =
  createSelector(endpointPackageInfo, (packageInfo) => isUninitialisedResourceState(packageInfo));

export const isAutoRefreshEnabled = (state: Immutable<EndpointState>) => state.isAutoRefreshEnabled;

export const autoRefreshInterval = (state: Immutable<EndpointState>) => state.autoRefreshInterval;

export const endpointPackageVersion = createSelector(endpointPackageInfo, (info) =>
  isLoadedResourceState(info) ? info.data.version : undefined
);

/**
 * Returns the index patterns for the SearchBar to use for auto-suggest
 */
export const patterns = (state: Immutable<EndpointState>) => state.patterns;

export const patternsError = (state: Immutable<EndpointState>) => state.patternsError;

export const isOnEndpointPage = (state: Immutable<EndpointState>) => {
  return (
    matchPath(state.location?.pathname ?? '', {
      path: MANAGEMENT_ROUTING_ENDPOINTS_PATH,
      exact: true,
    }) !== null
  );
};

/** Sanitized list of URL query params supported by the Details page */
export const uiQueryParams: (
  state: Immutable<EndpointState>
) => Immutable<EndpointIndexUIQueryParams> = createSelector(
  (state: Immutable<EndpointState>) => state.location,
  (location: Immutable<EndpointState>['location']) => {
    const data: EndpointIndexUIQueryParams = {
      page_index: String(MANAGEMENT_DEFAULT_PAGE),
      page_size: String(MANAGEMENT_DEFAULT_PAGE_SIZE),
    };

    if (location) {
      // Removes the `?` from the beginning of query string if it exists
      const query = querystring.parse(location.search.slice(1));
      const paginationParams = extractListPaginationParams(query);

      const keys: Array<keyof EndpointIndexUIQueryParams> = [
        'selected_endpoint',
        'show',
        'admin_query',
        'sort_field',
        'sort_direction',
      ];

      const allowedShowValues: Array<EndpointIndexUIQueryParams['show']> = [
        'policy_response',
        'details',
        'isolate',
        'unisolate',
        'activity_log',
      ];

      for (const key of keys) {
        const value: string | undefined =
          typeof query[key] === 'string'
            ? (query[key] as string)
            : Array.isArray(query[key])
            ? (query[key] as string[])[(query[key] as string[]).length - 1]
            : undefined;

        if (value !== undefined) {
          if (key === 'show') {
            if (allowedShowValues.includes(value as EndpointIndexUIQueryParams['show'])) {
              data[key] = value as EndpointIndexUIQueryParams['show'];
            }
          } else if (key === 'sort_direction') {
            if (['asc', 'desc'].includes(value)) {
              data[key] = value as EndpointIndexUIQueryParams['sort_direction'];
            }
          } else if (key === 'sort_field') {
            data[key] = value as EndpointSortableField;
          } else {
            data[key] = value;
          }
        }
      }

      data.page_size = String(paginationParams.page_size);
      data.page_index = String(paginationParams.page_index);
    }

    return data;
  }
);

export const hasSelectedEndpoint: (state: Immutable<EndpointState>) => boolean = createSelector(
  uiQueryParams,
  ({ selected_endpoint: selectedEndpoint }) => {
    return selectedEndpoint !== undefined;
  }
);

/** What policy details panel view to show */
export const showView: (state: EndpointState) => EndpointIndexUIQueryParams['show'] =
  createSelector(uiQueryParams, (searchParams) => {
    return searchParams.show ?? 'details';
  });

/**
 * returns the list of known non-existing polices that may have been in the Endpoint API response.
 * @param state
 */
export const nonExistingPolicies: (
  state: Immutable<EndpointState>
) => Immutable<EndpointState['nonExistingPolicies']> = (state) => state.nonExistingPolicies;

/**
 * returns the list of known existing agent policies
 */
export const agentPolicies: (
  state: Immutable<EndpointState>
) => Immutable<EndpointState['agentPolicies']> = (state) => state.agentPolicies;

/**
 * Return boolean that indicates whether endpoints exist
 * @param state
 */
export const endpointsExist: (state: Immutable<EndpointState>) => boolean = (state) =>
  state.endpointsExist;

/**
 * Returns query text from query bar
 */
export const searchBarQuery: (state: Immutable<EndpointState>) => Query = createSelector(
  uiQueryParams,
  ({ admin_query: adminQuery }) => {
    const decodedQuery: Query = { query: '', language: 'kuery' };
    if (adminQuery) {
      const urlDecodedQuery = decode(adminQuery) as unknown as Query;
      if (urlDecodedQuery && typeof urlDecodedQuery.query === 'string') {
        decodedQuery.query = urlDecodedQuery.query;
      }
      if (
        urlDecodedQuery &&
        typeof urlDecodedQuery.language === 'string' &&
        (urlDecodedQuery.language === 'kuery' || urlDecodedQuery.language === 'lucene')
      ) {
        decodedQuery.language = urlDecodedQuery.language;
      }
    }
    return decodedQuery;
  }
);

export const getCurrentIsolationRequestState = (
  state: Immutable<EndpointState>
): EndpointState['isolationRequestState'] => {
  return state.isolationRequestState as EndpointState['isolationRequestState'];
};

export const getIsIsolationRequestPending: (state: Immutable<EndpointState>) => boolean =
  createSelector(getCurrentIsolationRequestState, (isolateHost) =>
    isLoadingResourceState(isolateHost)
  );

export const getWasIsolationRequestSuccessful: (state: Immutable<EndpointState>) => boolean =
  createSelector(getCurrentIsolationRequestState, (isolateHost) =>
    isLoadedResourceState(isolateHost)
  );

export const getIsolationRequestError: (
  state: Immutable<EndpointState>
) => ServerApiError | undefined = createSelector(getCurrentIsolationRequestState, (isolateHost) => {
  if (isFailedResourceState(isolateHost)) {
    return isolateHost.error;
  }
});

export const getMetadataTransformStats = (state: Immutable<EndpointState>) =>
  state.metadataTransformStats;

export const metadataTransformStats = (state: Immutable<EndpointState>) =>
  isLoadedResourceState(state.metadataTransformStats) ? state.metadataTransformStats.data : [];

export const isMetadataTransformStatsLoading = (state: Immutable<EndpointState>) =>
  isLoadingResourceState(state.metadataTransformStats);
