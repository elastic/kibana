/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Reducer } from 'redux';
import { AlertListState } from '../../types';
import { AppAction } from '../action';

const initialState = (): AlertListState => {
  return {
    alerts: [],
    alertDetails: undefined,
    pageSize: 10,
    pageIndex: 0,
    total: 0,
    location: undefined,
    searchBar: {
      patterns: [],
      query: { query: '', language: 'kuery' },
      dateRange: { from: 'now-15m', to: 'now' },
      filters: [],
    },
  };
};

export const alertListReducer: Reducer<AlertListState, AppAction> = (
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
  } else if (
    action.type === 'userUpdatedAlertsSearchBarFilter' ||
    action.type === 'userSubmittedAlertsSearchBarFilter'
  ) {
    const { payload } = action;
    return {
      ...state,
      searchBar: {
        ...state.searchBar,
        query: payload.query ? payload.query : state.searchBar.query,
        filters: payload.filters ? payload.filters : state.searchBar.filters,
        dateRange: payload.dateRange ? payload.dateRange : state.searchBar.dateRange,
      },
    };
  }

  return state;
};
