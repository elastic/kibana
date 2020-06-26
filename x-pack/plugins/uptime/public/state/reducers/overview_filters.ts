/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverviewFiltersByFieldName } from '../../../common/runtime_types/overview_filters/overview_filters';
import {
  FETCH_OVERVIEW_FILTERS,
  FETCH_OVERVIEW_FILTERS_FAIL,
  FETCH_OVERVIEW_FILTERS_SUCCESS,
  OverviewFiltersAction,
  SET_OVERVIEW_FILTERS,
} from '../actions';

export interface OverviewFiltersState {
  filters: OverviewFiltersByFieldName;
  errors: Error[];
  loading: boolean;
}

const initialState: OverviewFiltersState = {
  filters: {
    'observer.geo.name': [],
    'url.port': [],
    'monitor.type': [],
    tags: [],
  },
  errors: [],
  loading: false,
};

export function overviewFiltersReducer(
  state = initialState,
  action: OverviewFiltersAction
): OverviewFiltersState {
  switch (action.type) {
    case FETCH_OVERVIEW_FILTERS:
      return {
        ...state,
        loading: true,
      };
    case FETCH_OVERVIEW_FILTERS_SUCCESS:
      return {
        ...state,
        filters: action.payload,
        loading: false,
      };
    case FETCH_OVERVIEW_FILTERS_FAIL:
      return {
        ...state,
        errors: [...state.errors, action.payload],
        loading: false,
      };
    case SET_OVERVIEW_FILTERS:
      return {
        ...state,
        filters: action.payload,
      };
    default:
      return state;
  }
}
