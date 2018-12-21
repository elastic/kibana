/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { PROMOTE_TEMPORARY_LAYERS, LAYER_DATA_LOAD_ERROR }
  from '../actions/store_actions';
import { RESET_LAYER_LOAD } from '../actions/ui_actions';
import { timeService } from '../kibana_services';

export const UPDATE_FLYOUT = 'UPDATE_FLYOUT';
export const CLOSE_SET_VIEW = 'CLOSE_SET_VIEW';
export const OPEN_SET_VIEW = 'OPEN_SET_VIEW';
export const UPDATE_IS_DARK_THEME = 'UPDATE_IS_DARK_THEME';
export const SET_REFRESH = 'SET_REFRESH';
export const FLYOUT_STATE = {
  NONE: 'NONE',
  LAYER_PANEL: 'LAYER_PANEL',
  ADD_LAYER_WIZARD: 'ADD_LAYER_WIZARD'
};
export const LAYER_LOAD_STATE = {
  complete: 'complete',
  error: 'error',
  inactive: 'inactive'
};

const INITIAL_STATE = {
  flyoutDisplay: FLYOUT_STATE.NONE,
  isDarkTheme: false,
  refresh: null,
  layerLoad: {
    status: LAYER_LOAD_STATE.inactive,
    time: Date()
  }
};

// Reducer
function ui(state = INITIAL_STATE, action) {
  switch (action.type) {
    case PROMOTE_TEMPORARY_LAYERS:
      return { ...state, layerLoad: { status: LAYER_LOAD_STATE.complete,
        time: Date() } };
    case LAYER_DATA_LOAD_ERROR:
      return { ...state, layerLoad: { status: LAYER_LOAD_STATE.error,
        time: Date() } };
    case RESET_LAYER_LOAD:
      return { ...state, layerLoad: { status: LAYER_LOAD_STATE.inactive,
        time: Date() } };
    case UPDATE_FLYOUT:
      return { ...state, flyoutDisplay: action.display };
    case UPDATE_IS_DARK_THEME:
      return { ...state, isDarkTheme: action.isDarkTheme };
    case CLOSE_SET_VIEW:
      return { ...state, isSetViewOpen: false };
    case OPEN_SET_VIEW:
      return { ...state, isSetViewOpen: true };
    case SET_REFRESH:
      const { isPaused, interval } = action;
      return { ...state, refresh: { isPaused, interval } };
    default:
      return state;
  }
}

// Actions
export function updateFlyout(display) {
  return {
    type: UPDATE_FLYOUT,
    display
  };
}
export function closeSetView() {
  return {
    type: CLOSE_SET_VIEW,
  };
}
export function openSetView() {
  return {
    type: OPEN_SET_VIEW,
  };
}
export function updateIsDarkTheme(isDarkTheme) {
  return {
    type: UPDATE_IS_DARK_THEME,
    isDarkTheme
  };
}
export function setRefresh({ isPaused, interval }) {
  return async (dispatch) => {
    dispatch({
      type: SET_REFRESH,
      isPaused,
      interval,
    });

    // Update Kibana global refresh
    const kbnRefresh = timeService.getRefreshInterval();
    if (isPaused !== kbnRefresh.pause || interval !== kbnRefresh.value) {
      timeService.setRefreshInterval({
        pause: isPaused,
        value: interval,
      });
    }
  };
}

// Selectors
export const getFlyoutDisplay = ({ ui }) => ui && ui.flyoutDisplay
  || INITIAL_STATE.flyoutDisplay;
export const getIsDarkTheme = ({ ui }) => _.get(ui, 'isDarkTheme', INITIAL_STATE.isDarkTheme);
export const getRefresh = ({ ui }) => ui.refresh;
export const getIsSetViewOpen = ({ ui }) => _.get(ui, 'isSetViewOpen', false);

export default ui;
