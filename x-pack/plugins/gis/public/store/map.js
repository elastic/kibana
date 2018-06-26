/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SET_SELECTED_LAYER, UPDATE_LAYER_ORDER, ADD_TMS_SOURCE,
  ADD_VECTOR_SOURCE, ADD_VECTOR_LAYER, ADD_TILE_LAYER
} from "../actions/map_actions";

const INITIAL_STATE = {
  selectedLayer: null,
  layerList: [],
  vectorSources: [],
  tmsSources: []
};

// Reducer
export function map(state = INITIAL_STATE, action) {
  switch (action.type) {
    case ADD_TMS_SOURCE:
      return { ...state, tmsSources: [...state.tmsSources, action.tms ] };
    case ADD_VECTOR_SOURCE:
      return { ...state, vectorSources: [...state.vectorSources, action.vectorSource ] };
    case SET_SELECTED_LAYER:
      return { ...state, selectedLayer: state.layerList.find(
        layer => layer.id === action.selectedLayer) };
    case UPDATE_LAYER_ORDER:
      return { ...state, layerList: action.newLayerOrder.map(
        layerNumber => state.layerList[layerNumber]
      ) };
    case ADD_VECTOR_LAYER:
    case ADD_TILE_LAYER:
      return { ...state, ...{ layerList: [ ...state.layerList, action.layer ] } };
    default:
      return state;
  }
}

