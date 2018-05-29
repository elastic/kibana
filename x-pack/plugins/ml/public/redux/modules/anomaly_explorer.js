/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const ANOMALY_DATA_CHANGE = 'ANOMALY_DATA_CHANGE';
const TIMERANGE_CHANGE = 'TIMERANGE_CHANGE';

const LOADING_START = 'LOADING_START';
const LOADING_STOP = 'LOADING_STOP';

export const aAnomalyDataChange = (anomalyChartRecords, earliestMs, latestMs) => ({
  type: ANOMALY_DATA_CHANGE,
  anomalyChartRecords,
  earliestMs,
  latestMs
});
export const aTimeRangeChange = (timerange) => ({ type: TIMERANGE_CHANGE, timerange });

export const aLoadingStart = () => ({ type: LOADING_START });
export const aLoadingStop = () => ({ type: LOADING_STOP });

const defaultState = {
  anomalyChartRecords: [],
  checkboxShowChartsVisibility: false,
  earliestMs: null,
  latestMs: null,
  loading: true,
  timeFieldName: 'timestamp'
};

export const anomalyExplorerReducer = (state = defaultState, action) => {
  switch (action.type) {
    case ANOMALY_DATA_CHANGE:
      const { anomalyChartRecords, earliestMs, latestMs } = action;
      return {
        ...state,
        anomalyChartRecords,
        checkboxShowChartsVisibility: (anomalyChartRecords.length > 0),
        earliestMs,
        latestMs
      };

    case TIMERANGE_CHANGE:
      return {
        ...state,
        earliestMs: action.timerange.earliestMs,
        latestMs: action.timerange.latestMs
      };

    case LOADING_START:
      return { ...state, loading: true };

    case LOADING_STOP:
      return { ...state, loading: false };

    default:
      return state;
  }
};
