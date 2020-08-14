/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { handleActions } from 'redux-actions';
import {
  fetchedPolicies,
  setSelectedPolicy,
  policyFilterChanged,
  policyPageChanged,
  policyPageSizeChanged,
  policySortChanged,
} from '../actions';
import { PHASE_HOT, PHASE_WARM, PHASE_COLD, PHASE_DELETE } from '../../constants';

import {
  defaultColdPhase,
  defaultDeletePhase,
  defaultHotPhase,
  defaultWarmPhase,
} from '../defaults';
import { deserializePolicy } from '../../services/policies/policy_serialization';
export const defaultPolicy = {
  name: '',
  saveAsNew: true,
  isNew: true,
  phases: {
    [PHASE_HOT]: defaultHotPhase,
    [PHASE_WARM]: defaultWarmPhase,
    [PHASE_COLD]: defaultColdPhase,
    [PHASE_DELETE]: defaultDeletePhase,
  },
};

const defaultState = {
  isLoading: false,
  isLoaded: false,
  originalPolicyName: undefined,
  selectedPolicySet: false,
  selectedPolicy: defaultPolicy,
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
    [setSelectedPolicy](state, { payload: selectedPolicy }) {
      if (!selectedPolicy) {
        return {
          ...state,
          selectedPolicy: defaultPolicy,
          selectedPolicySet: true,
        };
      }

      return {
        ...state,
        originalPolicyName: selectedPolicy.name,
        selectedPolicySet: true,
        selectedPolicy: {
          ...defaultPolicy,
          ...deserializePolicy(selectedPolicy),
        },
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
