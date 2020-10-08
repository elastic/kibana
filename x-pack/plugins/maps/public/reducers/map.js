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
  SET_LAYER_ERROR_STATUS,
  ADD_WAITING_FOR_MAP_READY_LAYER,
  CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
  REMOVE_LAYER,
  SET_LAYER_VISIBILITY,
  MAP_EXTENT_CHANGED,
  MAP_READY,
  MAP_DESTROYED,
  SET_QUERY,
  UPDATE_LAYER_PROP,
  UPDATE_LAYER_STYLE,
  SET_LAYER_STYLE_META,
  SET_JOINS,
  UPDATE_SOURCE_PROP,
  SET_REFRESH_CONFIG,
  TRIGGER_REFRESH_TIMER,
  SET_MOUSE_COORDINATES,
  CLEAR_MOUSE_COORDINATES,
  SET_GOTO,
  CLEAR_GOTO,
  TRACK_CURRENT_LAYER_STATE,
  ROLLBACK_TO_TRACKED_LAYER_STATE,
  REMOVE_TRACKED_LAYER_STATE,
  UPDATE_SOURCE_DATA_REQUEST,
  SET_OPEN_TOOLTIPS,
  SET_SCROLL_ZOOM,
  SET_MAP_INIT_ERROR,
  UPDATE_DRAW_STATE,
  SET_INTERACTIVE,
  DISABLE_TOOLTIP_CONTROL,
  HIDE_TOOLBAR_OVERLAY,
  HIDE_LAYER_CONTROL,
  HIDE_VIEW_CONTROL,
  SET_WAITING_FOR_READY_HIDDEN_LAYERS,
  SET_MAP_SETTINGS,
  ROLLBACK_MAP_SETTINGS,
  TRACK_MAP_SETTINGS,
  UPDATE_MAP_SETTING,
} from '../actions';

import { getDefaultMapSettings } from './default_map_settings';
import { copyPersistentState, TRACKED_LAYER_DESCRIPTOR } from './util';
import { SOURCE_DATA_REQUEST_ID } from '../../common/constants';

const getLayerIndex = (list, layerId) => list.findIndex(({ id }) => layerId === id);

const updateLayerInList = (state, layerId, attribute, newValue) => {
  if (!layerId) {
    return state;
  }

  const { layerList } = state;
  const layerIdx = getLayerIndex(layerList, layerId);
  if (layerIdx === -1) {
    return state;
  }

  const updatedLayer = {
    ...layerList[layerIdx],
    // Update layer w/ new value. If no value provided, toggle boolean value
    // allow empty strings, 0-value
    [attribute]:
      newValue || newValue === '' || newValue === 0 ? newValue : !layerList[layerIdx][attribute],
  };
  const updatedList = [
    ...layerList.slice(0, layerIdx),
    updatedLayer,
    ...layerList.slice(layerIdx + 1),
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
    },
  };
  const updatedList = [
    ...layerList.slice(0, layerIdx),
    updatedLayer,
    ...layerList.slice(layerIdx + 1),
  ];
  return { ...state, layerList: updatedList };
};

export const DEFAULT_MAP_STATE = {
  ready: false,
  mapInitError: null,
  goto: null,
  openTooltips: [],
  mapState: {
    zoom: null, // setting this value does not adjust map zoom, read only value used to store current map zoom for persisting between sessions
    center: null, // setting this value does not adjust map view, read only value used to store current map center for persisting between sessions
    scrollZoom: true,
    extent: null,
    mouseCoordinates: null,
    timeFilters: null,
    query: null,
    filters: [],
    refreshConfig: null,
    refreshTimerLastTriggeredAt: null,
    drawState: null,
    disableInteractive: false,
    disableTooltipControl: false,
    hideToolbarOverlay: false,
    hideLayerControl: false,
    hideViewControl: false,
  },
  selectedLayerId: null,
  layerList: [],
  waitingForMapReadyLayerList: [],
  settings: getDefaultMapSettings(),
  __rollbackSettings: null,
};

