/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import {
  createSelector,
  createStructuredSelector as createStructuredSelectorWithBadType,
} from 'reselect';
import {
  AlertListState,
  AlertingIndexUIQueryParams,
  AlertsAPIQueryParams,
  CreateStructuredSelector,
} from '../../types';
import { Immutable } from '../../../../../common/types';

const createStructuredSelector: CreateStructuredSelector = createStructuredSelectorWithBadType;
/**
 * Returns the Alert Data array from state
 */
export const alertListData = (state: AlertListState) => state.alerts;

export const selectedAlertDetailsData = (state: AlertListState) => state.alertDetails;

/**
 * Returns the alert list pagination data from state
 */
export const alertListPagination = createStructuredSelector({
  pageIndex: (state: AlertListState) => state.pageIndex,
  pageSize: (state: AlertListState) => state.pageSize,
  total: (state: AlertListState) => state.total,
});

/**
 * Returns a boolean based on whether or not the user is on the alerts page
 */
export const isOnAlertPage = (state: AlertListState): boolean => {
  return state.location ? state.location.pathname === '/alerts' : false;
};

/**
 * Returns the query object received from parsing the browsers URL query params.
 * Used to calculate urls for links and such.
 */
export const uiQueryParams: (
  state: AlertListState
) => Immutable<AlertingIndexUIQueryParams> = createSelector(
  (state: AlertListState) => state.location,
  (location: AlertListState['location']) => {
    const data: AlertingIndexUIQueryParams = {};
    if (location) {
      // Removes the `?` from the beginning of query string if it exists
      const query = querystring.parse(location.search.slice(1));

      /**
       * Build an AlertingIndexUIQueryParams object with keys from the query.
       * If more than one value exists for a key, use the last.
       */
      const keys: Array<keyof AlertingIndexUIQueryParams> = [
        'page_size',
        'page_index',
        'selected_alert',
      ];
      for (const key of keys) {
        const value = query[key];
        if (typeof value === 'string') {
          data[key] = value;
        } else if (Array.isArray(value)) {
          data[key] = value[value.length - 1];
        }
      }
    }
    return data;
  }
);

/**
 * query params to use when requesting alert data.
 */
export const apiQueryParams: (
  state: AlertListState
) => Immutable<AlertsAPIQueryParams> = createSelector(
  uiQueryParams,
  ({ page_size, page_index }) => ({
    page_size,
    page_index,
  })
);

export const hasSelectedAlert: (state: AlertListState) => boolean = createSelector(
  uiQueryParams,
  ({ selected_alert: selectedAlert }) => selectedAlert !== undefined
);

/**
 * Determine if the alert event is most likely compatible with LegacyEndpointEvent.
 */
export const selectedAlertIsLegacyEndpointEvent: (
  state: AlertListState
) => boolean = createSelector(selectedAlertDetailsData, function(event) {
  if (event === undefined) {
    return false;
  }
  return 'endgame' in event;
});
