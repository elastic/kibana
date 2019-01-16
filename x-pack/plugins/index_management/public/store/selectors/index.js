/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Pager, EuiSearchBar } from '@elastic/eui';

import { createSelector } from 'reselect';
import { indexStatusLabels } from '../../lib/index_status_labels';
import { sortTable } from '../../services';
import { getToggleExtensions } from '../../index_management_extensions';

export const getDetailPanelData = (state) => state.detailPanel.data;
export const getDetailPanelError = (state) => state.detailPanel.error;
export const getDetailPanelType = (state) => state.detailPanel.panelType;
export const isDetailPanelOpen = (state) => !!getDetailPanelType(state);
export const getDetailPanelIndexName = (state) => state.detailPanel.indexName;
export const getIndices = (state) => state.indices.byId;
export const indicesLoading = (state) => state.indices.loading;
export const getIndicesAsArray = (state) => Object.values(state.indices.byId);
export const getIndicesByName = (state, indexNames) => {
  const indices = getIndices(state);
  return indexNames.map((indexName) => indices[indexName]);
};
export const getIndexByIndexName = (state, name) => getIndices(state)[name];
export const getFilteredIds = (state) => state.indices.filteredIds;
export const getRowStatuses = (state) => state.rowStatus;
export const getTableState = (state) => state.tableState;
export const getAllIds = (state) => state.indices.allIds;
export const getIndexStatusByIndexName = (state, indexName) => {
  const indices = getIndices(state);
  const { status } = indices[indexName] || {};
  return status;
};
const defaultFilterFields = ['name', 'uuid'];

const filterByToggles = (indices, toggleNameToVisibleMap) => {
  const togglesByName = getToggleExtensions().reduce((byName, toggle) => ({
    ...byName,
    [toggle.name]: toggle,
  }), {});

  const toggleNames = Object.keys(togglesByName);
  if (!toggleNames.length) {
    return indices;
  }
  // An index is visible if ANY applicable toggle is visible.
  return indices.filter((index) => {
    return toggleNames.some(toggleName => {
      if (!togglesByName[toggleName].matchIndex(index)) {
        return true;
      }

      const isVisible = toggleNameToVisibleMap[toggleName] === true;

      return isVisible;
    });
  });
};
const getFilteredIndices = createSelector(
  getIndices,
  getAllIds,
  getTableState,
  (indices, allIds, tableState) => {
    let indexArray = allIds.map(indexName => indices[indexName]);
    indexArray = filterByToggles(indexArray, tableState.toggleNameToVisibleMap);
    const systemFilteredIndexes = tableState.showSystemIndices
      ? indexArray
      : indexArray.filter(index => !(index.name + '').startsWith('.'));
    const filter = tableState.filter || EuiSearchBar.Query.MATCH_ALL;
    return EuiSearchBar.Query.execute(filter, systemFilteredIndexes, defaultFilterFields);
  }
);
export const getTotalItems = createSelector(
  getFilteredIndices,
  (filteredIndices) => {
    return Object.keys(filteredIndices).length;
  }
);

export const getPager = createSelector(
  getTableState,
  getTotalItems,
  ({ currentPage, pageSize }, totalItems) => {
    return new Pager(totalItems, pageSize, currentPage);
  }
);
export const getPageOfIndices = createSelector(
  getFilteredIndices,
  getTableState,
  getRowStatuses,
  getPager,
  (filteredIndices, tableState, rowStatuses, pager) => {
    const sortedIndexes = sortTable(filteredIndices, tableState.sortField, tableState.isSortAscending);
    const { firstItemIndex, lastItemIndex } = pager;
    const pagedIndexes = sortedIndexes.slice(firstItemIndex, lastItemIndex + 1);
    return pagedIndexes.map(index => {
      const status =
        indexStatusLabels[rowStatuses[index.name]] || // user friendly version of row status
        rowStatuses[index.name] ||                    // row status
        indexStatusLabels[index.status] ||            // user friendly version of index status
        index.status;                                 // index status
      return {
        ...index,
        status
      };
    });
  }
);

export const getIndexNamesForCurrentPage = createSelector(
  getPageOfIndices,
  (pageOfIndices) => {
    return pageOfIndices.map(index => index.name);
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

export const showSystemIndices = createSelector(
  getTableState,
  ({ showSystemIndices }) => showSystemIndices
);

export const isSortAscending = createSelector(
  getTableState,
  ({ isSortAscending }) => isSortAscending
);

export const getSortField = createSelector(
  getTableState,
  ({ sortField }) => sortField
);
