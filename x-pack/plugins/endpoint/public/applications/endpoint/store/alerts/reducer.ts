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
    next: '',
    prev: '',
    request_page_size: 10,
    request_page_index: 0,
    result_from_index: 0,
    total: 0,
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
    return {
      ...state,
      ...action.payload,
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
