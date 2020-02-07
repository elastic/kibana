/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import qs from 'querystring';
import URL from 'url-parse';
import { AlertListState } from '../../types';

export const alertListData = (state: AlertListState) => state.alerts;

export const alertListPagination = (state: AlertListState) => {
  return {
    pageIndex: state.request_page_index,
    pageSize: state.request_page_size,
    resultFromIndex: state.result_from_index,
    total: state.total,
  };
};

export const isOnAlertPage = (state: AlertListState) => {
  return URL(state.url).pathname.endsWith('/alerts');
};

export const paginationDataFromUrl = (state: AlertListState) => {
  return URL(state.url, true).query;
};

export const urlFromNewPageSizeParam = (state: AlertListState) => {
  return (newPageSize: number) => {
    const urlPaginationData = paginationDataFromUrl(state);
    urlPaginationData.page_size = newPageSize.toString();

    // Only set the url back to page zero if the user has changed the page index already
    if (urlPaginationData.page_index !== undefined) {
      urlPaginationData.page_index = '0';
    }
    return '?' + qs.stringify(urlPaginationData);
  };
};

export const urlFromNewPageIndexParam = (state: AlertListState) => {
  return (newPageIndex: number) => {
    const urlPaginationData = paginationDataFromUrl(state);
    urlPaginationData.page_index = newPageIndex.toString();
    return '?' + qs.stringify(urlPaginationData);
  };
};
