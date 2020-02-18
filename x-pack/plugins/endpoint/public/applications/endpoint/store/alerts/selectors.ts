/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import qs from 'querystring';
import { AlertListState } from '../../types';

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
 * Returns the query object received from parsing the URL query params
 */
export const paginationDataFromUrl = (state: AlertListState): qs.ParsedUrlQuery => {
  if (state.location) {
    // Removes the `?` from the beginning of query string if it exists
    const query = qs.parse(state.location.search.slice(1));
    return {
      ...(query.page_size ? { page_size: query.page_size } : {}),
      ...(query.page_index ? { page_index: query.page_index } : {}),
    };
  } else {
    return {};
  }
};

/**
 * Returns a function that takes in a new page size and returns a new query param string
 */
export const urlFromNewPageSizeParam: (
  state: AlertListState
) => (newPageSize: number) => string = state => {
  return newPageSize => {
    const urlPaginationData = paginationDataFromUrl(state);
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
    const urlPaginationData = paginationDataFromUrl(state);
    urlPaginationData.page_index = newPageIndex.toString();
    return '?' + qs.stringify(urlPaginationData);
  };
};
