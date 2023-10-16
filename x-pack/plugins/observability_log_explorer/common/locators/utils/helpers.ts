/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { setStateToKbnUrl } from '@kbn/kibana-utils-plugin/common';
import { DatasetLocatorParams } from '@kbn/deeplinks-observability/locators';
import { AppState } from '../types';

interface LocatorPathCosntructionParams {
  locatorParams: DatasetLocatorParams;
  index: string;
  useHash: boolean;
}

export const constructLocatorPath = async (params: LocatorPathCosntructionParams) => {
  const { isFilterPinned } = await import('@kbn/es-query');

  const {
    locatorParams: { filters, query, refreshInterval, timeRange, columns, sort, origin },
    index,
    useHash,
  } = params;
  const appState: AppState = {};
  const queryState: GlobalQueryStateFromUrl = {};

  // App state
  if (index) appState.index = index;
  if (query) appState.query = query;
  if (filters && filters.length) appState.filters = filters?.filter((f) => !isFilterPinned(f));
  if (columns) appState.columns = columns;
  if (sort) appState.sort = sort;

  // Global State
  if (timeRange) queryState.time = timeRange;
  if (filters && filters.length) queryState.filters = filters?.filter((f) => isFilterPinned(f));
  if (refreshInterval) queryState.refreshInterval = refreshInterval;

  let path = '/';

  if (Object.keys(queryState).length) {
    path = setStateToKbnUrl<GlobalQueryStateFromUrl>(
      '_g',
      queryState,
      { useHash, storeInHashQuery: false },
      path
    );
  }

  path = setStateToKbnUrl('_a', appState, { useHash, storeInHashQuery: false }, path);

  return {
    app: 'observability-log-explorer',
    path,
    state: {
      ...(origin ? { origin } : {}),
    },
  };
};
