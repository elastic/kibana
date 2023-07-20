/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface State {
  showExpandedCells: boolean;
}

export const initialState: State = {
  showExpandedCells: false,
};

export interface Action {
  type: 'setShowExpandedCells';
  value: boolean;
}

export const createCoverageOverviewDashboardReducer =
  () =>
  (state: State, action: Action): State => {
    switch (action.type) {
      case 'setShowExpandedCells': {
        const { value } = action;
        return { ...state, showExpandedCells: value };
      }
      default:
        return state;
    }
  };
