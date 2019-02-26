/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import turf from 'turf';
import turfBooleanContains from '@turf/boolean-contains';
import {
  getLayerList,
  getLayerListRaw,
  getDataFilters,
  getSelectedLayerId,
  getMapReady,
  getWaitingForMapReadyLayerListRaw,
  getTransientLayerId,
} from '../selectors/map_selectors';
import { updateFlyout, FLYOUT_STATE } from '../store/ui';
import { SOURCE_DATA_ID_ORIGIN } from '../../common/constants';

export const SET_SELECTED_LAYER = 'SET_SELECTED_LAYER';
export const SET_TRANSIENT_LAYER = 'SET_TRANSIENT_LAYER';
export const UPDATE_LAYER_ORDER = 'UPDATE_LAYER_ORDER';
export const ADD_LAYER = 'ADD_LAYER';
export const SET_LAYER_ERROR_STATUS = 'SET_LAYER_ERROR_STATUS';
export const ADD_WAITING_FOR_MAP_READY_LAYER = 'ADD_WAITING_FOR_MAP_READY_LAYER';
export const CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST = 'CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST';
export const REMOVE_LAYER = 'REMOVE_LAYER';
export const TOGGLE_LAYER_VISIBLE = 'TOGGLE_LAYER_VISIBLE';
export const MAP_EXTENT_CHANGED = 'MAP_EXTENT_CHANGED';
export const MAP_READY = 'MAP_READY';
export const MAP_DESTROYED = 'MAP_DESTROYED';
export const LAYER_DATA_LOAD_STARTED = 'LAYER_DATA_LOAD_STARTED';
export const LAYER_DATA_LOAD_ENDED = 'LAYER_DATA_LOAD_ENDED';
export const LAYER_DATA_LOAD_ERROR = 'LAYER_DATA_LOAD_ERROR';
export const UPDATE_SOURCE_DATA_REQUEST = 'UPDATE_SOURCE_DATA_REQUEST';
export const SET_JOINS = 'SET_JOINS';
export const SET_QUERY = 'SET_QUERY';
export const TRIGGER_REFRESH_TIMER = 'TRIGGER_REFRESH_TIMER';
export const UPDATE_LAYER_PROP = 'UPDATE_LAYER_PROP';
export const UPDATE_LAYER_STYLE = 'UPDATE_LAYER_STYLE';
export const TOUCH_LAYER = 'TOUCH_LAYER';
export const UPDATE_SOURCE_PROP = 'UPDATE_SOURCE_PROP';
export const SET_REFRESH_CONFIG = 'SET_REFRESH_CONFIG';
export const SET_MOUSE_COORDINATES = 'SET_MOUSE_COORDINATES';
export const CLEAR_MOUSE_COORDINATES = 'CLEAR_MOUSE_COORDINATES';
export const SET_GOTO = 'SET_GOTO';
export const CLEAR_GOTO = 'CLEAR_GOTO';
export const TRACK_CURRENT_LAYER_STATE = 'TRACK_CURRENT_LAYER_STATE';
export const ROLLBACK_TO_TRACKED_LAYER_STATE = 'ROLLBACK_TO_TRACKED_LAYER_STATE';
export const REMOVE_TRACKED_LAYER_STATE = 'REMOVE_TRACKED_LAYER_STATE';

function getLayerLoadingCallbacks(dispatch, layerId) {
  return {
    startLoading: (dataId, requestToken, meta) => dispatch(startDataLoad(layerId, dataId, requestToken, meta)),
    stopLoading: (dataId, requestToken, data, meta) => dispatch(endDataLoad(layerId, dataId, requestToken, data, meta)),
    onLoadError: (dataId, requestToken, errorMessage) => dispatch(onDataLoadError(layerId, dataId, requestToken, errorMessage)),
    onRefreshStyle: async () => {
      await dispatch({
        type: TOUCH_LAYER,
        layerId: layerId
      });
    },
    updateSourceData: (newData) => {
      dispatch(updateSourceDataRequest(layerId, newData));
    }
  };
}

async function syncDataForAllLayers(getState, dispatch, dataFilters) {
  const state = getState();
  const layerList = getLayerList(state);
  const syncs = layerList.map(layer => {
    const loadingFunctions = getLayerLoadingCallbacks(dispatch, layer.getId());
    return layer.syncData({ ...loadingFunctions, dataFilters });
  });
  await Promise.all(syncs);
}

