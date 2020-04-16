/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import querystring from 'querystring';
import { createSelector } from 'reselect';
import { Immutable } from '../../../../../common/types';
import { HostListState, HostIndexUIQueryParams } from '../../types';

export const listData = (state: Immutable<HostListState>) => state.hosts;

export const pageIndex = (state: Immutable<HostListState>) => state.pageIndex;

export const pageSize = (state: Immutable<HostListState>) => state.pageSize;

export const totalHits = (state: Immutable<HostListState>) => state.total;

export const isLoading = (state: Immutable<HostListState>) => state.loading;

export const detailsError = (state: Immutable<HostListState>) => state.detailsError;

export const detailsData = (state: Immutable<HostListState>) => {
  return state.details;
};

export const isOnHostPage = (state: Immutable<HostListState>) =>
  state.location ? state.location.pathname === '/hosts' : false;

export const uiQueryParams: (
  state: Immutable<HostListState>
) => Immutable<HostIndexUIQueryParams> = createSelector(
  (state: Immutable<HostListState>) => state.location,
  (location: Immutable<HostListState>['location']) => {
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

export const hasSelectedHost: (state: Immutable<HostListState>) => boolean = createSelector(
  uiQueryParams,
  ({ selected_host: selectedHost }) => {
    return selectedHost !== undefined;
  }
);
