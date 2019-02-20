/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SET_SELECTED_LAYER,
  SET_TRANSIENT_LAYER,
  UPDATE_LAYER_ORDER,
  LAYER_DATA_LOAD_STARTED,
  LAYER_DATA_LOAD_ENDED,
  LAYER_DATA_LOAD_ERROR,
  ADD_LAYER,
  SET_LAYER_ERROR_STATUS,
  ADD_WAITING_FOR_MAP_READY_LAYER,
  CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
  REMOVE_LAYER,
  TOGGLE_LAYER_VISIBLE,
  MAP_EXTENT_CHANGED,
  MAP_READY,
  MAP_DESTROYED,
  SET_QUERY,
  UPDATE_LAYER_PROP,
  UPDATE_LAYER_STYLE,
  SET_JOINS,
  TOUCH_LAYER,
  UPDATE_SOURCE_PROP,
  SET_REFRESH_CONFIG,
  TRIGGER_REFRESH_TIMER,
  SET_MOUSE_COORDINATES,
  CLEAR_MOUSE_COORDINATES,
  SET_GOTO,
  CLEAR_GOTO,
  TRACK_CURRENT_LAYER_STATE,
  ROLLBACK_TO_TRACKED_LAYER_STATE,
  REMOVE_TRACKED_LAYER_STATE
} from '../actions/store_actions';

import { copyPersistentState, TRACKED_LAYER_DESCRIPTOR } from './util';

const getLayerIndex = (list, layerId) => list.findIndex(({ id }) => layerId === id);

const updateLayerInList = (state, layerId, attribute, newValue) => {
  if (!layerId) {
    return state;
  }
  const { layerList } = state;
  const layerIdx = getLayerIndex(layerList, layerId);
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
  __transientLayerId: null,
  layerList: [],
  waitingForMapReadyLayerList: [],
};



export function map(state = INITIAL_STATE, action) {
  switch (action.type) {
    case REMOVE_TRACKED_LAYER_STATE:
      return removeTrackedLayerState(state, action.layerId);
    case TRACK_CURRENT_LAYER_STATE:
      return trackCurrentLayerState(state, action.layerId);
    case ROLLBACK_TO_TRACKED_LAYER_STATE:
      return rollbackTrackedLayerState(state, action.layerId);
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
          center: action.center,
          bounds: action.bounds
        }
      };
    case CLEAR_GOTO:
      return {
        ...state,
        goto: null,
      };
    case SET_LAYER_ERROR_STATUS:
      const { layerList } = state;
      const layerIdx = getLayerIndex(layerList, action.layerId);
      if (layerIdx === -1) {
        return state;
      }

      return {
        ...state,
        layerList: [
          ...layerList.slice(0, layerIdx),
          {
            ...layerList[layerIdx],
            __isInErrorState: true,
            __errorMessage: action.errorMessage
          },
          ...layerList.slice(layerIdx + 1)
        ]
      };
    case LAYER_DATA_LOAD_STARTED:
      return updateWithDataRequest(state, action);
    case LAYER_DATA_LOAD_ERROR:
      return resetDataRequest(state, action);
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
    case SET_QUERY:
      const { query, timeFilters } = action;
      return {
        ...state,
        mapState: {
          ...state.mapState,
          query,
          timeFilters,
        }
      };
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
      const selectedMatch = state.layerList.find(layer => layer.id === action.selectedLayerId);
      return { ...state, selectedLayerId: selectedMatch ? action.selectedLayerId : null };
    case SET_TRANSIENT_LAYER:
      const transientMatch = state.layerList.find(layer => layer.id === action.transientLayerId);
      return { ...state, __transientLayerId: transientMatch ? action.transientLayerId : null };
    case UPDATE_LAYER_ORDER:
      return { ...state, layerList: action.newLayerOrder.map(layerNumber => state.layerList[layerNumber]) };
    case UPDATE_LAYER_PROP:
      return updateLayerInList(state, action.id, action.propName, action.newValue);
    case UPDATE_SOURCE_PROP:
      return updateLayerSourceDescriptorProp(state, action.layerId, action.propName, action.value);
    case SET_JOINS:
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
    case TOGGLE_LAYER_VISIBLE:
      return updateLayerInList(state, action.layerId, 'visible');
    case UPDATE_LAYER_STYLE:
      const styleLayerId = action.layerId;
      return updateLayerInList(state, styleLayerId, 'style',
        { ...action.style });
    default:
      return state;
  }
}

