/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
const SET_SELECTED_LAYER = 'SET_SELECTED_LAYER';
const INITIAL_STATE = {
  selectedLayer: null,
  layerList: []
};

// Reducer
function map(state = INITIAL_STATE, action) {
  switch (action.type) {
    case SET_SELECTED_LAYER:
      return { ...state, selectedLayer: action.selectedLayer };
    default:
      return state;
  }
}

// Actions
export function setSelectedLayer(layer) {
  return {
    type: SET_SELECTED_LAYER,
    selectedLayer: layer
  };
}

// Selectors
export const getSelectedLayer = ({ map }) => map && map.selectedLayer
  || INITIAL_STATE.selectedLayer;

export default map;
