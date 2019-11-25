/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GlobalState } from '../types';

function alertListState(state: GlobalState) {
  return state.alertList;
}

export function alertListData(state: GlobalState) {
  return alertListState(state).data.hits;
}

export function totalHits(state: GlobalState) {
  return alertListData(state).total.value;
}

export function pageIndex(state: GlobalState) {
  return alertListState(state).pageIndex;
}

export function pageSize(state: GlobalState) {
  return alertListState(state).pageSize;
}

export function showPerPageOptions(state: GlobalState) {
  return alertListState(state).showPerPageOptions;
}

export function sortField(state: GlobalState) {
  return alertListState(state).sortField;
}

export function sortDirection(state: GlobalState) {
  return alertListState(state).sortDirection;
}

export function selectedItems(state: GlobalState) {
  return alertListState(state).selectedItems;
}
