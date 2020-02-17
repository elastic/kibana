/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { ManagementListState } from '../../types';
import { AppAction } from '../action';

const initialState = (): ManagementListState => {
  return {
    endpoints: [],
    pageSize: 10,
    pageIndex: 0,
    total: 0,
    loading: false,
  };
};

export const managementListReducer: Reducer<ManagementListState, AppAction> = (
  state = initialState(),
  action
) => {
  if (action.type === 'serverReturnedManagementList') {
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

  if (action.type === 'userExitedManagementList') {
    return initialState();
  }

  if (action.type === 'userPaginatedManagementList') {
    return {
      ...state,
      ...action.payload,
      loading: true,
    };
  }

  return state;
};
