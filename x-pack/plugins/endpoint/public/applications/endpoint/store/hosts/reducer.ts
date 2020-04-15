/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HostListState, ImmutableReducer } from '../../types';
import { AppAction } from '../action';

const initialState = (): HostListState => {
  return {
    hosts: [],
    pageSize: 10,
    pageIndex: 0,
    total: 0,
    loading: false,
    detailsError: undefined,
    details: undefined,
    location: undefined,
  };
};

export const hostListReducer: ImmutableReducer<HostListState, AppAction> = (
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
    };
  } else if (action.type === 'serverReturnedHostDetails') {
    return {
      ...state,
      details: action.payload.metadata,
    };
  } else if (action.type === 'serverFailedToReturnHostDetails') {
    return {
      ...state,
      detailsError: action.payload,
    };
  } else if (action.type === 'userPaginatedHostList') {
    return {
      ...state,
      ...action.payload,
      loading: true,
    };
  } else if (action.type === 'userChangedUrl') {
    return {
      ...state,
      location: action.payload,
      detailsError: undefined,
    };
  }

  return state;
};
