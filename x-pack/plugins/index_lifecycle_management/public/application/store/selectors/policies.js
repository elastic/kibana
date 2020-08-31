/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { Pager } from '@elastic/eui';

import { filterItems, sortTable } from '../../services';

export const getPolicies = (state) => state.policies.policies;
export const getPolicyFilter = (state) => state.policies.filter;
export const getPolicySort = (state) => state.policies.sort;
export const getPolicyCurrentPage = (state) => state.policies.currentPage;
export const getPolicyPageSize = (state) => state.policies.pageSize;
export const isPolicyListLoaded = (state) => state.policies.isLoaded;

const getFilteredPolicies = createSelector(getPolicies, getPolicyFilter, (policies, filter) => {
  return filterItems(['name'], filter, policies);
});
export const getTotalPolicies = createSelector(getFilteredPolicies, (filteredPolicies) => {
  return filteredPolicies.length;
});
export const getPolicyPager = createSelector(
  getPolicyCurrentPage,
  getPolicyPageSize,
  getTotalPolicies,
  (currentPage, pageSize, totalPolicies) => {
    return new Pager(totalPolicies, pageSize, currentPage);
  }
);
export const getPageOfPolicies = createSelector(
  getFilteredPolicies,
  getPolicySort,
  getPolicyPager,
  (filteredPolicies, sort, pager) => {
    const sortedPolicies = sortTable(filteredPolicies, sort.sortField, sort.isSortAscending);
    const { firstItemIndex, lastItemIndex } = pager;
    return sortedPolicies.slice(firstItemIndex, lastItemIndex + 1);
  }
);
