/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SET_SELECTED_LAYER,
  UPDATE_LAYER_ORDER,
  LAYER_DATA_LOAD_STARTED,
  LAYER_DATA_LOAD_ENDED,
  LAYER_DATA_LOAD_ERROR,
  ADD_LAYER,
  REMOVE_LAYER,
  PROMOTE_TEMPORARY_LAYERS,
  CLEAR_TEMPORARY_LAYERS,
  TOGGLE_LAYER_VISIBLE,
  MAP_EXTENT_CHANGED,
  MAP_READY,
  REPLACE_LAYERLIST,
  SET_TIME_FILTERS,
  UPDATE_LAYER_PROP,
  UPDATE_LAYER_STYLE_FOR_SELECTED_LAYER,
  PROMOTE_TEMPORARY_STYLES,
  CLEAR_TEMPORARY_STYLES, SET_JOINS,
} from "../actions/store_actions";

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
  ready: false,
  mapState: {
    zoom: 4,
    center: {
      lon: -100.41,
      lat: 32.82
    },
    extent: null,
    timeFilters: { // TODO: Init vals during app hydration
      from: 'now-24h',
      to: 'now'
    },
  },
  selectedLayerId: null,
  layerList: []
};

export function map(state = INITIAL_STATE, action) {
  window._state = state;
  //todo throw actions with actual objects so this doesn't get so cluttered
  switch (action.type) {
    case REPLACE_LAYERLIST:
      return { ...state, layerList: [ ...action.layerList] };
    case LAYER_DATA_LOAD_STARTED:
      return updateWithDataRequest(state, action);
    case LAYER_DATA_LOAD_ERROR:
      return updateWithDataLoadError(state, action);
    case LAYER_DATA_LOAD_ENDED:
      return updateWithDataResponse(state, action);
    case MAP_READY:
      return { ...state, ready: true };
    case MAP_EXTENT_CHANGED:
      const newMapState = {
        center: action.mapState.center,
        zoom: action.mapState.zoom,
        extent: action.mapState.extent
      };
      return { ...state, mapState: { ...state.mapState, ...newMapState } };
    case SET_TIME_FILTERS:
      const { from, to } = action;
      return { ...state, mapState: { ...state.mapState, timeFilters: { from, to } } };
    case SET_SELECTED_LAYER:
      const match = state.layerList.find(layer => layer.id === action.selectedLayerId);
      return { ...state, selectedLayerId: match ? action.selectedLayerId : null };
    case UPDATE_LAYER_ORDER:
      return { ...state, layerList: action.newLayerOrder.map(layerNumber => state.layerList[layerNumber]) };
    case UPDATE_LAYER_PROP:
      return updateLayerInList(state, action.id, action.propName, action.newValue);
    case SET_JOINS:
      console.warn('when setting joins, must remove all corresponding datarequests as well');
      const layerDescriptor = state.layerList.find(descriptor => descriptor.id === action.layer.getId());
      if (layerDescriptor) {
        const newLayerDescriptor = { ...layerDescriptor, joins: action.joins.slice() };
        const index = state.layerList.findIndex(descriptor => descriptor.id === action.layer.getId());
        const newLayerList = state.layerList.slice();
        newLayerList[index] = newLayerDescriptor;
        return { ...state, layerList: newLayerList };
      }
      return state;
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
    case UPDATE_LAYER_STYLE_FOR_SELECTED_LAYER:
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

function findDataRequest(layerDescriptor, dataRequestAction) {

  if (!layerDescriptor.dataRequests) {
    return;
  }

  return layerDescriptor.dataRequests.find(dataRequest => {
    return dataRequest.dataId === dataRequestAction.dataId;
  });
}


function updateWithDataRequest(state, action) {
  const layerRequestingData = findLayerById(state, action.layerId);
  if (!layerRequestingData) {
    return state;
  }

  if (!layerRequestingData.dataRequests) {
    layerRequestingData.dataRequests = [];
  }

  let dataRequest = findDataRequest(layerRequestingData, action);
  if (!dataRequest) {
    dataRequest = {
      dataId: action.dataId
    };
    layerRequestingData.dataRequests.push(dataRequest);
  }
  dataRequest.dataHasLoadError = false;
  dataRequest.dataLoadError = null;
  dataRequest.dataMetaAtStart = action.meta;
  dataRequest.dataRequestToken = action.requestToken;
  const layerList = [...state.layerList];
  return { ...state, layerList };
}

function updateWithDataResponse(state, action) {
  const layerReceivingData = findLayerById(state, action.layerId);
  if (!layerReceivingData) {
    return state;
  }


  const dataRequest = findDataRequest(layerReceivingData, action);
  if (!dataRequest) {
    throw new Error('Data request should be initialized. Cannot call stopLoading before startLoading');
  }

  if (
    dataRequest.dataRequestToken &&
    dataRequest.dataRequestToken !== action.requestToken
  ) {
    // ignore responses to outdated requests
    return { ...state };
  }

  dataRequest.data = action.data;
  dataRequest.dataMeta = dataRequest.dataMetaAtStart;
  dataRequest.dataMetaAtStart = null;
  dataRequest.dataRequestToken = null;
  dataRequest.dataId = action.dataId;
  const layerList = [...state.layerList];
  return { ...state, layerList };
}

function updateWithDataLoadError(state, action) {
  const layer = findLayerById(state, action.layerId);
  if (!layer) {
    return state;
  }

  const dataRequest = findDataRequest(layer, action);
  if (!dataRequest) {
    throw new Error('Data request should be initialized. Cannot call loadError before startLoading');
  }

  if (
    dataRequest.dataRequestToken &&
    dataRequest.dataRequestToken !== action.requestToken
  ) {
    // ignore responses to outdated requests
    return state;
  }

  dataRequest.dataHasLoadError = true;
  dataRequest.dataLoadError = action.errorMessage;
  dataRequest.dataRequestToken = null;
  dataRequest.dataId = action.dataId;
  const layerList = [...state.layerList];
  return { ...state, layerList };
}

function findLayerById(state, id) {
  return state.layerList.find(layer => layer.id === id);
}
