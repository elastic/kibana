/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';
import { OverviewFilters } from '../../../common/runtime_types';

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

export type OverviewFiltersPayload = GetOverviewFiltersPayload & Error & OverviewFilters;

export const fetchOverviewFilters = createAction<GetOverviewFiltersPayload>(
  'FETCH_OVERVIEW_FILTERS'
);

export const fetchOverviewFiltersFail = createAction<Error>('FETCH_OVERVIEW_FILTERS_FAIL');

export const fetchOverviewFiltersSuccess = createAction<OverviewFilters>(
  'FETCH_OVERVIEW_FILTERS_SUCCESS'
);

export const setOverviewFilters = createAction<OverviewFilters>('SET_OVERVIEW_FILTERS');