function findDataRequest(layerDescriptor, dataRequestAction) {

  if (!layerDescriptor.__dataRequests) {
    return;
  }

  return layerDescriptor.__dataRequests.find(dataRequest => {
    return dataRequest.dataId === dataRequestAction.dataId;
  });
}


function updateWithDataRequest(state, action) {
  let dataRequest = getValidDataRequest(state, action, false);
  const layerRequestingData = findLayerById(state, action.layerId);

  if (!dataRequest) {
    dataRequest = {
      dataId: action.dataId
    };
    layerRequestingData.__dataRequests = [
      ...(layerRequestingData.__dataRequests
        ? layerRequestingData.__dataRequests : []), dataRequest ];
  }
  dataRequest.dataMetaAtStart = action.meta;
  dataRequest.dataRequestToken = action.requestToken;
  const layerList = [...state.layerList];
  return { ...state, layerList };
}

function updateWithDataResponse(state, action) {
  const dataRequest = getValidDataRequest(state, action);
  if (!dataRequest) { return state; }

  dataRequest.data = action.data;
  dataRequest.dataMeta = { ...dataRequest.dataMetaAtStart, ...action.meta };
  dataRequest.dataMetaAtStart = null;
  return resetDataRequest(state, action, dataRequest);
}

function resetDataRequest(state, action, request) {
  const dataRequest = request || getValidDataRequest(state, action);
  if (!dataRequest) { return state; }

  dataRequest.dataRequestToken = null;
  dataRequest.dataId = action.dataId;
  const layerList = [...state.layerList];
  return { ...state, layerList };
}

function getValidDataRequest(state, action, checkRequestToken = true) {
  const layer = findLayerById(state, action.layerId);
  if (!layer) {
    return;
  }

  const dataRequest = findDataRequest(layer, action);
  if (!dataRequest) {
    return;
  }

  if (
    checkRequestToken &&
    dataRequest.dataRequestToken &&
    dataRequest.dataRequestToken !== action.requestToken
  ) {
    // ignore responses to outdated requests
    return;
  }
  return dataRequest;
}

function findLayerById(state, id) {
  return state.layerList.find(layer => layer.id === id);
}

function trackCurrentLayerState(state, layerId) {
  const layer = findLayerById(state, layerId);
  const layerCopy = copyPersistentState(layer);
  return updateLayerInList(state, layerId, TRACKED_LAYER_DESCRIPTOR, layerCopy);
}

function removeTrackedLayerState(state, layerId) {
  const layer = findLayerById(state,  layerId);
  if (!layer) {
    return state;
  }

  const copyLayer = { ...layer };
  delete copyLayer[TRACKED_LAYER_DESCRIPTOR];

  return {
    ...state,
    layerList: replaceInLayerList(state.layerList, layerId, copyLayer)
  };
}

function rollbackTrackedLayerState(state, layerId) {
  const layer = findLayerById(state, layerId);
  if (!layer) {
    return state;
  }
  const trackedLayerDescriptor = layer[TRACKED_LAYER_DESCRIPTOR];

  //this assumes that any nested temp-state in the layer-descriptor (e.g. of styles), is not relevant and can be recovered easily (e.g. this is not the case for __dataRequests)
  //That assumption is true in the context of this app, but not generalizable.
  //consider rewriting copyPersistentState to only strip the first level of temp state.
  const rolledbackLayer = { ...layer, ...trackedLayerDescriptor };
  delete rolledbackLayer[TRACKED_LAYER_DESCRIPTOR];

  return {
    ...state,
    layerList: replaceInLayerList(state.layerList, layerId, rolledbackLayer)
  };
}

function replaceInLayerList(layerList, layerId, newLayerDescriptor) {
  const layerIndex = getLayerIndex(layerList, layerId);
  const newLayerList = [...layerList];
  newLayerList[layerIndex] = newLayerDescriptor;
  return newLayerList;
}
