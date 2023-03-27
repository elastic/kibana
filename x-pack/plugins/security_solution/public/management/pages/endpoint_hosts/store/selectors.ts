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
import type { Immutable, HostMetadata } from '../../../../../common/endpoint/types';
import { HostStatus } from '../../../../../common/endpoint/types';
import type { EndpointState, EndpointIndexUIQueryParams } from '../types';
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
import { isEndpointHostIsolated } from '../../../../common/utils/validators';
import type { EndpointHostIsolationStatusProps } from '../../../../common/components/endpoint/host_isolation';
import { EndpointDetailsTabsTypes } from '../view/details/components/endpoint_details_tabs';

export const listData = (state: Immutable<EndpointState>) => state.hosts;

export const pageIndex = (state: Immutable<EndpointState>): number => state.pageIndex;

export const pageSize = (state: Immutable<EndpointState>): number => state.pageSize;

export const totalHits = (state: Immutable<EndpointState>): number => state.total;

export const listLoading = (state: Immutable<EndpointState>): boolean => state.loading;

export const listError = (state: Immutable<EndpointState>) => state.error;

export const detailsData = (state: Immutable<EndpointState>) =>
  state.endpointDetails.hostDetails.details;

export const detailsLoading = (state: Immutable<EndpointState>): boolean =>
  state.endpointDetails.hostDetails.detailsLoading;

export const detailsError = (
  state: Immutable<EndpointState>
): EndpointState['endpointDetails']['hostDetails']['detailsError'] =>
  state.endpointDetails.hostDetails.detailsError;

export const policyItems = (state: Immutable<EndpointState>) => state.policyItems;

export const policyItemsLoading = (state: Immutable<EndpointState>) => state.policyItemsLoading;

export const selectedPolicyId = (state: Immutable<EndpointState>) => state.selectedPolicyId;

export const endpointPackageInfo = (state: Immutable<EndpointState>) => state.endpointPackageInfo;
export const getIsEndpointPackageInfoUninitialized: (state: Immutable<EndpointState>) => boolean =
  createSelector(endpointPackageInfo, (packageInfo) => isUninitialisedResourceState(packageInfo));

export const isAutoRefreshEnabled = (state: Immutable<EndpointState>) => state.isAutoRefreshEnabled;

export const autoRefreshInterval = (state: Immutable<EndpointState>) => state.autoRefreshInterval;

export const policyVersionInfo = (state: Immutable<EndpointState>) => state.policyVersionInfo;

export const endpointPackageVersion = createSelector(endpointPackageInfo, (info) =>
  isLoadedResourceState(info) ? info.data.version : undefined
);

/**
 * Returns the index patterns for the SearchBar to use for autosuggest
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
 * Returns the Host Status which is connected the fleet agent
 */
export const hostStatusInfo: (state: Immutable<EndpointState>) => HostStatus = createSelector(
  (state: Immutable<EndpointState>) => state.hostStatus,
  (hostStatus) => {
    return hostStatus ? hostStatus : HostStatus.UNHEALTHY;
  }
);

/**
 * Returns the Policy Response overall status
 */
export const policyResponseStatus: (state: Immutable<EndpointState>) => string = createSelector(
  (state: Immutable<EndpointState>) => state.policyResponse,
  (policyResponse) => {
    return (policyResponse && policyResponse?.Endpoint?.policy?.applied?.status) || '';
  }
);

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

export const getIsOnEndpointDetailsActivityLog: (state: Immutable<EndpointState>) => boolean =
  createSelector(uiQueryParams, (searchParams) => {
    return searchParams.show === EndpointDetailsTabsTypes.activityLog;
  });

export const getIsEndpointHostIsolated = createSelector(detailsData, (details) => {
  return (details && isEndpointHostIsolated(details)) || false;
});

export const getEndpointPendingActionsState = (
  state: Immutable<EndpointState>
): Immutable<EndpointState['endpointPendingActions']> => {
  return state.endpointPendingActions;
};

/**
 * Returns a function (callback) that can be used to retrieve the props for the `EndpointHostIsolationStatus`
 * component for a given Endpoint
 */
export const getEndpointHostIsolationStatusPropsCallback: (
  state: Immutable<EndpointState>
) => (endpoint: HostMetadata) => EndpointHostIsolationStatusProps = createSelector(
  getEndpointPendingActionsState,
  (pendingActionsState) => {
    return (endpoint: HostMetadata) => {
      let pendingIsolate = 0;
      let pendingUnIsolate = 0;
      let pendingKillProcess = 0;
      let pendingSuspendProcess = 0;
      let pendingRunningProcesses = 0;

      if (isLoadedResourceState(pendingActionsState)) {
        const endpointPendingActions = pendingActionsState.data.get(endpoint.elastic.agent.id);

        if (endpointPendingActions) {
          pendingIsolate = endpointPendingActions?.isolate ?? 0;
          pendingUnIsolate = endpointPendingActions?.unisolate ?? 0;
          pendingKillProcess = endpointPendingActions?.['kill-process'] ?? 0;
          pendingSuspendProcess = endpointPendingActions?.['suspend-process'] ?? 0;
          pendingRunningProcesses = endpointPendingActions?.['running-processes'] ?? 0;
        }
      }

      return {
        isIsolated: isEndpointHostIsolated(endpoint),
        pendingActions: {
          pendingIsolate,
          pendingUnIsolate,
          pendingKillProcess,
          pendingSuspendProcess,
          pendingRunningProcesses,
        },
      };
    };
  }
);

export const getMetadataTransformStats = (state: Immutable<EndpointState>) =>
  state.metadataTransformStats;

export const metadataTransformStats = (state: Immutable<EndpointState>) =>
  isLoadedResourceState(state.metadataTransformStats) ? state.metadataTransformStats.data : [];

export const isMetadataTransformStatsLoading = (state: Immutable<EndpointState>) =>
  isLoadingResourceState(state.metadataTransformStats);
