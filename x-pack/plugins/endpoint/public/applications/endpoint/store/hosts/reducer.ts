/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostState, ImmutableReducer } from '../../types';
import { AppAction } from '../action';

const initialState = (): HostState => {
  return {
    hosts: [],
    pageSize: 10,
    pageIndex: 0,
    total: 0,
    loading: false,
    error: undefined,
    details: undefined,
    detailsLoading: undefined,
    detailsError: undefined,
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
      hosts: hosts.map(hostInfo => hostInfo.metadata),
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
      loading: false,
    };
  } else if (action.type === 'serverFailedToReturnHostDetails') {
    return {
      ...state,
      detailsError: action.payload,
      detailsLoading: false,
    };
  } else if (action.type === 'userChangedUrl') {
    return {
      ...state,
      location: action.payload,
      loading: true,
      detailsLoading: true,
      detailsError: undefined,
    };
  }

  return state;
};
