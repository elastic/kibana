/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createActions } from '../util';

const { actionTypes, actions } = createActions([
  'ANOMALY_DATA_CHANGE',
  'TIME_RANGE_CHANGE',
  'LOADING_START',
  'LOADING_STOP'
]);

export const anomalyExplorerActions = actions;

// default state and reducer
const defaultState = {
  // general
  checkboxShowChartsVisibility: false,
  loading: true,
  timeFieldName: 'timestamp',

  // anomaly charts
  anomalyChartRecords: [],
  earliestMs: null,
  latestMs: null
};

export const anomalyExplorerReducer = (state = defaultState, action) => {
  switch (action.type) {
    case actionTypes.ANOMALY_DATA_CHANGE:
      const { anomalyChartRecords, earliestMs, latestMs } = action.payload;
      return {
        ...state,
        anomalyChartRecords,
        checkboxShowChartsVisibility: (anomalyChartRecords.length > 0),
        earliestMs,
        latestMs
      };

    case actionTypes.TIME_RANGE_CHANGE:
      return {
        ...state,
        earliestMs: action.payload.earliestMs,
        latestMs: action.payload.latestMs
      };

    case actionTypes.LOADING_START:
      return { ...state, loading: true };

    case actionTypes.LOADING_STOP:
      return { ...state, loading: false };

    default:
      return state;
  }
};
