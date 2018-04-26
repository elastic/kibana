/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const SORTING_CHANGE = 'SORTING_CHANGE';

const INITIAL_STATE = {
  transaction: {
    key: 'impact',
    descending: true
  },
  service: {
    key: 'serviceName',
    descending: false
  }
};

const INITIALLY_DESCENDING = {
  transaction: ['name'],
  service: ['serviceName']
};

function getSorting(state, action) {
  const isInitiallyDescending = INITIALLY_DESCENDING[action.section].includes(
    action.key
  );
  const descending =
    state.key === action.key ? !state.descending : isInitiallyDescending;
  return { ...state, key: action.key, descending };
}

export default function sorting(state = INITIAL_STATE, action) {
  switch (action.type) {
    case SORTING_CHANGE: {
      return {
        ...state,
        [action.section]: getSorting(state[action.section], action)
      };
    }
    default:
      return state;
  }
}

export const changeTransactionSorting = key => ({
  type: SORTING_CHANGE,
  key,
  section: 'transaction'
});

export const changeServiceSorting = key => ({
  type: SORTING_CHANGE,
  key,
  section: 'service'
});
