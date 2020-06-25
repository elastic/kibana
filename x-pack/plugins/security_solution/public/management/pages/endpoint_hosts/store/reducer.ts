/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isOnHostPage, hasSelectedHost } from './selectors';
import { HostState } from '../types';
import { AppAction } from '../../../../common/store/actions';
import { ImmutableReducer } from '../../../../common/store';
import { Immutable } from '../../../../../common/endpoint/types';

export const initialHostListState: Immutable<HostState> = {
  hosts: [],
  pageSize: 10,
  pageIndex: 0,
  total: 0,
  loading: false,
  error: undefined,
  details: undefined,
  detailsLoading: false,
  detailsError: undefined,
  policyResponse: undefined,
  policyResponseLoading: false,
  policyResponseError: undefined,
  location: undefined,
  policyItems: [],
  selectedPolicyId: undefined,
  policyItemsLoading: false,
  endpointPackageInfo: undefined,
};

/* eslint-disable-next-line complexity */
export const hostListReducer: ImmutableReducer<HostState, AppAction> = (
  state = initialHostListState,
  action
) => {
  if (action.type === 'serverReturnedHostList') {
    const {
      hosts,
      total,
      request_page_size: pageSize,
      request_page_index: pageIndex,
    } = action.payload;
    return {
      ...state,
      hosts,
      total,
      pageSize,
      pageIndex,
      loading: false,
      error: undefined,
    };
  } else if (action.type === 'serverFailedToReturnHostList') {
    return {
      ...state,
      error: action.payload,
      loading: false,
    };
  } else if (action.type === 'serverReturnedHostDetails') {
    return {
      ...state,
      details: action.payload.metadata,
      detailsLoading: false,
      detailsError: undefined,
    };
  } else if (action.type === 'serverFailedToReturnHostDetails') {
    return {
      ...state,
      detailsError: action.payload,
      detailsLoading: false,
    };
  } else if (action.type === 'serverReturnedPoliciesForOnboarding') {
    return {
      ...state,
      policyItems: action.payload.policyItems,
      policyItemsLoading: false,
    };
  } else if (action.type === 'serverFailedToReturnPoliciesForOnboarding') {
    return {
      ...state,
      error: action.payload,
      policyItemsLoading: false,
    };
  } else if (action.type === 'serverReturnedHostPolicyResponse') {
    return {
      ...state,
      policyResponse: action.payload.policy_response,
      policyResponseLoading: false,
      policyResponseError: undefined,
    };
  } else if (action.type === 'serverFailedToReturnHostPolicyResponse') {
    return {
      ...state,
      policyResponseError: action.payload,
      policyResponseLoading: false,
    };
  } else if (action.type === 'userSelectedEndpointPolicy') {
    return {
      ...state,
      selectedPolicyId: action.payload.selectedPolicyId,
      policyResponseLoading: false,
    };
  } else if (action.type === 'serverCancelledHostListLoading') {
    return {
      ...state,
      loading: false,
    };
  } else if (action.type === 'serverCancelledPolicyItemsLoading') {
    return {
      ...state,
      policyItemsLoading: false,
    };
  } else if (action.type === 'serverReturnedEndpointPackageInfo') {
    return {
      ...state,
      endpointPackageInfo: action.payload,
    };
  } else if (action.type === 'userChangedUrl') {
    const newState: Immutable<HostState> = {
      ...state,
      location: action.payload,
    };
    const isCurrentlyOnListPage = isOnHostPage(newState) && !hasSelectedHost(newState);
    const wasPreviouslyOnListPage = isOnHostPage(state) && !hasSelectedHost(state);
    const isCurrentlyOnDetailsPage = isOnHostPage(newState) && hasSelectedHost(newState);
    const wasPreviouslyOnDetailsPage = isOnHostPage(state) && hasSelectedHost(state);

    // if on the host list page for the first time, return new location and load list
    if (isCurrentlyOnListPage) {
      if (!wasPreviouslyOnListPage) {
        return {
          ...state,
          location: action.payload,
          loading: true,
          policyItemsLoading: true,
          error: undefined,
          detailsError: undefined,
        };
      }
    } else if (isCurrentlyOnDetailsPage) {
      // if previous page was the list or another host details page, load host details only
      if (wasPreviouslyOnDetailsPage || wasPreviouslyOnListPage) {
        return {
          ...state,
          location: action.payload,
          detailsLoading: true,
          policyResponseLoading: true,
          error: undefined,
          detailsError: undefined,
          policyResponseError: undefined,
        };
      } else {
        // if previous page was not host list or host details, load both list and details
        return {
          ...state,
          location: action.payload,
          loading: true,
          detailsLoading: true,
          policyResponseLoading: true,
          error: undefined,
          detailsError: undefined,
          policyResponseError: undefined,
          policyItemsLoading: true,
        };
      }
    }
    // otherwise we are not on a host list or details page
    return {
      ...state,
      location: action.payload,
      error: undefined,
      detailsError: undefined,
      policyResponseError: undefined,
    };
  }
  return state;
};
