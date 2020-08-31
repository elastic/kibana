/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isOnEndpointPage, hasSelectedEndpoint } from './selectors';
import { EndpointState } from '../types';
import { AppAction } from '../../../../common/store/actions';
import { ImmutableReducer } from '../../../../common/store';
import { Immutable } from '../../../../../common/endpoint/types';
import { DEFAULT_POLL_INTERVAL } from '../../../common/constants';

export const initialEndpointListState: Immutable<EndpointState> = {
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
  nonExistingPolicies: {},
  endpointsExist: true,
  isAutoRefreshEnabled: true,
  autoRefreshInterval: DEFAULT_POLL_INTERVAL,
};

/* eslint-disable-next-line complexity */
export const endpointListReducer: ImmutableReducer<EndpointState, AppAction> = (
  state = initialEndpointListState,
  action
) => {
  if (action.type === 'serverReturnedEndpointList') {
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
  } else if (action.type === 'serverFailedToReturnEndpointList') {
    return {
      ...state,
      error: action.payload,
      loading: false,
    };
  } else if (action.type === 'serverReturnedEndpointNonExistingPolicies') {
    return {
      ...state,
      nonExistingPolicies: {
        ...state.nonExistingPolicies,
        ...action.payload,
      },
    };
  } else if (action.type === 'serverReturnedEndpointDetails') {
    return {
      ...state,
      details: action.payload.metadata,
      detailsLoading: false,
      detailsError: undefined,
    };
  } else if (action.type === 'serverFailedToReturnEndpointDetails') {
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
  } else if (action.type === 'serverReturnedEndpointPolicyResponse') {
    return {
      ...state,
      policyResponse: action.payload.policy_response,
      policyResponseLoading: false,
      policyResponseError: undefined,
    };
  } else if (action.type === 'serverFailedToReturnEndpointPolicyResponse') {
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
  } else if (action.type === 'serverCancelledEndpointListLoading') {
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
  } else if (action.type === 'serverReturnedEndpointExistValue') {
    return {
      ...state,
      endpointsExist: action.payload,
    };
  } else if (action.type === 'userUpdatedEndpointListRefreshOptions') {
    return {
      ...state,
      isAutoRefreshEnabled: action.payload.isAutoRefreshEnabled ?? state.isAutoRefreshEnabled,
      autoRefreshInterval: action.payload.autoRefreshInterval ?? state.autoRefreshInterval,
    };
  } else if (action.type === 'userChangedUrl') {
    const newState: Immutable<EndpointState> = {
      ...state,
      location: action.payload,
    };
    const isCurrentlyOnListPage = isOnEndpointPage(newState) && !hasSelectedEndpoint(newState);
    const wasPreviouslyOnListPage = isOnEndpointPage(state) && !hasSelectedEndpoint(state);
    const isCurrentlyOnDetailsPage = isOnEndpointPage(newState) && hasSelectedEndpoint(newState);
    const wasPreviouslyOnDetailsPage = isOnEndpointPage(state) && hasSelectedEndpoint(state);

    // if on the endpoint list page for the first time, return new location and load list
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
      // if previous page was the list or another endpoint details page, load endpoint details only
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
        // if previous page was not endpoint list or endpoint details, load both list and details
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
    // otherwise we are not on a endpoint list or details page
    return {
      ...state,
      location: action.payload,
      error: undefined,
      detailsError: undefined,
      policyResponseError: undefined,
      endpointsExist: true,
    };
  }
  return state;
};
