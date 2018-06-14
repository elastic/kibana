/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
const UPDATE_FLYOUT = 'UPDATE_FLYOUT';
const SET_SELECTED_LAYER = 'SET_SELECTED_LAYER';
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
    display,
    type: UPDATE_FLYOUT
  };
}
export function setSelectedLayer(layer) {
  return {
    type: SET_SELECTED_LAYER,
    selectedLayer: layer
  };
}

// Selectors
export const getFlyoutDisplay = ({ ui }) => ui && ui.flyoutDisplay
  || INITIAL_STATE.flyoutDisplay;
export const getSelectedLayer = ({ ui }) => ui && ui.selectedLayer
  || INITIAL_STATE.selectedLayer;

export default ui;
