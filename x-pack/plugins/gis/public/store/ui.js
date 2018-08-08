/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SET_SELECTED_LAYER } from "../actions/map_actions";

export const UPDATE_FLYOUT = 'UPDATE_FLYOUT';

export const FLYOUT_STATE = {
  NONE: 'NONE',
  LAYER_PANEL: 'LAYER_PANEL',
  ADD_LAYER_WIZARD: 'ADD_LAYER_WIZARD'
};
const INITIAL_STATE = {
  flyoutDisplay: FLYOUT_STATE.NONE,
  selectedLayer: null
};

// Reducer
function ui(state = INITIAL_STATE, action) {
  switch (action.type) {
    case UPDATE_FLYOUT:
      return { ...state, flyoutDisplay: action.display };
    case SET_SELECTED_LAYER:
      return { ...state, selectedLayer: action.selectedLayer };
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
// Selectors
export const getFlyoutDisplay = ({ ui }) => ui && ui.flyoutDisplay
  || INITIAL_STATE.flyoutDisplay;

export default ui;
