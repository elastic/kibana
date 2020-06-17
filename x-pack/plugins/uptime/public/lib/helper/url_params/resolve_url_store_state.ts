/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UiState } from '../../../state/reducers/ui';
import { UptimeUrlParams } from './get_supported_url_params';

export const resolveUrlUpdates = (
  params: UptimeUrlParams,
  storeState: UiState
): Partial<UptimeUrlParams> => {
  const urlState: Partial<UptimeUrlParams> = {};
  if (params.autorefreshInterval !== storeState.autorefreshInterval) {
    urlState.autorefreshInterval = storeState.autorefreshInterval;
  }

  if (params.autorefreshIsPaused !== storeState.autorefreshIsPaused) {
    urlState.autorefreshIsPaused = storeState.autorefreshIsPaused;
  }

  if (
    params.dateRangeStart !== storeState.dateRange.from ||
    params.dateRangeEnd !== storeState.dateRange.to
  ) {
    urlState.dateRangeStart = storeState.dateRange.from;
    urlState.dateRangeEnd = storeState.dateRange.to;
  }

  if (params.filters !== storeState.selectedFilters) {
    urlState.filters = storeState.selectedFilters;
  }

  if (params.pagination !== storeState.currentMonitorListPage) {
    urlState.pagination = storeState.currentMonitorListPage;
  }

  if (params.search !== storeState.searchText) {
    urlState.search = storeState.searchText;
  }

  if (params.statusFilter !== storeState.statusFilter) {
    urlState.statusFilter = storeState.statusFilter;
  }

  return urlState;
};

export const resolveStateChanges = (
  params: UptimeUrlParams,
  storeState: UiState
): Partial<UiState> => {
  const uiState: Partial<UiState> = {};
  if (
    params.dateRangeStart !== storeState.dateRange.from ||
    params.dateRangeEnd !== storeState.dateRange.to
  ) {
    uiState.dateRange = { from: params.dateRangeStart, to: params.dateRangeEnd };
  }

  if (params.autorefreshInterval !== storeState.autorefreshInterval) {
    uiState.autorefreshInterval = params.autorefreshInterval;
  }

  if (params.autorefreshIsPaused !== storeState.autorefreshIsPaused) {
    uiState.autorefreshIsPaused = params.autorefreshIsPaused;
  }

  if (params.search !== storeState.searchText) {
    uiState.searchText = params.search;
  }

  if (params.statusFilter !== storeState.statusFilter) {
    uiState.statusFilter = params.statusFilter;
  }

  if (params.pagination !== storeState.currentMonitorListPage) {
    uiState.currentMonitorListPage = params.pagination;
  }

  if (params.filters !== storeState.selectedFilters) {
    uiState.selectedFilters = params.filters;
  }

  return uiState;
};
