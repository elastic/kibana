/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoverageOverviewFilter,
  CoverageOverviewRuleActivity,
  CoverageOverviewRuleSource,
} from '../../../../../common/api/detection_engine';

export interface CoverageOverviewDashboardState {
  showExpandedCells: boolean;
  filter: CoverageOverviewFilter;
}

export interface CoverageOverviewDashboardContextType {
  state: CoverageOverviewDashboardState;
  dispatch: React.Dispatch<Action>;
}

export const initialState: CoverageOverviewDashboardState = {
  showExpandedCells: false,
  filter: {},
};

export type Action =
  | {
      type: 'setShowExpandedCells';
      value: boolean;
    }
  | {
      type: 'setRuleStatusFilter';
      value: CoverageOverviewRuleActivity[];
    }
  | {
      type: 'setRuleTypeFilter';
      value: CoverageOverviewRuleSource[];
    }
  | {
      type: 'setRuleSearchFilter';
      value: string;
    };

export const createCoverageOverviewDashboardReducer =
  () =>
  (state: CoverageOverviewDashboardState, action: Action): CoverageOverviewDashboardState => {
    switch (action.type) {
      case 'setShowExpandedCells': {
        const { value } = action;
        return { ...state, showExpandedCells: value };
      }
      case 'setRuleStatusFilter': {
        const { value } = action;
        if (value.length === 0 || value.length === 2) {
          const updatedFilter = { ...state.filter, activity: undefined };
          return { ...state, filter: updatedFilter };
        }
        const updatedFilter = { ...state.filter, activity: value };
        return { ...state, filter: updatedFilter };
      }
      case 'setRuleTypeFilter': {
        const { value } = action;
        const updatedFilter = { ...state.filter, source: value.length !== 0 ? value : undefined };
        return { ...state, filter: updatedFilter };
      }
      case 'setRuleSearchFilter': {
        const { value } = action;
        const updatedFilter = {
          ...state.filter,
          search_term: value.length !== 0 ? value : undefined,
        };
        return { ...state, filter: updatedFilter };
      }
      default:
        return state;
    }
  };
