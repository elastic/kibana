/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SET_SELECTED_LAYER, UPDATE_LAYER_ORDER,
  ADD_LAYER, REMOVE_LAYER, PROMOTE_TEMPORARY_LAYERS,
  CLEAR_TEMPORARY_LAYERS, LAYER_LOADING, TOGGLE_LAYER_VISIBLE
} from "../actions/store_actions";
import { UPDATE_LAYER_STYLE } from '../actions/style_actions';

const updateLayerInList = (()=> {
  const getLayerIndex = (list, layerId) => list.findIndex(({ id }) => layerId === id);
  return (state, id, attribute, newValue) => {
    const { layerList } = state;
    const layerIdx = getLayerIndex(layerList, id);
    console.log(state, id, attribute, newValue, layerIdx);
    // Update layer w/ new value. If no value provided, toggle boolean value
    const updatedLayer = { ...layerList[layerIdx], [ attribute ]: newValue || !layerList[layerIdx][attribute] };
    const updatedList = [...layerList.slice(0, layerIdx), updatedLayer,
      ...layerList.slice(layerIdx + 1) ];
    console.log(updatedList);
    return { ...state, layerList: updatedList };
  };
})();

const INITIAL_STATE = {
  mapConstants: {
    mapCenter: [37.41, 8.82],
    mapInitZoomLevel: 4
  },
  swapLayer: null,
  selectedLayer: null,
  layerList: [],
  layerLoading: false
};

export function map(state = INITIAL_STATE, action) {
  switch (action.type) {
    case SET_SELECTED_LAYER:
      return { ...state, selectedLayer: state.layerList.find(layer => layer.id === action.selectedLayer) };
    case UPDATE_LAYER_ORDER:
      return { ...state, layerList: action.newLayerOrder.map(layerNumber => state.layerList[layerNumber]) };
    case ADD_LAYER:
      let newLayerlist;
      if (
        action.position === -1 ||
        action.position > state.layerList.length
      ) {
        newLayerlist = [ ...state.layerList, action.layer ];
      } else {
        state.layerList.splice(action.position, 0, action.layer);
        newLayerlist = state.layerList.slice();
      }
      return { ...state, ...{ layerList: newLayerlist } };

    case REMOVE_LAYER:
      return { ...state, ...{ layerList: [ ...state.layerList.filter(
        ({ name }) => name !== action.layerName) ] } };
    //TODO: Handle more than one
    case PROMOTE_TEMPORARY_LAYERS:
      const tempLayer = state.layerList.find(({ temporary }) => temporary);
      return tempLayer
        ? updateLayerInList(state, tempLayer.id, 'temporary', false)
        : state;
    case CLEAR_TEMPORARY_LAYERS:
      return { ...state, layerList: [ ...state.layerList.filter(
        ({ temporary }) => !temporary) ] };
    case LAYER_LOADING:
      return { ...state, layerLoading: action.loadingBool };
    // TODO: Simplify cases below
    case TOGGLE_LAYER_VISIBLE:
      return updateLayerInList(state, action.layerId, 'visible');
    case UPDATE_LAYER_STYLE:
      return updateLayerInList(state, state.selectedLayer.id, 'style', action.style);
    default:
      return state;
  }
}
