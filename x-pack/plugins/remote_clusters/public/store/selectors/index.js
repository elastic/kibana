/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Pager } from '@elastic/eui';

import { createSelector } from 'reselect';
import { filterItems, sortTable } from '../../services';

export const getClusters = (state) => state.clusters.byName;
export const getClustersList = (state) => state.clusters.allNames;
export const getClusterByName = (state, name) => getClusters(state)[name];
export const getFilteredNames = (state) => state.clusters.filteredNames;
export const getTableState = (state) => state.tableState;

export const isDetailPanelOpen = (state) => state.detailPanel.isOpen;

export const isLoading = (state) => state.clusters.isLoading;
export const clusterLoadError = (state) => state.clusters.clusterLoadError;

const getFilteredClusters = createSelector(
  getClusters,
  getTableState,
  (clusters, tableState) => {
    const clusterArray = Object.keys(clusters).map(name => clusters[name]);
    return filterItems(['name', 'seeds'], tableState.filter, clusterArray);
  }
);

export const getTotalItems = createSelector(
  getFilteredClusters,
  (filteredClusters) => {
    return Object.keys(filteredClusters).length;
  }
);

export const getPager = createSelector(
  getTableState,
  getTotalItems,
  ({ currentPage, pageSize }, totalItems) => {
    return new Pager(totalItems, pageSize, currentPage);
  }
);

export const getPageOfClusters = createSelector(
  getFilteredClusters,
  getTableState,
  getPager,
  (filteredClusters, tableState, pager) => {
    const sortedIndexes = sortTable(filteredClusters, tableState.sortField, tableState.isSortAscending);
    const { firstItemIndex, lastItemIndex } = pager;
    const pagedIndexes = sortedIndexes.slice(firstItemIndex, lastItemIndex + 1);
    return pagedIndexes;
  }
);

export const getHasNextPage = createSelector(
  getPager,
  (pager) => {
    return pager.hasNextPage;
  }
);

export const getHasPreviousPage = createSelector(
  getPager,
  (pager) => {
    return pager.hasPreviousPage;
  }
);

export const getCurrentPage = createSelector(
  getPager,
  (pager) => {
    return pager.currentPage;
  }
);

export const getFilter = createSelector(
  getTableState,
  ({ filter }) => filter
);

export const isSortAscending = createSelector(
  getTableState,
  ({ isSortAscending }) => isSortAscending
);

export const getSortField = createSelector(
  getTableState,
  ({ sortField }) => sortField
);
