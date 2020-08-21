/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import { createSelector } from 'reselect';
import { matchPath } from 'react-router-dom';
import {
  Immutable,
  HostPolicyResponseAppliedAction,
  HostPolicyResponseConfiguration,
  HostPolicyResponseActionStatus,
} from '../../../../../common/endpoint/types';
import { EndpointState, EndpointIndexUIQueryParams } from '../types';
import { MANAGEMENT_ROUTING_ENDPOINTS_PATH } from '../../../common/constants';

const PAGE_SIZES = Object.freeze([10, 20, 50]);

export const listData = (state: Immutable<EndpointState>) => state.hosts;

export const pageIndex = (state: Immutable<EndpointState>): number => state.pageIndex;

export const pageSize = (state: Immutable<EndpointState>): number => state.pageSize;

export const totalHits = (state: Immutable<EndpointState>): number => state.total;

export const listLoading = (state: Immutable<EndpointState>): boolean => state.loading;

export const listError = (state: Immutable<EndpointState>) => state.error;

export const detailsData = (state: Immutable<EndpointState>) => state.details;

export const detailsLoading = (state: Immutable<EndpointState>): boolean => state.detailsLoading;

export const detailsError = (state: Immutable<EndpointState>) => state.detailsError;

export const policyItems = (state: Immutable<EndpointState>) => state.policyItems;

export const policyItemsLoading = (state: Immutable<EndpointState>) => state.policyItemsLoading;

export const selectedPolicyId = (state: Immutable<EndpointState>) => state.selectedPolicyId;

export const endpointPackageInfo = (state: Immutable<EndpointState>) => state.endpointPackageInfo;

export const isAutoRefreshEnabled = (state: Immutable<EndpointState>) => state.isAutoRefreshEnabled;

export const autoRefreshInterval = (state: Immutable<EndpointState>) => state.autoRefreshInterval;

export const endpointPackageVersion = createSelector(
  endpointPackageInfo,
  (info) => info?.version ?? undefined
);

/**
 * Returns the full policy response from the endpoint after a user modifies a policy.
 */
const detailsPolicyAppliedResponse = (state: Immutable<EndpointState>) =>
  state.policyResponse && state.policyResponse.Endpoint.policy.applied;

/**
 * Returns the response configurations from the endpoint after a user modifies a policy.
 */
export const policyResponseConfigurations: (
  state: Immutable<EndpointState>
) => undefined | Immutable<HostPolicyResponseConfiguration> = createSelector(
  detailsPolicyAppliedResponse,
  (applied) => {
    return applied?.response?.configurations;
  }
);

/**
 * Returns a map of the number of failed and warning policy response actions per configuration.
 */
export const policyResponseFailedOrWarningActionCount: (
  state: Immutable<EndpointState>
) => Map<string, number> = createSelector(detailsPolicyAppliedResponse, (applied) => {
  const failureOrWarningByConfigType = new Map<string, number>();
  if (applied?.response?.configurations !== undefined && applied?.actions !== undefined) {
    Object.entries(applied.response.configurations).map(([key, val]) => {
      let count = 0;
      for (const action of val.concerned_actions) {
        const actionStatus = applied.actions.find((policyActions) => policyActions.name === action)
          ?.status;
        if (
          actionStatus === HostPolicyResponseActionStatus.failure ||
          actionStatus === HostPolicyResponseActionStatus.warning
        ) {
          count += 1;
        }
      }
      return failureOrWarningByConfigType.set(key, count);
    });
  }
  return failureOrWarningByConfigType;
});

/**
 * Returns the actions taken by the endpoint for each response configuration after a user modifies a policy.
 */
export const policyResponseActions: (
  state: Immutable<EndpointState>
) => undefined | Immutable<HostPolicyResponseAppliedAction[]> = createSelector(
  detailsPolicyAppliedResponse,
  (applied) => {
    return applied?.actions;
  }
);

export const policyResponseLoading = (state: Immutable<EndpointState>): boolean =>
  state.policyResponseLoading;

export const policyResponseError = (state: Immutable<EndpointState>) => state.policyResponseError;

export const isOnEndpointPage = (state: Immutable<EndpointState>) => {
  return (
    matchPath(state.location?.pathname ?? '', {
      path: MANAGEMENT_ROUTING_ENDPOINTS_PATH,
      exact: true,
    }) !== null
  );
};

export const uiQueryParams: (
  state: Immutable<EndpointState>
) => Immutable<EndpointIndexUIQueryParams> = createSelector(
  (state: Immutable<EndpointState>) => state.location,
  (location: Immutable<EndpointState>['location']) => {
    const data: EndpointIndexUIQueryParams = { page_index: '0', page_size: '10' };
    if (location) {
      // Removes the `?` from the beginning of query string if it exists
      const query = querystring.parse(location.search.slice(1));

      const keys: Array<keyof EndpointIndexUIQueryParams> = [
        'selected_endpoint',
        'page_size',
        'page_index',
        'show',
      ];

      for (const key of keys) {
        const value: string | undefined =
          typeof query[key] === 'string'
            ? (query[key] as string)
            : Array.isArray(query[key])
            ? (query[key][query[key].length - 1] as string)
            : undefined;

        if (value !== undefined) {
          if (key === 'show') {
            if (value === 'policy_response' || value === 'details') {
              data[key] = value;
            }
          } else {
            data[key] = value;
          }
        }
      }

      // Check if page size is an expected size, otherwise default to 10
      if (!PAGE_SIZES.includes(Number(data.page_size))) {
        data.page_size = '10';
      }

      // Check if page index is a valid positive integer, otherwise default to 0
      const pageIndexAsNumber = Number(data.page_index);
      if (!Number.isFinite(pageIndexAsNumber) || pageIndexAsNumber < 0) {
        data.page_index = '0';
      }
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
export const showView: (state: EndpointState) => 'policy_response' | 'details' = createSelector(
  uiQueryParams,
  (searchParams) => {
    return searchParams.show === 'policy_response' ? 'policy_response' : 'details';
  }
);

/**
 * Returns the Policy Response overall status
 */
export const policyResponseStatus: (state: Immutable<EndpointState>) => string = createSelector(
  (state) => state.policyResponse,
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
 * Return boolean that indicates whether endpoints exist
 * @param state
 */
export const endpointsExist: (state: Immutable<EndpointState>) => boolean = (state) =>
  state.endpointsExist;
