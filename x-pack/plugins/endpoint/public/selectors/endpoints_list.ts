/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GlobalState } from '../types';

function endpointsListState(state: GlobalState) {
  return state.endpointsList;
}

export function endpointsListData(state: GlobalState) {
  return endpointsListState(state).data.hits.hits;
}

export function isFiltered(state: GlobalState) {
  return endpointsListState(state).isFiltered;
}

export function filteredEndpointListData(state: GlobalState) {
  return endpointsListState(state).filteredData;
}

export function totalHits(state: GlobalState) {
  return endpointsListState(state).data.hits.total.value;
}

export function pageIndex(state: GlobalState) {
  return endpointsListState(state).pageIndex;
}

export function pageSize(state: GlobalState) {
  return endpointsListState(state).pageSize;
}

export function sortField(state: GlobalState) {
  return endpointsListState(state).sortField;
}

export function sortDirection(state: GlobalState) {
  return endpointsListState(state).sortDirection;
}
