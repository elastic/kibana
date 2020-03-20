/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import querystring from 'querystring';
import { createSelector } from 'reselect';
import { Immutable } from '../../../../../common/types';
import { HostListState, HostIndexUIQueryParams } from '../../types';

export const listData = (state: HostListState) => state.hosts;

export const pageIndex = (state: HostListState) => state.pageIndex;

export const pageSize = (state: HostListState) => state.pageSize;

export const totalHits = (state: HostListState) => state.total;

export const isLoading = (state: HostListState) => state.loading;

export const detailsError = (state: HostListState) => state.detailsError;

export const detailsData = (state: HostListState) => {
  return state.details;
};

export const isOnHostPage = (state: HostListState) =>
  state.location ? state.location.pathname === '/hosts' : false;

export const uiQueryParams: (
  state: HostListState
) => Immutable<HostIndexUIQueryParams> = createSelector(
  (state: HostListState) => state.location,
  (location: HostListState['location']) => {
    const data: HostIndexUIQueryParams = {};
    if (location) {
      // Removes the `?` from the beginning of query string if it exists
      const query = querystring.parse(location.search.slice(1));

      const keys: Array<keyof HostIndexUIQueryParams> = ['selected_host'];

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

export const hasSelectedHost: (state: HostListState) => boolean = createSelector(
  uiQueryParams,
  ({ selected_host: selectedHost }) => {
    return selectedHost !== undefined;
  }
);
