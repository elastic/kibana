/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ADD_LAYER, SET_SELECTED_LAYER, UPDATE_LAYER_ORDER } from "../actions/map_actions";

const INITIAL_STATE = {
  selectedLayer: null,
  layerList: []
};

// Reducer
export function map(state = INITIAL_STATE, action) {
  switch (action.type) {
    case SET_SELECTED_LAYER:
      return { ...state, selectedLayer: action.selectedLayer };
    case UPDATE_LAYER_ORDER:
      return { ...state, layerList: action.newLayerOrder.map(
        layerNumber => state.layerList[layerNumber]
      ) };
    case ADD_LAYER:
      return { ...state, ...{ layerList: [ ...state.layerList, action.layer ] } };
    default:
      return state;
  }
}
