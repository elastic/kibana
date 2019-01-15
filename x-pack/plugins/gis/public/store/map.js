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
  ADD_WAITING_FOR_MAP_READY_LAYER,
  CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
  REMOVE_LAYER,
  PROMOTE_TEMPORARY_LAYERS,
  TOGGLE_LAYER_VISIBLE,
  MAP_EXTENT_CHANGED,
  MAP_READY,
  MAP_DESTROYED,
  SET_TIME_FILTERS,
  SET_QUERY,
  UPDATE_LAYER_PROP,
  UPDATE_LAYER_STYLE_FOR_SELECTED_LAYER,
  PROMOTE_TEMPORARY_STYLES,
  CLEAR_TEMPORARY_STYLES,
  SET_JOINS,
  TOUCH_LAYER,
  UPDATE_LAYER_ALPHA_VALUE,
  UPDATE_SOURCE_PROP,
  SET_REFRESH_CONFIG,
  TRIGGER_REFRESH_TIMER,
  SET_MOUSE_COORDINATES,
  CLEAR_MOUSE_COORDINATES,
  SET_GOTO,
  CLEAR_GOTO,
} from "../actions/store_actions";

const getLayerIndex = (list, layerId) => list.findIndex(({ id }) => layerId === id);

const updateLayerInList = (state, id, attribute, newValue) => {
  const { layerList } = state;
  const layerIdx = getLayerIndex(layerList, id);
  const updatedLayer = {
    ...layerList[layerIdx],
    // Update layer w/ new value. If no value provided, toggle boolean value
    // allow empty strings, 0-value
    [attribute]: (newValue || newValue === '' || newValue === 0) ? newValue : !layerList[layerIdx][attribute]
  };
  const updatedList = [
    ...layerList.slice(0, layerIdx),
    updatedLayer,
    ...layerList.slice(layerIdx + 1)
  ];
  return { ...state, layerList: updatedList };
};

const updateLayerSourceDescriptorProp = (state, layerId, propName, value) => {
  const { layerList } = state;
  const layerIdx = getLayerIndex(layerList, layerId);
  const updatedLayer = {
    ...layerList[layerIdx],
    sourceDescriptor: {
      ...layerList[layerIdx].sourceDescriptor,
      [propName]: value,
    }
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
  goto: null,
  mapState: {
    zoom: 4,
    center: {
      lon: -100.41,
      lat: 32.82
    },
    extent: null,
    mouseCoordinates: null,
    timeFilters: null,
    query: null,
    refreshConfig: null,
    refreshTimerLastTriggeredAt: null,
  },
  selectedLayerId: null,
  layerList: [],
  waitingForMapReadyLayerList: [],
};

export function map(state = INITIAL_STATE, action) {
  window._state = state;
  //todo throw actions with actual objects so this doesn't get so cluttered
  switch (action.type) {
    case SET_MOUSE_COORDINATES:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          mouseCoordinates: {
            lat: action.lat,
            lon: action.lon
          }
        }
      };
    case CLEAR_MOUSE_COORDINATES:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          mouseCoordinates: null
        }
      };
    case SET_GOTO:
      return {
        ...state,
        goto: {
          lat: action.lat,
          lon: action.lon,
          zoom: action.zoom,
        }
      };
    case CLEAR_GOTO:
      return {
        ...state,
        goto: null,
      };
    case LAYER_DATA_LOAD_STARTED:
      return updateWithDataRequest(state, action);
    case LAYER_DATA_LOAD_ERROR:
      return updateWithDataLoadError(state, action);
    case LAYER_DATA_LOAD_ENDED:
      return updateWithDataResponse(state, action);
    case TOUCH_LAYER:
      //action to enforce a reflow of the styles
      const layer = state.layerList.find(layer => layer.id === action.layerId);
      if (!layer) {
        return state;
      }
      const indexOfLayer = state.layerList.indexOf(layer);
      const newLayer = { ...layer };
      const newLayerList = [...state.layerList];
      newLayerList[indexOfLayer] = newLayer;
      return { ...state, layerList: newLayerList };
    case MAP_READY:
      return { ...state, ready: true };
    case MAP_DESTROYED:
      return { ...state, ready: false };
    case MAP_EXTENT_CHANGED:
      const newMapState = {
        center: action.mapState.center,
        zoom: action.mapState.zoom,
        extent: action.mapState.extent,
        buffer: action.mapState.buffer,
      };
      return { ...state, mapState: { ...state.mapState, ...newMapState } };
    case SET_TIME_FILTERS:
      const { from, to } = action;
      return { ...state, mapState: { ...state.mapState, timeFilters: { from, to } } };
    case SET_QUERY:
      const { query } = action;
      return { ...state, mapState: { ...state.mapState, query } };
    case SET_REFRESH_CONFIG:
      const { isPaused, interval } = action;
      return {
        ...state,
        mapState: {
          ...state.mapState,
          refreshConfig: {
            isPaused,
            interval,
          }
        }
      };
    case TRIGGER_REFRESH_TIMER:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          refreshTimerLastTriggeredAt: (new Date()).toISOString(),
        }
      };
    case SET_SELECTED_LAYER:
      const match = state.layerList.find(layer => layer.id === action.selectedLayerId);
      return { ...state, selectedLayerId: match ? action.selectedLayerId : null };
    case UPDATE_LAYER_ORDER:
      return { ...state, layerList: action.newLayerOrder.map(layerNumber => state.layerList[layerNumber]) };
    case UPDATE_LAYER_ALPHA_VALUE:
      const alphaLayer = state.layerList.find(layer => layer.id === action.id);
      const preAlphaStyle = alphaLayer.style;
      return updateLayerInList(state, action.id, 'style',
        { ...preAlphaStyle, properties: { ...preAlphaStyle.properties,
          alphaValue: action.newAlphaValue }
        });
    case UPDATE_LAYER_PROP:
      return updateLayerInList(state, action.id, action.propName, action.newValue);
    case UPDATE_SOURCE_PROP:
      return updateLayerSourceDescriptorProp(state, action.layerId, action.propName, action.value);
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
      return {
        ...state,
        layerList: [
          ...state.layerList,
          action.layer
        ]
      };
    case REMOVE_LAYER:
      return {
        ...state, layerList: [...state.layerList.filter(
          ({ id }) => id !== action.id)]
      };
    case ADD_WAITING_FOR_MAP_READY_LAYER:
      return {
        ...state,
        waitingForMapReadyLayerList: [
          ...state.waitingForMapReadyLayerList,
          action.layer
        ]
      };
    case CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST:
      return {
        ...state,
        waitingForMapReadyLayerList: []
      };
    //TODO: Handle more than one
    case PROMOTE_TEMPORARY_LAYERS:
      const tempLayer = state.layerList.find(({ temporary }) => temporary);
      return tempLayer
        ? updateLayerInList(state, tempLayer.id, 'temporary', false)
        : state;
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
  dataRequest.dataMeta = { ...dataRequest.dataMetaAtStart, ...action.meta };
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
