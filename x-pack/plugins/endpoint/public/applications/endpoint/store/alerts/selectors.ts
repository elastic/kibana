/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import qs from 'querystring';
import { createSelector } from 'reselect';
import { Immutable } from '../../../../../common/types';
import { AlertListState, AlertIndexQueryParams } from '../../types';

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
 * Returns the query object received from parsing the URL query params.
 * The query value passed when requesting alert list data from the server.
 * Also used to get new client side URLs.
 */
export const queryParams: (
  state: AlertListState
) => Immutable<AlertIndexQueryParams> = createSelector(
  (state: AlertListState) => state.location,
  (location: AlertListState['location']) => {
    const data: AlertIndexQueryParams = {};
    if (location) {
      // Removes the `?` from the beginning of query string if it exists
      const query = qs.parse(location.search.slice(1));
      if (typeof query.page_size === 'string') {
        data.page_size = query.page_size;
      } else if (Array.isArray(query.page_size)) {
        data.page_size = query.page_size[query.page_size.length - 1];
      }

      if (typeof query.page_index === 'string') {
        data.page_index = query.page_index;
      } else if (Array.isArray(query.page_index)) {
        data.page_index = query.page_index[query.page_index.length - 1];
      }

      if (typeof query.selected_alert === 'string') {
        data.selected_alert = query.selected_alert;
      } else if (Array.isArray(query.selected_alert)) {
        data.selected_alert = query.selected_alert[query.selected_alert.length - 1];
      }
    }
    return data;
  }
);

/**
 * Returns a function that takes in a new page size and returns a new query param string
 */
export const urlFromNewPageSizeParam: (
  state: AlertListState
) => (newPageSize: number) => string = state => {
  return newPageSize => {
    const urlPaginationData: AlertIndexQueryParams = { ...queryParams(state) };
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
    const urlPaginationData: AlertIndexQueryParams = { ...queryParams(state) };
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
    const urlPaginationData = { ...queryParams(state) };
    urlPaginationData.selected_alert = alertID;
    return '?' + qs.stringify(urlPaginationData);
  };
};

/**
 * Returns a url like the current one, but with no alert id
 */
export const urlWithoutSelectedAlert: (state: AlertListState) => string = createSelector(
  queryParams,
  urlPaginationData => {
    // TODO, different pattern for calculating URL w/ and w/o qs values
    const newUrlPaginationData = { ...urlPaginationData };
    delete newUrlPaginationData.selected_alert;
    return '?' + qs.stringify(newUrlPaginationData);
  }
);

export const hasSelectedAlert: (state: AlertListState) => boolean = createSelector(
  queryParams,
  ({ selected_alert: selectedAlert }) => selectedAlert !== undefined
);
