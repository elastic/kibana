/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function endpointsListState(state: any) {
  return state.endpointsList;
}
// TODO: type 'state' properly
export function endpointsListData(state: any) {
  return endpointsListState(state).data.hits.hits;
}

export function isFiltered(state: any) {
  return endpointsListState(state).isFiltered;
}

export function filteredEndpointListData(state: any) {
  return endpointsListState(state).filteredData;
}

export function totalHits(state: any) {
  return endpointsListState(state).total.value;
}

export function pageIndex(state: any) {
  return endpointsListState(state).pageIndex;
}

export function pageSize(state: any) {
  return endpointsListState(state).pageSize;
}

export function sortField(state: any) {
  return endpointsListState(state).sortField;
}

export function sortDirection(state: any) {
  return endpointsListState(state).sortDirection;
}