export function trackCurrentLayerState(layerId) {
  return {
    type: TRACK_CURRENT_LAYER_STATE,
    layerId: layerId
  };
}

export function rollbackToTrackedLayerStateForSelectedLayer() {
  return async (dispatch, getState) => {
    const layerId = getSelectedLayerId(getState());
    await dispatch({
      type: ROLLBACK_TO_TRACKED_LAYER_STATE,
      layerId: layerId
    });
    dispatch(syncDataForLayer(layerId));
  };
}

export function removeTrackedLayerStateForSelectedLayer() {
  return (dispatch, getState) => {
    const layerId = getSelectedLayerId(getState());
    dispatch({
      type: REMOVE_TRACKED_LAYER_STATE,
      layerId: layerId
    });
  };
}

export function replaceLayerList(newLayerList) {
  return (dispatch, getState) => {
    getLayerListRaw(getState()).forEach(({ id }) => {
      dispatch(removeLayer(id));
    });

    newLayerList.forEach(layerDescriptor => {
      dispatch(addLayer(layerDescriptor));
    });
  };
}

export function addLayer(layerDescriptor) {
  return (dispatch, getState) => {
    const isMapReady = getMapReady(getState());
    if (!isMapReady) {
      dispatch({
        type: ADD_WAITING_FOR_MAP_READY_LAYER,
        layer: layerDescriptor,
      });
      return;
    }

    dispatch({
      type: ADD_LAYER,
      layer: layerDescriptor,
    });
    dispatch(syncDataForLayer(layerDescriptor.id));
  };
}

export function setLayerErrorStatus(layerId, errorMessage) {
  return dispatch => {
    dispatch({
      type: SET_LAYER_ERROR_STATUS,
      layerId,
      errorMessage,
    });
  };
}

export function toggleLayerVisible(layerId) {
  return async (dispatch, getState) => {
    //if the current-state is invisible, we also want to sync data
    //e.g. if a layer was invisible at start-up, it won't have any data loaded
    const layer = getLayerList(getState()).find(layer => {
      return layerId === layer.getId();
    });
    if (!layer) {
      return;
    }
    const makeVisible = !layer.isVisible();
    await dispatch({
      type: TOGGLE_LAYER_VISIBLE,
      layerId
    });
    if (makeVisible) {
      dispatch(syncDataForLayer(layerId));
    }
  };

}

export function setSelectedLayer(layerId) {
  return async (dispatch, getState) => {
    const oldSelectedLayer = getSelectedLayerId(getState());
    if (oldSelectedLayer) {
      await dispatch(rollbackToTrackedLayerStateForSelectedLayer());
    }
    if (layerId) {
      dispatch(trackCurrentLayerState(layerId));
    }
    dispatch({
      type: SET_SELECTED_LAYER,
      selectedLayerId: layerId
    });
  };
}

export function removeTransientLayer() {
  return async (dispatch, getState) => {
    const transientLayerId = getTransientLayerId(getState());
    if (transientLayerId) {
      await dispatch(removeLayer(transientLayerId));
      await dispatch(setTransientLayer(null));
    }
  };
}

export function setTransientLayer(layerId) {
  return  {
    type: SET_TRANSIENT_LAYER,
    transientLayerId: layerId,
  };
}

export function clearTransientLayerStateAndCloseFlyout() {
  return async dispatch => {
    await dispatch(updateFlyout(FLYOUT_STATE.NONE));
    await dispatch(setSelectedLayer(null));
    await dispatch(removeTransientLayer());
  };
}

export function updateLayerOrder(newLayerOrder) {
  return {
    type: UPDATE_LAYER_ORDER,
    newLayerOrder
  };
}

export function mapReady() {
  return (dispatch, getState) => {
    dispatch({
      type: MAP_READY,
    });

    getWaitingForMapReadyLayerListRaw(getState()).forEach(layerDescriptor => {
      dispatch(addLayer(layerDescriptor));
    });

    dispatch({
      type: CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST,
    });
  };
}

export function mapDestroyed() {
  return {
    type: MAP_DESTROYED
  };
}

