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
import type { CoverageOverviewDashboard } from '../../../rule_management/model/coverage_overview/dashboard';

export interface CoverageOverviewDashboardState {
  showExpandedCells: boolean;
  filter: CoverageOverviewFilter;
  isLoading: boolean;
  data: CoverageOverviewDashboard | undefined;
}

export type Action =
  | {
      type: 'setShowExpandedCells';
      value: boolean;
    }
  | {
      type: 'setRuleActivityFilter';
      value: CoverageOverviewRuleActivity[];
    }
  | {
      type: 'setRuleSourceFilter';
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
      case 'setRuleActivityFilter': {
        const { value } = action;
        if (value.length === 0 || value.length === 2) {
          const updatedFilter = { ...state.filter, activity: undefined };
          return { ...state, filter: updatedFilter };
        }
        const updatedFilter = { ...state.filter, activity: value };
        return { ...state, filter: updatedFilter };
      }
      case 'setRuleSourceFilter': {
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
