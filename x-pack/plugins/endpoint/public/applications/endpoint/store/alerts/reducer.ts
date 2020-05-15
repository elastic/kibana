/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertListState, ImmutableReducer } from '../../types';
import { AppAction } from '../action';
import { Immutable } from '../../../../../common/types';

const initialState = (): Immutable<AlertListState> => {
  return {
    alerts: [],
    alertDetails: undefined,
    pageSize: 10,
    pageIndex: 0,
    total: 0,
    location: undefined,
    searchBar: {
      patterns: [],
    },
  };
};

export const alertListReducer: ImmutableReducer<AlertListState, AppAction> = (
  state = initialState(),
  action
) => {
  if (action.type === 'serverReturnedAlertsData') {
    const {
      alerts,
      request_page_size: pageSize,
      request_page_index: pageIndex,
      total,
    } = action.payload;
    return {
      ...state,
      alerts,
      pageSize,
      // request_page_index is optional because right now we support both
      // simple and cursor based pagination.
      pageIndex: pageIndex || 0,
      total,
    };
  } else if (action.type === 'userChangedUrl') {
    return {
      ...state,
      location: action.payload,
    };
  } else if (action.type === 'serverReturnedAlertDetailsData') {
    return {
      ...state,
      alertDetails: action.payload,
    };
  } else if (action.type === 'serverReturnedSearchBarIndexPatterns') {
    return {
      ...state,
      searchBar: {
        ...state.searchBar,
        patterns: action.payload,
      },
    };
  }

  return state;
};