export function mapExtentChanged(newMapConstants) {
  return async (dispatch, getState) => {
    const state = getState();
    const dataFilters = getDataFilters(state);
    const { extent, zoom: newZoom } = newMapConstants;
    const { buffer, zoom: currentZoom } = dataFilters;

    if (extent) {
      let doesBufferContainExtent = false;
      if (buffer) {
        const bufferGeometry = turf.bboxPolygon([
          buffer.minLon,
          buffer.minLat,
          buffer.maxLon,
          buffer.maxLat
        ]);
        const extentGeometry = turf.bboxPolygon([
          extent.minLon,
          extent.minLat,
          extent.maxLon,
          extent.maxLat
        ]);

        doesBufferContainExtent = turfBooleanContains(bufferGeometry, extentGeometry);
      }

      if (!doesBufferContainExtent || currentZoom !== newZoom) {
        const scaleFactor = 0.5; // TODO put scale factor in store and fetch with selector
        const width = extent.maxLon - extent.minLon;
        const height = extent.maxLat - extent.minLat;
        dataFilters.buffer = {
          minLon: extent.minLon - width * scaleFactor,
          minLat: extent.minLat - height * scaleFactor,
          maxLon: extent.maxLon + width * scaleFactor,
          maxLat: extent.maxLat + height * scaleFactor
        };
      }
    }

    dispatch({
      type: MAP_EXTENT_CHANGED,
      mapState: {
        ...dataFilters,
        ...newMapConstants
      }
    });
    const newDataFilters =  { ...dataFilters, ...newMapConstants };
    await syncDataForAllLayers(getState, dispatch, newDataFilters);
  };
}

export function setMouseCoordinates({ lat, lon }) {
  let safeLon = lon;
  if (lon > 180) {
    const overlapWestOfDateLine = lon - 180;
    safeLon = -180 + overlapWestOfDateLine;
  } else if (lon < -180) {
    const overlapEastOfDateLine = Math.abs(lon) - 180;
    safeLon = 180 - overlapEastOfDateLine;
  }

  return {
    type: SET_MOUSE_COORDINATES,
    lat,
    lon: safeLon,
  };
}

export function clearMouseCoordinates() {
  return { type: CLEAR_MOUSE_COORDINATES };
}


export function fitToLayerExtent(layerId) {
  return async function (dispatch, getState) {
    const targetLayer = getLayerList(getState()).find(layer => {
      return layer.getId() === layerId;
    });

    if (targetLayer) {
      const dataFilters = getDataFilters(getState());
      const bounds = await targetLayer.getBounds(dataFilters);
      if (bounds) {
        await dispatch(setGotoWithBounds(bounds));
      }
    }
  };
}

export function setGotoWithBounds(bounds) {
  return {
    type: SET_GOTO,
    bounds: bounds
  };
}


export function setGotoWithCenter({ lat, lon, zoom }) {
  return {
    type: SET_GOTO,
    center: { lat, lon, zoom }
  };
}

export function clearGoto() {
  return { type: CLEAR_GOTO };
}

export function startDataLoad(layerId, dataId, requestToken, meta = {}) {
  return ({
    meta,
    type: LAYER_DATA_LOAD_STARTED,
    layerId,
    dataId,
    requestToken
  });
}

export function updateSourceDataRequest(layerId, newData) {
  return ({
    type: UPDATE_SOURCE_DATA_REQUEST,
    dataId: SOURCE_DATA_ID_ORIGIN,
    layerId,
    newData
  });
}

export function endDataLoad(layerId, dataId, requestToken, data, meta) {
  return ({
    type: LAYER_DATA_LOAD_ENDED,
    layerId,
    dataId,
    data,
    meta,
    requestToken
  });
}

export function onDataLoadError(layerId, dataId, requestToken, errorMessage) {
  return async (dispatch) => {
    dispatch({
      type: LAYER_DATA_LOAD_ERROR,
      layerId,
      dataId,
      requestToken,
    });

    dispatch(setLayerErrorStatus(layerId, errorMessage));
  };
}

