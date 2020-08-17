/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import {
  fetchedPolicies,
  policyFilterChanged,
  policyPageChanged,
  policyPageSizeChanged,
  policySortChanged,
} from '../actions';

const defaultState = {
  isLoading: false,
  isLoaded: false,
  originalPolicyName: undefined,
  selectedPolicySet: false,
  policies: [],
  sort: {
    sortField: 'name',
    isSortAscending: true,
  },
  pageSize: 10,
  currentPage: 0,
  filter: '',
};

export const policies = handleActions(
  {
    [fetchedPolicies](state, { payload: policies }) {
      return {
        ...state,
        isLoading: false,
        isLoaded: true,
        policies,
      };
    },
    [policyFilterChanged](state, action) {
      const { filter } = action.payload;
      return {
        ...state,
        filter,
        currentPage: 0,
      };
    },
    [policySortChanged](state, action) {
      const { sortField, isSortAscending } = action.payload;

      return {
        ...state,
        sort: {
          sortField,
          isSortAscending,
        },
      };
    },
    [policyPageChanged](state, action) {
      const { pageNumber } = action.payload;
      return {
        ...state,
        currentPage: pageNumber,
      };
    },
    [policyPageSizeChanged](state, action) {
      const { pageSize } = action.payload;
      return {
        ...state,
        pageSize,
      };
    },
  },
  defaultState
);
