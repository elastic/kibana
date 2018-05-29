/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const LOADING_START = 'LOADING_START';
const LOADING_STOP = 'LOADING_STOP';

export const aLoadingStart = () => ({ type: LOADING_START });
export const aLoadingStop = () => ({ type: LOADING_STOP });

const defaultState = {
  loading: true,
  timeFieldName: 'timestamp'
};

export const anomalyExplorerReducer = (state = defaultState, action) => {
  console.warn('anomalyExplorerReducer', action);
  switch (action.type) {
    case LOADING_START:
      return { ...state, loading: true };

    case LOADING_STOP:
      return { ...state, loading: false };

    default:
      return state;
  }
};
