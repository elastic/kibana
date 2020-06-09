/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { OverviewFilters } from '../../../common/runtime_types';

export const FETCH_OVERVIEW_FILTERS = 'FETCH_OVERVIEW_FILTERS';
export const FETCH_OVERVIEW_FILTERS_FAIL = 'FETCH_OVERVIEW_FILTERS_FAIL';
export const FETCH_OVERVIEW_FILTERS_SUCCESS = 'FETCH_OVERVIEW_FILTERS_SUCCESS';
export const SET_OVERVIEW_FILTERS = 'SET_OVERVIEW_FILTERS';

export interface GetOverviewFiltersPayload {
  dateRangeStart: string;
  dateRangeEnd: string;
  locations: string[];
  ports: string[];
  schemes: string[];
  search?: string;
  statusFilter?: string;
  tags: string[];
}

interface GetOverviewFiltersFetchAction {
  type: typeof FETCH_OVERVIEW_FILTERS;
  payload: GetOverviewFiltersPayload;
}

interface GetOverviewFiltersSuccessAction {
  type: typeof FETCH_OVERVIEW_FILTERS_SUCCESS;
  payload: OverviewFilters;
}

interface GetOverviewFiltersFailAction {
  type: typeof FETCH_OVERVIEW_FILTERS_FAIL;
  payload: Error;
}

interface SetOverviewFiltersAction {
  type: typeof SET_OVERVIEW_FILTERS;
  payload: OverviewFilters;
}

export type OverviewFiltersAction =
  | GetOverviewFiltersFetchAction
  | GetOverviewFiltersSuccessAction
  | GetOverviewFiltersFailAction
  | SetOverviewFiltersAction;

export const fetchOverviewFilters = (
  payload: GetOverviewFiltersPayload
): GetOverviewFiltersFetchAction => ({
  type: FETCH_OVERVIEW_FILTERS,
  payload,
});

export const fetchOverviewFiltersFail = (error: Error): GetOverviewFiltersFailAction => ({
  type: FETCH_OVERVIEW_FILTERS_FAIL,
  payload: error,
});

export const fetchOverviewFiltersSuccess = (
  filters: OverviewFilters
): GetOverviewFiltersSuccessAction => ({
  type: FETCH_OVERVIEW_FILTERS_SUCCESS,
  payload: filters,
});

export const setOverviewFilters = (filters: OverviewFilters): SetOverviewFiltersAction => ({
  type: SET_OVERVIEW_FILTERS,
  payload: filters,
});
