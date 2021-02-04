/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import { EuiBasicTable } from '@elastic/eui';
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
  exportRuleIds: string[];
  lastUpdated: number;
  isRefreshOn: boolean;
  showIdleModal: boolean;
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
  | { type: 'exportRuleIds'; ids: string[] }
  | { type: 'setLastRefreshDate' }
  | { type: 'setAutoRefreshOn'; on: boolean }
  | { type: 'setShowIdleModal'; show: boolean }
  | { type: 'failure' };

export const createRulesTableReducer = (
  tableRef: React.MutableRefObject<EuiBasicTable<unknown> | undefined>
) => {
  const rulesTableReducer = (state: RulesTableState, action: RulesTableAction): RulesTableState => {
    switch (action.type) {
      case 'setRules': {
        if (
          tableRef != null &&
          tableRef.current != null &&
          tableRef.current.changeSelection != null
        ) {
          // for future devs: eui basic table is not giving us a prop to set the value, so
          // we are using the ref in setTimeout to reset on the next loop so that we
          // do not get a warning telling us we are trying to update during a render
          window.setTimeout(() => tableRef?.current?.changeSelection([]), 0);
        }

        return {
          ...state,
          rules: action.rules,
          selectedRuleIds: [],
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
          selectedRuleIds: action.ids,
        };
      }
      case 'exportRuleIds': {
        return {
          ...state,
          loadingRuleIds: action.ids,
          loadingRulesAction: 'export',
          exportRuleIds: action.ids,
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

  return rulesTableReducer;
};
