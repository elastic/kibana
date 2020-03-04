/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import querystring from 'querystring';
import { createSelector } from 'reselect';
import { Immutable } from '../../../../../common/types';
import { ManagementListState, ManagingIndexUIQueryParams } from '../../types';

export const listData = (state: ManagementListState) => state.endpoints;

export const pageIndex = (state: ManagementListState) => state.pageIndex;

export const pageSize = (state: ManagementListState) => state.pageSize;

export const totalHits = (state: ManagementListState) => state.total;

export const isLoading = (state: ManagementListState) => state.loading;

export const detailsError = (state: ManagementListState) => state.detailsError;

export const detailsData = (state: ManagementListState) => {
  return state.details;
};

export const isOnManagementPage = (state: ManagementListState) =>
  state.location ? state.location.pathname === '/management' : false;

export const uiQueryParams: (
  state: ManagementListState
) => Immutable<ManagingIndexUIQueryParams> = createSelector(
  (state: ManagementListState) => state.location,
  (location: ManagementListState['location']) => {
    const data: ManagingIndexUIQueryParams = {};
    if (location) {
      // Removes the `?` from the beginning of query string if it exists
      const query = querystring.parse(location.search.slice(1));

      const keys: Array<keyof ManagingIndexUIQueryParams> = ['selected_host'];

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

export const hasSelectedHost: (state: ManagementListState) => boolean = createSelector(
  uiQueryParams,
  ({ selected_host: selectedHost }) => {
    return selectedHost !== undefined;
  }
);
