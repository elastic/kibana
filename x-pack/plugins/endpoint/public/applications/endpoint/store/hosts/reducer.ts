/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Immutable } from '../../../../../common/types';
import { HostState, ImmutableReducer } from '../../types';
import { AppAction } from '../action';
import { isOnHostPage, hasSelectedHost } from './selectors';

const initialState = (): HostState => {
  return {
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
    location: undefined,
  };
};

export const hostListReducer: ImmutableReducer<HostState, AppAction> = (
  state = initialState(),
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
  } else if (action.type === 'serverReturnedHostPolicyResponse') {
    return {
      ...state,
      policyResponse: action.payload.policy_response,
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
          error: undefined,
          detailsError: undefined,
        };
      } else {
        // if previous page was not host list or host details, load both list and details
        return {
          ...state,
          location: action.payload,
          loading: true,
          detailsLoading: true,
          error: undefined,
          detailsError: undefined,
        };
      }
    }
    // otherwise we are not on a host list or details page
    return {
      ...state,
      location: action.payload,
      error: undefined,
      detailsError: undefined,
    };
  }
  return state;
};
