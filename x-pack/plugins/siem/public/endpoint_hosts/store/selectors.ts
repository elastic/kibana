/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import { createSelector } from 'reselect';
import {
  Immutable,
  HostPolicyResponseAppliedAction,
  HostPolicyResponseConfiguration,
  HostPolicyResponseActionStatus,
} from '../../../common/endpoint/types';
import { HostState, HostIndexUIQueryParams } from '../types';

const PAGE_SIZES = Object.freeze([10, 20, 50]);

export const listData = (state: Immutable<HostState>) => state.hosts;

export const pageIndex = (state: Immutable<HostState>): number => state.pageIndex;

export const pageSize = (state: Immutable<HostState>): number => state.pageSize;

export const totalHits = (state: Immutable<HostState>): number => state.total;

export const listLoading = (state: Immutable<HostState>): boolean => state.loading;

export const listError = (state: Immutable<HostState>) => state.error;

export const detailsData = (state: Immutable<HostState>) => state.details;

export const detailsLoading = (state: Immutable<HostState>): boolean => state.detailsLoading;

export const detailsError = (state: Immutable<HostState>) => state.detailsError;

/**
 * Returns the full policy response from the endpoint after a user modifies a policy.
 */
const detailsPolicyAppliedResponse = (state: Immutable<HostState>) =>
  state.policyResponse && state.policyResponse.endpoint.policy.applied;

/**
 * Returns the response configurations from the endpoint after a user modifies a policy.
 */
export const policyResponseConfigurations: (
  state: Immutable<HostState>
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
  state: Immutable<HostState>
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
  state: Immutable<HostState>
) => undefined | Immutable<HostPolicyResponseAppliedAction[]> = createSelector(
  detailsPolicyAppliedResponse,
  (applied) => {
    return applied?.actions;
  }
);

export const policyResponseLoading = (state: Immutable<HostState>): boolean =>
  state.policyResponseLoading;

export const policyResponseError = (state: Immutable<HostState>) => state.policyResponseError;

export const isOnHostPage = (state: Immutable<HostState>) =>
  state.location ? state.location.pathname === '/endpoint-hosts' : false;

export const uiQueryParams: (
  state: Immutable<HostState>
) => Immutable<HostIndexUIQueryParams> = createSelector(
  (state: Immutable<HostState>) => state.location,
  (location: Immutable<HostState>['location']) => {
    const data: HostIndexUIQueryParams = { page_index: '0', page_size: '10' };
    if (location) {
      // Removes the `?` from the beginning of query string if it exists
      const query = querystring.parse(location.search.slice(1));

      const keys: Array<keyof HostIndexUIQueryParams> = [
        'selected_host',
        'page_size',
        'page_index',
        'show',
      ];

      for (const key of keys) {
        const value = query[key];
        if (typeof value === 'string') {
          data[key] = value;
        } else if (Array.isArray(value)) {
          data[key] = value[value.length - 1];
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

export const hasSelectedHost: (state: Immutable<HostState>) => boolean = createSelector(
  uiQueryParams,
  ({ selected_host: selectedHost }) => {
    return selectedHost !== undefined;
  }
);

/** What policy details panel view to show */
export const showView: (state: HostState) => 'policy_response' | 'details' = createSelector(
  uiQueryParams,
  (searchParams) => {
    return searchParams.show === 'policy_response' ? 'policy_response' : 'details';
  }
);

/**
 * Returns the Policy Response overall status
 */
export const policyResponseStatus: (state: Immutable<HostState>) => string = createSelector(
  (state) => state.policyResponse,
  (policyResponse) => {
    return (policyResponse && policyResponse?.endpoint?.policy?.applied?.status) || '';
  }
);
