/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

function alertListState(state: any) {
  return state.alertList;
}
// TODO: type 'state' properly
export function alertListData(state: any) {
  return alertListState(state).data.hits;
}

export function totalHits(state: any) {
  return alertListData(state).total.value;
}

export function pageIndex(state: any) {
  return alertListState(state).pageIndex;
}

export function pageSize(state: any) {
  return alertListState(state).pageSize;
}

export function showPerPageOptions(state: any) {
  return alertListState(state).showPerPageOptions;
}

export function sortField(state: any) {
  return alertListState(state).sortField;
}

export function sortDirection(state: any) {
  return alertListState(state).sortDirection;
}

export function selectedItems(state: any) {
  return alertListState(state).selectedItems;
}
