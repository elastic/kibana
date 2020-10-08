/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions, Action } from 'redux-actions';
import { OverviewFilters } from '../../../common/runtime_types';
import {
  fetchOverviewFilters,
  fetchOverviewFiltersFail,
  fetchOverviewFiltersSuccess,
  setOverviewFilters,
  GetOverviewFiltersPayload,
  OverviewFiltersPayload,
} from '../actions';

export interface OverviewFiltersState {
  filters: OverviewFilters;
  errors: Error[];
  loading: boolean;
}

const initialState: OverviewFiltersState = {
  filters: {
    locations: [],
    ports: [],
    schemes: [],
    tags: [],
  },
  errors: [],
  loading: false,
};

export const overviewFiltersReducer = handleActions<OverviewFiltersState, OverviewFiltersPayload>(
  {
    [String(fetchOverviewFilters)]: (state, _action: Action<GetOverviewFiltersPayload>) => ({
      ...state,
      loading: true,
    }),

    [String(fetchOverviewFiltersSuccess)]: (state, action: Action<OverviewFilters>) => ({
      ...state,
      filters: action.payload,
      loading: false,
    }),

    [String(fetchOverviewFiltersFail)]: (state, action: Action<Error>) => ({
      ...state,
      errors: [...state.errors, action.payload],
      loading: false,
    }),

    [String(setOverviewFilters)]: (state, action: Action<OverviewFilters>) => ({
      ...state,
      filters: action.payload,
    }),
  },
  initialState
);
