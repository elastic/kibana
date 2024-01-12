/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APP_ID } from '../../../common/constants';
import {
  SET_SELECTED_LAYER,
  UPDATE_LAYER_ORDER,
  LAYER_DATA_LOAD_STARTED,
  LAYER_DATA_LOAD_ENDED,
  LAYER_DATA_LOAD_ERROR,
  ADD_LAYER,
  ADD_WAITING_FOR_MAP_READY_LAYER,
  CLEAR_LAYER_PROP,
  CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
  REMOVE_LAYER,
  SET_LAYER_VISIBILITY,
  MAP_EXTENT_CHANGED,
  MAP_READY,
  MAP_DESTROYED,
  SET_EMBEDDABLE_SEARCH_CONTEXT,
  SET_QUERY,
  UPDATE_LAYER,
  UPDATE_LAYER_PROP,
  UPDATE_LAYER_STYLE,
  SET_LAYER_STYLE_META,
  SET_JOINS,
  UPDATE_SOURCE_PROP,
  SET_MOUSE_COORDINATES,
  CLEAR_MOUSE_COORDINATES,
  SET_GOTO,
  CLEAR_GOTO,
  TRACK_CURRENT_LAYER_STATE,
  ROLLBACK_TO_TRACKED_LAYER_STATE,
  REMOVE_TRACKED_LAYER_STATE,
  UPDATE_SOURCE_DATA_REQUEST,
  SET_OPEN_TOOLTIPS,
  SET_MAP_INIT_ERROR,
  UPDATE_DRAW_STATE,
  SET_WAITING_FOR_READY_HIDDEN_LAYERS,
  SET_MAP_SETTINGS,
  ROLLBACK_MAP_SETTINGS,
  TRACK_MAP_SETTINGS,
  UPDATE_MAP_SETTING,
  UPDATE_EDIT_STATE,
  SET_EXECUTION_CONTEXT,
} from '../../actions/map_action_constants';

import { getDefaultMapSettings } from './default_map_settings';
import {
  clearLayerProp,
  getLayerIndex,
  removeTrackedLayerState,
  rollbackTrackedLayerState,
  setLayer,
  trackCurrentLayerState,
  updateLayerInList,
  updateLayerSourceDescriptorProp,
} from './layer_utils';
import { startDataRequest, stopDataRequest, updateSourceDataRequest } from './data_request_utils';
import { MapState } from './types';

export const DEFAULT_MAP_STATE: MapState = {
  executionContext: { name: APP_ID },
  ready: false,
  mapInitError: null,
  goto: null,
  openTooltips: [],
  mapState: {
    zoom: undefined, // setting this value does not adjust map zoom, read only value used to store current map zoom for persisting between sessions
    center: undefined, // setting this value does not adjust map view, read only value used to store current map center for persisting between sessions
    extent: undefined,
    mouseCoordinates: undefined,
    timeFilters: undefined,
    timeslice: undefined,
    query: undefined,
    filters: [],
    drawState: undefined,
    editState: undefined,
  },
  selectedLayerId: null,
  layerList: [],
  waitingForMapReadyLayerList: [],
  settings: getDefaultMapSettings(),
  __rollbackSettings: null,
};

export function map(state: MapState = DEFAULT_MAP_STATE, action: Record<string, any>) {
  switch (action.type) {
    case UPDATE_DRAW_STATE:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          drawState: action.drawState,
        },
      };
    case UPDATE_EDIT_STATE:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          editState: action.editState,
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
          mouseCoordinates: undefined,
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
        settings: { ...state.settings, ...action.settings },
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
    case UPDATE_SOURCE_DATA_REQUEST:
      return updateSourceDataRequest(state, action.layerId, action.newData);
    case LAYER_DATA_LOAD_STARTED:
      return startDataRequest(
        state,
        action.layerId,
        action.dataId,
        action.requestToken,
        action.meta
      );
    case LAYER_DATA_LOAD_ERROR:
      return stopDataRequest(
        state,
        action.layerId,
        action.dataId,
        action.requestToken,
        undefined, // responseMeta meta
        undefined, // response data
        action.error
      );
    case LAYER_DATA_LOAD_ENDED:
      return stopDataRequest(
        state,
        action.layerId,
        action.dataId,
        action.requestToken,
        action.meta,
        action.data
      );
    case MAP_READY:
      return { ...state, ready: true };
    case MAP_DESTROYED:
      return { ...state, ready: false };
    case MAP_EXTENT_CHANGED:
      return { ...state, mapState: { ...state.mapState, ...action.mapViewContext } };
    case SET_QUERY:
      const { query, timeFilters, timeslice, filters, searchSessionId, searchSessionMapBuffer } =
        action;
      return {
        ...state,
        mapState: {
          ...state.mapState,
          query,
          timeFilters,
          timeslice,
          filters,
          searchSessionId,
          searchSessionMapBuffer,
        },
      };
    case SET_SELECTED_LAYER:
      const selectedMatch = state.layerList.find((layer) => layer.id === action.selectedLayerId);
      return { ...state, selectedLayerId: selectedMatch ? action.selectedLayerId : null };
    case UPDATE_LAYER_ORDER:
      return {
        ...state,
        layerList: action.newLayerOrder.map((layerNumber: number) => state.layerList[layerNumber]),
      };
    case UPDATE_LAYER_PROP:
      return updateLayerInList(state, action.id, action.propName, action.newValue);
    case CLEAR_LAYER_PROP:
      return clearLayerProp(state, action.id, action.propName);
    case UPDATE_SOURCE_PROP:
      return updateLayerSourceDescriptorProp(state, action.layerId, action.propName, action.value);
    case SET_JOINS:
      const layerDescriptor = state.layerList.find(
        (descriptor) => descriptor.id === action.layerId
      );
      if (layerDescriptor) {
        const newLayerDescriptor = { ...layerDescriptor, joins: action.joins.slice() };
        const index = state.layerList.findIndex((descriptor) => descriptor.id === action.layerId);
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
    case UPDATE_LAYER:
      return {
        ...state,
        layerList: setLayer(state.layerList, action.layer),
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
    case SET_MAP_INIT_ERROR:
      return {
        ...state,
        mapInitError: action.errorMessage,
      };
    case SET_WAITING_FOR_READY_HIDDEN_LAYERS:
      return {
        ...state,
        waitingForMapReadyLayerList: state.waitingForMapReadyLayerList.map((layer) => ({
          ...layer,
          visible: !action.hiddenLayerIds.includes(layer.id),
        })),
      };
    case SET_EMBEDDABLE_SEARCH_CONTEXT:
      return {
        ...state,
        mapState: {
          ...state.mapState,
          embeddableSearchContext: action.embeddableSearchContext,
        },
      };
    case SET_EXECUTION_CONTEXT: {
      return {
        ...state,
        executionContext: action.executionContext,
      };
    }
    default:
      return state;
  }
}
