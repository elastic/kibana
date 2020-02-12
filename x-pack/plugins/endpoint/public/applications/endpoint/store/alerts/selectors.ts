/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertListState } from '../../types';

export const alertListData = (state: AlertListState) => state.alerts;
export const searchBarIndexPatterns = (state: AlertListState) => state.searchBar.patterns;
export const searchBarQuery = (state: AlertListState) => state.searchBar.query;
export const searchBarFilters = (state: AlertListState) => state.searchBar.filters;
export const searchBarDateRange = (state: AlertListState) => state.searchBar.dateRange;
