/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const UPDATE_FLYOUT = 'UPDATE_FLYOUT';
import { CHANGE_BANNER_VISIBLE, CHANGE_NAV_EXPANDED } from '../actions/ui_actions';

export const FLYOUT_STATE = {
  NONE: 'NONE',
  LAYER_PANEL: 'LAYER_PANEL',
  ADD_LAYER_WIZARD: 'ADD_LAYER_WIZARD'
};

const INITIAL_STATE = {
  flyoutDisplay: FLYOUT_STATE.NONE,
  bannerVisible: false, // TODO: Hydrate init values from passed state
  navExpanded: false
};

// Reducer
function ui(state = INITIAL_STATE, action) {
  switch (action.type) {
    case UPDATE_FLYOUT:
      return { ...state, flyoutDisplay: action.display };
    case CHANGE_BANNER_VISIBLE:
      return { ...state, bannerVisible: action.visible };
    case CHANGE_NAV_EXPANDED:
      return { ...state, navExpanded: action.expanded };
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
