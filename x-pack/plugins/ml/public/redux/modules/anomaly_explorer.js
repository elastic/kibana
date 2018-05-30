/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createEnum } from '../util';

// action names
export const actionType = createEnum([
  'ANOMALY_DATA_CHANGE',
  'DRAG_SELECT_START',
  'DRAG_SELECT_UPDATE',
  'DRAG_SELECT_FINISH',
  'TIMERANGE_CHANGE',
  'LOADING_START',
  'LOADING_STOP'
]);

// action creators
const anomalyDataChange = (anomalyChartRecords, earliestMs, latestMs) => ({
  type: actionType.ANOMALY_DATA_CHANGE,
  anomalyChartRecords,
  earliestMs,
  latestMs
});

const dragSelectStart = () => ({ type: actionType.DRAG_SELECT_START });
const dragSelectUpdate = () => ({ type: actionType.DRAG_SELECT_UPDATE });
const dragSelectFinish = (elements) => ({
  type: actionType.DRAG_SELECT_FINISH,
  elements
});

const timeRangeChange = (timerange) => ({
  type: actionType.TIMERANGE_CHANGE,
  timerange
});

const loadingStart = () => ({ type: actionType.LOADING_START });
const loadingStop = () => ({ type: actionType.LOADING_STOP });

export const anomalyExplorerActions = {
  anomalyDataChange,
  dragSelectStart,
  dragSelectUpdate,
  dragSelectFinish,
  timeRangeChange,
  loadingStart,
  loadingStop
};

// default state and reducer
const ALLOW_CELL_RANGE_SELECTION = true;
const defaultState = {
  // general
  checkboxShowChartsVisibility: false,
  loading: true,
  timeFieldName: 'timestamp',

  // anomaly charts
  anomalyChartRecords: [],
  earliestMs: null,
  latestMs: null,

  // dragSelect
  cellMouseoverActive: true,
  disableDragSelectOnMouseLeave: true,
  dragging: false,
  selectedElements: []
};

export const anomalyExplorerReducer = (state = defaultState, action) => {
  console.warn('action.type', action.type);
  switch (action.type) {
    case actionType.ANOMALY_DATA_CHANGE:
      const { anomalyChartRecords, earliestMs, latestMs } = action;
      return {
        ...state,
        anomalyChartRecords,
        checkboxShowChartsVisibility: (anomalyChartRecords.length > 0),
        earliestMs,
        latestMs
      };

    case actionType.DRAG_SELECT_UPDATE:
      if (!ALLOW_CELL_RANGE_SELECTION) {
        return state;
      }
      return {
        ...state,
        cellMouseoverActive: false,
        disableDragSelectOnMouseLeave: false,
        dragging: true
      };

    case actionType.DRAG_SELECT_FINISH:
      let elements = action.elements;
      if (elements.length > 1 && !ALLOW_CELL_RANGE_SELECTION) {
        elements = [elements[0]];
      }

      if (elements.length === 0) {
        return state;
      }
      return {
        ...state,
        cellMouseoverActive: true,
        disableDragSelectOnMouseLeave: true,
        dragging: false,
        selectedElements: action.elements
      };

    case actionType.TIMERANGE_CHANGE:
      return {
        ...state,
        earliestMs: action.timerange.earliestMs,
        latestMs: action.timerange.latestMs
      };

    case actionType.LOADING_START:
      return { ...state, loading: true };

    case actionType.LOADING_STOP:
      return { ...state, loading: false };

    default:
      return state;
  }
};
