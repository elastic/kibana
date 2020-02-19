/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import qs from 'querystring';
import { createSelector } from 'reselect';
import { Immutable } from '../../../../../common/types';
import { AlertListState, AlertingIndexUIQueryParams, AlertsAPIQueryParams } from '../../types';

/**
 * Returns the Alert Data array from state
 */
export const alertListData = (state: AlertListState) => state.alerts;

/**
 * Returns the alert list pagination data from state
 */
export const alertListPagination = (state: AlertListState) => {
  return {
    pageIndex: state.request_page_index,
    pageSize: state.request_page_size,
    resultFromIndex: state.result_from_index,
    total: state.total,
  };
};

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
      const query = qs.parse(location.search.slice(1));

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

/**
 * Returns a function that takes in a new page size and returns a new query param string
 */
export const urlFromNewPageSizeParam: (
  state: AlertListState
) => (newPageSize: number) => string = state => {
  return newPageSize => {
    const urlPaginationData: AlertingIndexUIQueryParams = { ...uiQueryParams(state) };
    urlPaginationData.page_size = newPageSize.toString();

    // Only set the url back to page zero if the user has changed the page index already
    if (urlPaginationData.page_index !== undefined) {
      urlPaginationData.page_index = '0';
    }
    return '?' + qs.stringify(urlPaginationData);
  };
};

/**
 * Returns a function that takes in a new page index and returns a new query param string
 */
export const urlFromNewPageIndexParam: (
  state: AlertListState
) => (newPageIndex: number) => string = state => {
  return newPageIndex => {
    const urlPaginationData: AlertingIndexUIQueryParams = { ...uiQueryParams(state) };
    urlPaginationData.page_index = newPageIndex.toString();
    return '?' + qs.stringify(urlPaginationData);
  };
};

/**
 * Returns a url like the current one, but with a new alert id.
 */
export const urlWithSelectedAlert: (
  state: AlertListState
) => (alertID: string) => string = state => {
  return (alertID: string) => {
    const urlPaginationData = { ...uiQueryParams(state) };
    urlPaginationData.selected_alert = alertID;
    return '?' + qs.stringify(urlPaginationData);
  };
};

/**
 * Returns a url like the current one, but with no alert id
 */
export const urlWithoutSelectedAlert: (state: AlertListState) => string = createSelector(
  uiQueryParams,
  urlPaginationData => {
    const newUrlPaginationData = { ...urlPaginationData };
    delete newUrlPaginationData.selected_alert;
    return '?' + qs.stringify(newUrlPaginationData);
  }
);

export const hasSelectedAlert: (state: AlertListState) => boolean = createSelector(
  uiQueryParams,
  ({ selected_alert: selectedAlert }) => selectedAlert !== undefined
);
