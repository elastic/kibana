/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { LAYER_DATA_LOAD_STARTED, LAYER_DATA_LOAD_ENDED, LAYER_DATA_LOAD_ERROR }
  from '../actions/store_actions';

export const UPDATE_FLYOUT = 'UPDATE_FLYOUT';
export const UPDATE_IS_DARK_THEME = 'UPDATE_IS_DARK_THEME';
export const FLYOUT_STATE = {
  NONE: 'NONE',
  LAYER_PANEL: 'LAYER_PANEL',
  ADD_LAYER_WIZARD: 'ADD_LAYER_WIZARD'
};
export const LAYER_LOAD_STATE = {
  loading: 'loading',
  complete: 'complete',
  error: 'error',
  inactive: 'inactive'
};

const INITIAL_STATE = {
  flyoutDisplay: FLYOUT_STATE.NONE,
  isDarkTheme: true,
  layerLoadStatus: LAYER_LOAD_STATE.inactive
};

// Reducer
function ui(state = INITIAL_STATE, action) {
  switch (action.type) {
    case LAYER_DATA_LOAD_STARTED:
      return { ...state, layerLoadStatus: LAYER_LOAD_STATE.loading };
    case LAYER_DATA_LOAD_ENDED:
      return { ...state, layerLoadStatus: LAYER_LOAD_STATE.complete };
    case LAYER_DATA_LOAD_ERROR:
      return { ...state, layerLoadStatus: LAYER_LOAD_STATE.error };
    case UPDATE_FLYOUT:
      return { ...state, flyoutDisplay: action.display };
    case UPDATE_IS_DARK_THEME:
      return { ...state, isDarkTheme: action.isDarkTheme };
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
export function updateIsDarkTheme(isDarkTheme) {
  return {
    type: UPDATE_IS_DARK_THEME,
    isDarkTheme
  };
}

// Selectors
export const getFlyoutDisplay = ({ ui }) => ui && ui.flyoutDisplay
  || INITIAL_STATE.flyoutDisplay;
export const getIsDarkTheme = ({ ui }) => _.get(ui, 'isDarkTheme', INITIAL_STATE.isDarkTheme);

export default ui;
