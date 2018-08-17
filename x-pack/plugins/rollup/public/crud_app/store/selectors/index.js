/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Pager } from '@elastic/eui';

import { createSelector } from 'reselect';
import { filterItems, sortTable } from '../../services';

export const getDetailPanelType = (state) => state.detailPanel.panelType;
export const isDetailPanelOpen = (state) => !!getDetailPanelType(state);
export const getDetailPanelJob = (state) => state.detailPanel.job;

export const getJobs = (state) => state.jobs.byId;
export const getJobByJobName = (state, name) => getJobs(state)[name];
export const getFilteredIds = (state) => state.jobs.filteredIds;
export const getTableState = (state) => state.tableState;

export const getJobStatusByJobName = (state, jobName) => {
  const jobs = getJobs(state);
  const { status } = jobs[jobName] || {};
  return status;
};

const getFilteredJobs = createSelector(
  getJobs,
  getTableState,
  (jobs, tableState) => {
    const jobArray = Object.keys(jobs).map(jobName => jobs[jobName]);
    return filterItems(['id', 'indexPattern', 'rollupIndex'], tableState.filter, jobArray);
  }
);

export const getTotalItems = createSelector(
  getFilteredJobs,
  (filteredJobs) => {
    return Object.keys(filteredJobs).length;
  }
);

export const getPager = createSelector(
  getTableState,
  getTotalItems,
  ({ currentPage, pageSize }, totalItems) => {
    return new Pager(totalItems, pageSize, currentPage);
  }
);

export const getPageOfJobs = createSelector(
  getFilteredJobs,
  getTableState,
  getPager,
  (filteredJobs, tableState, pager) => {
    const sortedIndexes = sortTable(filteredJobs, tableState.sortField, tableState.isSortAscending);
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