export function map(state = DEFAULT_MAP_STATE, action) {
  switch (action.type) {
    case UPDATE_DRAW_STATE:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          drawState: action.drawState,
        },
      };
    case REMOVE_TRACKED_LAYER_STATE:
      return removeTrackedLayerState(state, action.layerId);
    case TRACK_CURRENT_LAYER_STATE:
      return trackCurrentLayerState(state, action.layerId);
    case ROLLBACK_TO_TRACKED_LAYER_STATE:
      return rollbackTrackedLayerState(state, action.layerId);
    case SET_OPEN_TOOLTIPS:
      return {
        ...state,
        openTooltips: action.openTooltips,
      };
    case SET_MOUSE_COORDINATES:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          mouseCoordinates: {
            lat: action.lat,
            lon: action.lon,
          },
        },
      };
    case CLEAR_MOUSE_COORDINATES:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          mouseCoordinates: null,
        },
      };
    case SET_GOTO:
      return {
        ...state,
        goto: {
          center: action.center,
          bounds: action.bounds,
        },
      };
    case CLEAR_GOTO:
      return {
        ...state,
        goto: null,
      };
    case SET_MAP_SETTINGS:
      return {
        ...state,
        settings: { ...getDefaultMapSettings(), ...action.settings },
      };
    case ROLLBACK_MAP_SETTINGS:
      return state.__rollbackSettings
        ? {
            ...state,
            settings: { ...state.__rollbackSettings },
            __rollbackSettings: null,
          }
        : state;
    case TRACK_MAP_SETTINGS:
      return {
        ...state,
        __rollbackSettings: state.settings,
      };
    case UPDATE_MAP_SETTING:
      return {
        ...state,
        settings: {
          ...(state.settings ? state.settings : {}),
          [action.settingKey]: action.settingValue,
        },
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
            __isInErrorState: action.isInErrorState,
            __errorMessage: action.errorMessage,
          },
          ...layerList.slice(layerIdx + 1),
        ],
      };
    case UPDATE_SOURCE_DATA_REQUEST:
      return updateSourceDataRequest(state, action);
    case LAYER_DATA_LOAD_STARTED:
      return updateWithDataRequest(state, action);
    case LAYER_DATA_LOAD_ERROR:
      return updateWithDataResponse(state, action);
    case LAYER_DATA_LOAD_ENDED:
      return updateWithDataResponse(state, action);
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
      const { query, timeFilters, filters } = action;
      return {
        ...state,
        mapState: {
          ...state.mapState,
          query,
          timeFilters,
          filters,
        },
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
          },
        },
      };
    case TRIGGER_REFRESH_TIMER:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          refreshTimerLastTriggeredAt: new Date().toISOString(),
        },
      };
    case SET_SELECTED_LAYER:
      const selectedMatch = state.layerList.find((layer) => layer.id === action.selectedLayerId);
      return { ...state, selectedLayerId: selectedMatch ? action.selectedLayerId : null };
    case UPDATE_LAYER_ORDER:
      return {
        ...state,
        layerList: action.newLayerOrder.map((layerNumber) => state.layerList[layerNumber]),
      };
    case UPDATE_LAYER_PROP:
      return updateLayerInList(state, action.id, action.propName, action.newValue);
    case UPDATE_SOURCE_PROP:
      return updateLayerSourceDescriptorProp(state, action.layerId, action.propName, action.value);
    case SET_JOINS:
      const layerDescriptor = state.layerList.find(
        (descriptor) => descriptor.id === action.layer.getId()
      );
      if (layerDescriptor) {
        const newLayerDescriptor = { ...layerDescriptor, joins: action.joins.slice() };
        const index = state.layerList.findIndex(
          (descriptor) => descriptor.id === action.layer.getId()
        );
        const newLayerList = state.layerList.slice();
        newLayerList[index] = newLayerDescriptor;
        return { ...state, layerList: newLayerList };
      }
      return state;
    case ADD_LAYER:
      return {
        ...state,
        layerList: [...state.layerList, action.layer],
      };
    case REMOVE_LAYER:
      return {
        ...state,
        layerList: [...state.layerList.filter(({ id }) => id !== action.id)],
      };
    case ADD_WAITING_FOR_MAP_READY_LAYER:
      return {
        ...state,
        waitingForMapReadyLayerList: [...state.waitingForMapReadyLayerList, action.layer],
      };
    case CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST:
      return {
        ...state,
        waitingForMapReadyLayerList: [],
      };
    case SET_LAYER_VISIBILITY:
      return updateLayerInList(state, action.layerId, 'visible', action.visibility);
    case UPDATE_LAYER_STYLE:
      const styleLayerId = action.layerId;
      return updateLayerInList(state, styleLayerId, 'style', { ...action.style });
    case SET_LAYER_STYLE_META:
      const { layerId, styleMeta } = action;
      const index = getLayerIndex(state.layerList, layerId);
      if (index === -1) {
        return state;
      }

      return updateLayerInList(state, layerId, 'style', {
        ...state.layerList[index].style,
        __styleMeta: styleMeta,
      });
    case SET_SCROLL_ZOOM:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          scrollZoom: action.scrollZoom,
        },
      };
    case SET_MAP_INIT_ERROR:
      return {
        ...state,
        mapInitError: action.errorMessage,
      };
    case SET_INTERACTIVE:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          disableInteractive: action.disableInteractive,
        },
      };
    case DISABLE_TOOLTIP_CONTROL:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          disableTooltipControl: action.disableTooltipControl,
        },
      };
    case HIDE_TOOLBAR_OVERLAY:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          hideToolbarOverlay: action.hideToolbarOverlay,
        },
      };
    case HIDE_LAYER_CONTROL:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          hideLayerControl: action.hideLayerControl,
        },
      };
    case HIDE_VIEW_CONTROL:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          hideViewControl: action.hideViewControl,
        },
      };
    case SET_WAITING_FOR_READY_HIDDEN_LAYERS:
      return {
        ...state,
        waitingForMapReadyLayerList: state.waitingForMapReadyLayerList.map((layer) => ({
          ...layer,
          visible: !action.hiddenLayerIds.includes(layer.id),
        })),
      };
    default:
      return state;
  }
}

