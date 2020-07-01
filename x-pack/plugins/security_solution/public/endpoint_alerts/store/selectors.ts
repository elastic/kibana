/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// eslint-disable-next-line import/no-nodejs-modules
import querystring from 'querystring';
import {
  createSelector,
  createStructuredSelector as createStructuredSelectorWithBadType,
} from 'reselect';
import { encode, decode } from 'rison-node';

import { Immutable } from '../../../common/endpoint/types';
import { Query, TimeRange, Filter } from '../../../../../../src/plugins/data/public';

import {
  AlertingIndexGetQueryInput,
  AlertListState,
  AlertingIndexUIQueryParams,
} from '../../../common/endpoint_alerts/types';
import { CreateStructuredSelector } from '../../common/store';

const createStructuredSelector: CreateStructuredSelector = createStructuredSelectorWithBadType;

/**
 * Returns the Alert Data array from state
 */
export const alertListData = (state: Immutable<AlertListState>) => state.alerts;

export const selectedAlertDetailsData = (state: Immutable<AlertListState>) => state.alertDetails;

/**
 * Returns the alert list pagination data from state
 */
export const alertListPagination = createStructuredSelector({
  pageIndex: (state: Immutable<AlertListState>) => state.pageIndex,
  pageSize: (state: Immutable<AlertListState>) => state.pageSize,
  total: (state: Immutable<AlertListState>) => state.total,
});

/**
 * Returns a boolean based on whether or not the user is on the alerts page
 */
export const isOnAlertPage = (state: Immutable<AlertListState>): boolean => {
  return state.location
    ? state.location.pathname === '/endpoint-alerts' ||
        window.location.pathname.includes('/endpoint-alerts')
    : false;
};

/**
 * Returns a boolean based on whether or not the user navigated within the alerts page
 */
export const isAlertPageTabChange = (state: Immutable<AlertListState>): boolean => {
  return isOnAlertPage(state) && state.location?.state?.isTabChange === true;
};

/**
 * Returns the query object received from parsing the browsers URL query params.
 * Used to calculate urls for links and such.
 */
export const uiQueryParams: (
  state: Immutable<AlertListState>
) => Immutable<AlertingIndexUIQueryParams> = createSelector(
  (state) => state.location,
  (location: Immutable<AlertListState>['location']) => {
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
        'active_details_tab',
        'selected_alert',
        'query',
        'date_range',
        'filters',
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
 * Parses the ui query params and returns a object that represents the query used by the SearchBar component.
 * If the query url param is undefined, a default is returned.
 */
export const searchBarQuery: (state: Immutable<AlertListState>) => Query = createSelector(
  uiQueryParams,
  ({ query }) => {
    if (query !== undefined) {
      return (decode(query) as unknown) as Query;
    } else {
      return { query: '', language: 'kuery' };
    }
  }
);

/**
 * Parses the ui query params and returns a rison encoded string that represents the search bar's date range.
 * A default is provided if 'date_range' is not present in the url params.
 */
export const encodedSearchBarDateRange: (
  state: Immutable<AlertListState>
) => string = createSelector(uiQueryParams, ({ date_range: dateRange }) => {
  if (dateRange === undefined) {
    return encode({ from: 'now-24h', to: 'now' });
  } else {
    return dateRange;
  }
});

/**
 * Parses the ui query params and returns a object that represents the dateRange used by the SearchBar component.
 */
export const searchBarDateRange: (state: Immutable<AlertListState>) => TimeRange = createSelector(
  encodedSearchBarDateRange,
  (encodedDateRange) => {
    return (decode(encodedDateRange) as unknown) as TimeRange;
  }
);

/**
 * Parses the ui query params and returns an array of filters used by the SearchBar component.
 * If the 'filters' param is not present, a default is returned.
 */
export const searchBarFilters: (state: Immutable<AlertListState>) => Filter[] = createSelector(
  uiQueryParams,
  ({ filters }) => {
    if (filters !== undefined) {
      return (decode(filters) as unknown) as Filter[];
    } else {
      return [];
    }
  }
);

/**
 * Returns the indexPatterns used by the SearchBar component
 */
export const searchBarIndexPatterns = (state: Immutable<AlertListState>) =>
  state.searchBar.patterns;

/**
 * query params to use when requesting alert data.
 */
export const apiQueryParams: (
  state: Immutable<AlertListState>
) => Immutable<AlertingIndexGetQueryInput> = createSelector(
  uiQueryParams,
  encodedSearchBarDateRange,
  ({ page_size, page_index, query, filters }, encodedDateRange) => ({
    page_size,
    page_index,
    query,
    // Always send a default date range param to the API
    // even if there is no date_range param in the url
    date_range: encodedDateRange,
    filters,
  })
);

/**
 * True if the user has selected an alert to see details about.
 * Populated via the browsers query params.
 */
export const hasSelectedAlert: (state: Immutable<AlertListState>) => boolean = createSelector(
  uiQueryParams,
  ({ selected_alert: selectedAlert }) => selectedAlert !== undefined
);

export const selectedAlertDetailsTabId: (
  state: Immutable<AlertListState>
) => string | undefined = createSelector(
  uiQueryParams,
  ({ active_details_tab: activeDetailsTab }) => activeDetailsTab
);
