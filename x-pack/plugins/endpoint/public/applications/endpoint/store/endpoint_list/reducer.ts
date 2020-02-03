/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { ManagementState } from '../../types';
import { AppAction } from '../action';

const initialState = (): ManagementState => {
  return {
    endpoints: [],
    pageSize: 10,
    pageIndex: 0,
    total: 0,
    loading: false,
  };
};

export const endpointListReducer: Reducer<ManagementState, AppAction> = (
  state = initialState(),
  action
) => {
  if (action.type === 'serverReturnedEndpointList') {
    const {
      endpoints,
      total,
      request_page_size: pageSize,
      request_page_index: pageIndex,
    } = action.payload;
    return {
      ...state,
      endpoints,
      total,
      pageSize,
      pageIndex,
      loading: false,
    };
  }

  if (action.type === 'userExitedEndpointListPage') {
    return initialState();
  }

  if (action.type === 'userPaginatedEndpointListTable') {
    return {
      ...state,
      ...action.payload,
      loading: true,
    };
  }

  return state;
};