function findDataRequest(layerDescriptor, dataRequestAction) {
  if (!layerDescriptor.__dataRequests) {
    return;
  }

  return layerDescriptor.__dataRequests.find((dataRequest) => {
    return dataRequest.dataId === dataRequestAction.dataId;
  });
}

function updateWithDataRequest(state, action) {
  let dataRequest = getValidDataRequest(state, action, false);
  const layerRequestingData = findLayerById(state, action.layerId);

  if (!dataRequest) {
    dataRequest = {
      dataId: action.dataId,
    };
    layerRequestingData.__dataRequests = [
      ...(layerRequestingData.__dataRequests ? layerRequestingData.__dataRequests : []),
      dataRequest,
    ];
  }
  dataRequest.dataMetaAtStart = action.meta;
  dataRequest.dataRequestToken = action.requestToken;
  const layerList = [...state.layerList];
  return { ...state, layerList };
}

function updateSourceDataRequest(state, action) {
  const layerDescriptor = findLayerById(state, action.layerId);
  if (!layerDescriptor) {
    return state;
  }
  const dataRequest = layerDescriptor.__dataRequests.find((dataRequest) => {
    return dataRequest.dataId === SOURCE_DATA_REQUEST_ID;
  });
  if (!dataRequest) {
    return state;
  }

  dataRequest.data = action.newData;
  return resetDataRequest(state, action, dataRequest);
}

function updateWithDataResponse(state, action) {
  const dataRequest = getValidDataRequest(state, action);
  if (!dataRequest) {
    return state;
  }

  dataRequest.data = action.data;
  dataRequest.dataMeta = { ...dataRequest.dataMetaAtStart, ...action.meta };
  dataRequest.dataMetaAtStart = null;
  return resetDataRequest(state, action, dataRequest);
}

export function resetDataRequest(state, action, request) {
  const dataRequest = request || getValidDataRequest(state, action);
  if (!dataRequest) {
    return state;
  }

  const layer = findLayerById(state, action.layerId);
  const dataRequestIndex = layer.__dataRequests.indexOf(dataRequest);

  const newDataRequests = [...layer.__dataRequests];
  newDataRequests[dataRequestIndex] = {
    ...dataRequest,
    dataRequestToken: null,
  };

  const layerIndex = state.layerList.indexOf(layer);
  const newLayerList = [...state.layerList];
  newLayerList[layerIndex] = {
    ...layer,
    __dataRequests: newDataRequests,
  };
  return { ...state, layerList: newLayerList };
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
  return state.layerList.find((layer) => layer.id === id);
}

function trackCurrentLayerState(state, layerId) {
  const layer = findLayerById(state, layerId);
  const layerCopy = copyPersistentState(layer);
  return updateLayerInList(state, layerId, TRACKED_LAYER_DESCRIPTOR, layerCopy);
}

function removeTrackedLayerState(state, layerId) {
  const layer = findLayerById(state, layerId);
  if (!layer) {
    return state;
  }

  const copyLayer = { ...layer };
  delete copyLayer[TRACKED_LAYER_DESCRIPTOR];

  return {
    ...state,
    layerList: replaceInLayerList(state.layerList, layerId, copyLayer),
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
    layerList: replaceInLayerList(state.layerList, layerId, rolledbackLayer),
  };
}

function replaceInLayerList(layerList, layerId, newLayerDescriptor) {
  const layerIndex = getLayerIndex(layerList, layerId);
  const newLayerList = [...layerList];
  newLayerList[layerIndex] = newLayerDescriptor;
  return newLayerList;
}
