/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SET_SELECTED_LAYER, UPDATE_LAYER_ORDER, LAYER_DATA_LOAD_STARTED,
  ADD_LAYER, REMOVE_LAYER, PROMOTE_TEMPORARY_LAYERS,
  CLEAR_TEMPORARY_LAYERS, TOGGLE_LAYER_VISIBLE, MAP_EXTENT_CHANGED, LAYER_DATA_LOAD_ENDED, REPLACE_LAYERLIST
} from "../actions/store_actions";
import { UPDATE_LAYER_STYLE, PROMOTE_TEMPORARY_STYLES, CLEAR_TEMPORARY_STYLES }
  from '../actions/style_actions';

const getLayerIndex = (list, layerId) => list.findIndex(({ id }) => layerId === id);

const updateLayerInList = (state, id, attribute, newValue) => {
  const { layerList } = state;
  const layerIdx = getLayerIndex(layerList, id);
  const updatedLayer = {
    ...layerList[layerIdx],
    // Update layer w/ new value. If no value provided, toggle boolean value
    [attribute]: newValue || !layerList[layerIdx][attribute]
  };
  const updatedList = [
    ...layerList.slice(0, layerIdx),
    updatedLayer,
    ...layerList.slice(layerIdx + 1)
  ];
  return { ...state, layerList: updatedList };
};

const INITIAL_STATE = {
  mapState: {
    zoom: 4,
    center: [-100.41, 32.82],
    extent: null
  },
  selectedLayerId: null,
  layerList: []
};

export function map(state = INITIAL_STATE, action) {
  //todo throw actions with actual objects so this doesn't get so cluttered
  switch (action.type) {
    case REPLACE_LAYERLIST:
      return { ...state, layerList: [ ...action.layerList] };
    case LAYER_DATA_LOAD_STARTED:
      return updateWithDataRequest({ ...state, ...action.initLoadState }, action);
    case LAYER_DATA_LOAD_ENDED:
      return updateWithDataResponse(state, action);
    case MAP_EXTENT_CHANGED:
      const newMapState = {
        center: action.mapState.center,
        zoom: action.mapState.zoom,
        extent: action.mapState.extent
      };
      return { ...state, mapState: newMapState };
    case SET_SELECTED_LAYER:
      const match = state.layerList.find(layer => layer.id === action.selectedLayerId);
      return { ...state, selectedLayerId: match ? action.selectedLayerId : null };
    case UPDATE_LAYER_ORDER:
      return { ...state, layerList: action.newLayerOrder.map(layerNumber => state.layerList[layerNumber]) };
    case ADD_LAYER:
      // Remove temporary layers (if any)
      const preAddLayerList = action.layer.temporary ? state.layerList.filter(
        ({ temporary }) => !temporary) : state.layerList;
      let postAddLayerList;
      if (
        action.position === -1 ||
        action.position > state.layerList.length
      ) {
        postAddLayerList = [...preAddLayerList, action.layer];
      } else {
        state.layerList.splice(action.position, 0, action.layer);
        postAddLayerList = state.layerList.slice();
      }
      return { ...state, layerList: postAddLayerList };
    case REMOVE_LAYER:
      const removeId = action.id || state.selectedLayerId;
      return {
        ...state, layerList: [...state.layerList.filter(
          ({ id }) => id !== removeId)]
      };
    //TODO: Handle more than one
    case PROMOTE_TEMPORARY_LAYERS:
      const tempLayer = state.layerList.find(({ temporary }) => temporary);
      return tempLayer
        ? updateLayerInList(state, tempLayer.id, 'temporary', false)
        : state;
    case CLEAR_TEMPORARY_LAYERS:
      return {
        ...state, layerList: [...state.layerList.filter(
          ({ temporary }) => !temporary)]
      };
    // TODO: Simplify cases below
    case TOGGLE_LAYER_VISIBLE:
      return updateLayerInList(state, action.layerId, 'visible');
    case UPDATE_LAYER_STYLE:
      const styleLayerId = state.selectedLayerId;
      const styleLayerIdx = getLayerIndex(state.layerList, styleLayerId);
      const layerStyle = state.layerList[styleLayerIdx].style;
      const layerPrevStyle = layerStyle.previousStyle || layerStyle;
      return updateLayerInList(state, styleLayerId, 'style',
        { ...action.style, previousStyle: { ...layerPrevStyle } });
    case PROMOTE_TEMPORARY_STYLES:
      const stylePromoteIdx = getLayerIndex(state.layerList, state.selectedLayerId);
      const styleToSet = {
        ...state.layerList[stylePromoteIdx].style,
        previousStyle: null
      };
      return updateLayerInList(state, state.selectedLayerId, 'style', styleToSet);
    case CLEAR_TEMPORARY_STYLES:
      const styleClearIdx = getLayerIndex(state.layerList, state.selectedLayerId);
      const prevStyleToLoad = state.layerList[styleClearIdx].style.previousStyle || state.layerList[styleClearIdx].style || {};
      return updateLayerInList(state, state.selectedLayerId, 'style', prevStyleToLoad);
    default:
      return state;
  }
}


function updateWithDataRequest(state, action) {
  const layerRequestingData = findLayerById(state, action.layerId);
  if (layerRequestingData) {
    layerRequestingData.dataDirty = true;//needs to be synced to OL/MB
    layerRequestingData.dataMetaAtStart = state.mapState;
    layerRequestingData.dataRequestToken = action.requestToken;
    const layerList = [...state.layerList];
    return { ...state, layerList };
  } else {
    return { ...state };
  }
}

function updateWithDataResponse(state, action) {
  const layerReceivingData = findLayerById(state, action.layerId);
  if (!layerReceivingData) {
    return state;
  }
  if (
    layerReceivingData.dataRequestToken &&
    layerReceivingData.dataRequestToken !== action.requestToken
  ) {
    //hackyest way to deal with race conditions
    //just pick response of last request
    return { ...state };
  }
  layerReceivingData.data = action.data;
  layerReceivingData.dataMeta = layerReceivingData.dataMetaAtStart;
  layerReceivingData.dataMetaAtStart = null;
  layerReceivingData.dataDirty = false;
  layerReceivingData.dataRequestToken = null;
  const layerList = [...state.layerList];
  return { ...state, layerList };
}

function findLayerById(state, id) {
  return state.layerList.find(layer => layer.id === id);
}
