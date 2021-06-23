/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Dispatch } from 'react';
import { Rule, FilterOptions, PaginationOptions } from '../types';
import { RulesTableAction, LoadingRuleAction } from './rules_table_reducer';

export interface RulesTableFacade {
  setRules(newRules: Rule[], newPagination: Partial<PaginationOptions>): void;
  updateRules(rules: Rule[]): void;
  updateOptions(filter: Partial<FilterOptions>, pagination: Partial<PaginationOptions>): void;
  actionStarted(actionType: LoadingRuleAction, ruleIds: string[]): void;
  actionStopped(): void;
  setShowIdleModal(show: boolean): void;
  setLastRefreshDate(): void;
  setAutoRefreshOn(on: boolean): void;
  setIsRefreshing(isRefreshing: boolean): void;
}

export const createRulesTableFacade = (dispatch: Dispatch<RulesTableAction>): RulesTableFacade => {
  return {
    setRules: (newRules: Rule[], newPagination: Partial<PaginationOptions>) => {
      dispatch({
        type: 'setRules',
        rules: newRules,
        pagination: newPagination,
      });
    },

    updateRules: (rules: Rule[]) => {
      dispatch({
        type: 'updateRules',
        rules,
      });
    },

    updateOptions: (filter: Partial<FilterOptions>, pagination: Partial<PaginationOptions>) => {
      dispatch({
        type: 'updateFilterOptions',
        filterOptions: filter,
        pagination,
      });
    },

    actionStarted: (actionType: LoadingRuleAction, ruleIds: string[]) => {
      dispatch({
        type: 'loadingRuleIds',
        actionType,
        ids: ruleIds,
      });
    },

    actionStopped: () => {
      dispatch({
        type: 'loadingRuleIds',
        actionType: null,
        ids: [],
      });
    },

    setShowIdleModal: (show: boolean) => {
      dispatch({
        type: 'setShowIdleModal',
        show,
      });
    },

    setLastRefreshDate: () => {
      dispatch({
        type: 'setLastRefreshDate',
      });
    },

    setAutoRefreshOn: (on: boolean) => {
      dispatch({
        type: 'setAutoRefreshOn',
        on,
      });
    },

    setIsRefreshing: (isRefreshing: boolean) => {
      dispatch({
        type: 'setIsRefreshing',
        isRefreshing,
      });
    },
  };
};
