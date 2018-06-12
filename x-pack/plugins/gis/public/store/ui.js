/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export const TOGGLE_FLYOUT = 'TOGGLE_FLYOUT';

const INITIAL_STATE = {
  flyoutOpen: false
};

function ui(state = INITIAL_STATE, action) {
  switch (action.type) {
    case TOGGLE_FLYOUT:
      return { ...state, flyoutOpen: !state.flyoutOpen };
    default:
      return state;
  }
}

// Actions
export function toggleFlyout() {
  return {
    type: TOGGLE_FLYOUT
  };
}

// Selectors
export const getFlyoutOpen = ({ ui }) => ui && ui.flyoutOpen;

export default ui;
