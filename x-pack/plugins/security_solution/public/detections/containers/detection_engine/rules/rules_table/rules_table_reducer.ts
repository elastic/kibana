/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FilterOptions, PaginationOptions, Rule } from '../types';

export type LoadingRuleAction =
  | 'load'
  | 'duplicate'
  | 'enable'
  | 'disable'
  | 'export'
  | 'delete'
  | null;

export interface RulesTableState {
  rules: Rule[];
  pagination: PaginationOptions;
  filterOptions: FilterOptions;
  loadingRulesAction: LoadingRuleAction;
  loadingRuleIds: string[];
  selectedRuleIds: string[];
  lastUpdated: number;
  isRefreshOn: boolean;
  isRefreshing: boolean;
  showIdleModal: boolean;
  isAllSelected: boolean;
}

export type RulesTableAction =
  | { type: 'setRules'; rules: Rule[]; pagination: Partial<PaginationOptions> }
  | { type: 'updateRules'; rules: Rule[] }
  | {
      type: 'updateFilterOptions';
      filterOptions: Partial<FilterOptions>;
      pagination: Partial<PaginationOptions>;
    }
  | { type: 'loadingRuleIds'; ids: string[]; actionType: LoadingRuleAction }
  | { type: 'selectedRuleIds'; ids: string[] }
  | { type: 'setLastRefreshDate' }
  | { type: 'setAutoRefreshOn'; on: boolean }
  | { type: 'setIsRefreshing'; isRefreshing: boolean }
  | { type: 'setIsAllSelected'; isAllSelected: boolean }
  | { type: 'setShowIdleModal'; show: boolean }
  | { type: 'failure' };

export const rulesTableReducer = (
  state: RulesTableState,
  action: RulesTableAction
): RulesTableState => {
  switch (action.type) {
    case 'setRules': {
      return {
        ...state,
        rules: action.rules,
        selectedRuleIds: state.isAllSelected ? action.rules.map(({ id }) => id) : [],
        loadingRuleIds: [],
        loadingRulesAction: null,
        pagination: {
          ...state.pagination,
          ...action.pagination,
        },
      };
    }
    case 'updateRules': {
      const ruleIds = state.rules.map((r) => r.id);
      const updatedRules = action.rules.reduce((rules, updatedRule) => {
        let newRules = rules;
        if (ruleIds.includes(updatedRule.id)) {
          newRules = newRules.map((r) => (updatedRule.id === r.id ? updatedRule : r));
        } else {
          newRules = [...newRules, updatedRule];
        }
        return newRules;
      }, state.rules);
      const updatedRuleIds = action.rules.map((r) => r.id);
      const newLoadingRuleIds = state.loadingRuleIds.filter((id) => !updatedRuleIds.includes(id));
      return {
        ...state,
        rules: updatedRules,
        loadingRuleIds: newLoadingRuleIds,
        loadingRulesAction: newLoadingRuleIds.length === 0 ? null : state.loadingRulesAction,
      };
    }
    case 'updateFilterOptions': {
      return {
        ...state,
        filterOptions: {
          ...state.filterOptions,
          ...action.filterOptions,
        },
        pagination: {
          ...state.pagination,
          ...action.pagination,
        },
      };
    }
    case 'loadingRuleIds': {
      return {
        ...state,
        loadingRuleIds: action.actionType == null ? [] : [...state.loadingRuleIds, ...action.ids],
        loadingRulesAction: action.actionType,
      };
    }
    case 'selectedRuleIds': {
      return {
        ...state,
        isAllSelected: false,
        selectedRuleIds: action.ids,
      };
    }
    case 'setLastRefreshDate': {
      return {
        ...state,
        lastUpdated: Date.now(),
      };
    }
    case 'setAutoRefreshOn': {
      return {
        ...state,
        isRefreshOn: action.on,
      };
    }
    case 'setIsRefreshing': {
      return {
        ...state,
        isRefreshing: action.isRefreshing,
      };
    }
    case 'setIsAllSelected': {
      const { isAllSelected } = action;
      return {
        ...state,
        isAllSelected,
        selectedRuleIds: isAllSelected ? state.rules.map(({ id }) => id) : [],
      };
    }
    case 'setShowIdleModal': {
      return {
        ...state,
        showIdleModal: action.show,
        isRefreshOn: !action.show,
      };
    }
    case 'failure': {
      return {
        ...state,
        rules: [],
      };
    }
    default: {
      return state;
    }
  }
};