export function updateSourceProp(layerId, propName, value) {
  return async (dispatch) => {
    dispatch({
      type: UPDATE_SOURCE_PROP,
      layerId,
      propName,
      value,
    });
    await dispatch(clearMissingStyleProperties(layerId));
    dispatch(syncDataForLayer(layerId));
  };
}

export function syncDataForLayer(layerId) {
  return async (dispatch, getState) => {
    const targetLayer = getLayerList(getState()).find(layer => {
      return layer.getId() === layerId;
    });
    if (targetLayer) {
      const dataFilters = getDataFilters(getState());
      const loadingFunctions = getLayerLoadingCallbacks(dispatch, layerId);
      await targetLayer.syncData({
        ...loadingFunctions,
        dataFilters
      });
    }
  };
}

export function updateLayerLabel(id, newLabel) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'label',
    newValue: newLabel,
  };
}

export function updateLayerMinZoom(id, minZoom) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'minZoom',
    newValue: minZoom,
  };
}

export function updateLayerMaxZoom(id, maxZoom) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'maxZoom',
    newValue: maxZoom,
  };
}

export function updateLayerAlpha(id, alpha) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'alpha',
    newValue: alpha,
  };
}

export function removeSelectedLayer() {
  return (dispatch, getState) => {
    const state = getState();
    const layerId = getSelectedLayerId(state);
    dispatch(removeLayer(layerId));
    dispatch(setSelectedLayer(null));
  };
}

export function removeLayer(id) {
  return (dispatch, getState) => {
    const layerGettingRemoved = getLayerList(getState()).find(layer => {
      return id === layer.getId();
    });
    if (layerGettingRemoved) {
      layerGettingRemoved.destroy();
    }

    dispatch({
      type: REMOVE_LAYER,
      id
    });
  };
}

export function setQuery({ query, timeFilters }) {
  return async (dispatch, getState) => {
    dispatch({
      type: SET_QUERY,
      timeFilters,
      query: {
        ...query,
        // ensure query changes to trigger re-fetch even when query is the same because "Refresh" clicked
        queryLastTriggeredAt: (new Date()).toISOString(),
      },
    });

    const dataFilters = getDataFilters(getState());
    await syncDataForAllLayers(getState, dispatch, dataFilters);
  };
}

export function setRefreshConfig({ isPaused, interval }) {
  return {
    type: SET_REFRESH_CONFIG,
    isPaused,
    interval,
  };
}

export function triggerRefreshTimer() {
  return async (dispatch, getState) => {
    dispatch({
      type: TRIGGER_REFRESH_TIMER,
    });

    const dataFilters = getDataFilters(getState());
    await syncDataForAllLayers(getState, dispatch, dataFilters);
  };
}

export function clearMissingStyleProperties(layerId) {
  return async (dispatch, getState) => {
    const targetLayer = getLayerList(getState()).find(layer => {
      return layer.getId() === layerId;
    });
    if (!targetLayer) {
      return;
    }

    const style = targetLayer.getCurrentStyle();
    if (!style) {
      return;
    }
    const ordinalFields = await targetLayer.getOrdinalFields();
    const { hasChanges, nextStyleDescriptor } = style.getDescriptorWithMissingStylePropsRemoved(ordinalFields);
    if (hasChanges) {
      dispatch(updateLayerStyle(layerId, nextStyleDescriptor));
    }
  };
}

export function updateLayerStyle(layerId, styleDescriptor) {
  return (dispatch) => {
    dispatch({
      type: UPDATE_LAYER_STYLE,
      layerId,
      style: {
        ...styleDescriptor
      },
    });

    // Style update may require re-fetch, for example ES search may need to retrieve field used for dynamic styling
    dispatch(syncDataForLayer(layerId));
  };
}

export function updateLayerStyleForSelectedLayer(styleDescriptor) {
  return (dispatch, getState) => {
    const selectedLayerId = getSelectedLayerId(getState());
    if (!selectedLayerId) {
      return;
    }
    dispatch(updateLayerStyle(selectedLayerId, styleDescriptor));
  };
}

export function setJoinsForLayer(layer, joins) {
  return async (dispatch) => {
    await dispatch({
      type: SET_JOINS,
      layer: layer,
      joins: joins
    });

    await dispatch(clearMissingStyleProperties(layer.getId()));
    dispatch(syncDataForLayer(layer.getId()));
  };
}
