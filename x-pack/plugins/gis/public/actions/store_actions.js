/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import turf from 'turf';
import turfBooleanContains from '@turf/boolean-contains';

import { GIS_API_PATH } from '../../common/constants';
import {
  getLayerList,
  getLayerListRaw,
  getDataFilters,
  getSelectedLayer,
  getMapReady,
  getWaitingForMapReadyLayerListRaw,
} from '../selectors/map_selectors';
import { timeService } from '../kibana_services';

export const SET_SELECTED_LAYER = 'SET_SELECTED_LAYER';
export const UPDATE_LAYER_ORDER = 'UPDATE_LAYER_ORDER';
export const ADD_LAYER = 'ADD_LAYER';
export const ADD_WAITING_FOR_MAP_READY_LAYER = 'ADD_WAITING_FOR_MAP_READY_LAYER';
export const CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST = 'CLEAR_WAITING_FOR_MAP_READY_LAYER_LIST';
export const REMOVE_LAYER = 'REMOVE_LAYER';
export const PROMOTE_TEMPORARY_LAYERS = 'PROMOTE_TEMPORARY_LAYERS';
export const SET_META = 'SET_META';
export const TOGGLE_LAYER_VISIBLE = 'TOGGLE_LAYER_VISIBLE';
export const MAP_EXTENT_CHANGED = 'MAP_EXTENT_CHANGED';
export const MAP_READY = 'MAP_READY';
export const MAP_DESTROYED = 'MAP_DESTROYED';
export const LAYER_DATA_LOAD_STARTED = 'LAYER_DATA_LOAD_STARTED';
export const LAYER_DATA_LOAD_ENDED = 'LAYER_DATA_LOAD_ENDED';
export const LAYER_DATA_LOAD_ERROR = 'LAYER_DATA_LOAD_ERROR';
export const SET_JOINS = 'SET_JOINS';
export const SET_TIME_FILTERS = 'SET_TIME_FILTERS';
export const SET_QUERY = 'SET_QUERY';
export const TRIGGER_REFRESH_TIMER = 'TRIGGER_REFRESH_TIMER';
export const UPDATE_LAYER_PROP = 'UPDATE_LAYER_PROP';
export const UPDATE_LAYER_STYLE_FOR_SELECTED_LAYER = 'UPDATE_LAYER_STYLE';
export const PROMOTE_TEMPORARY_STYLES = 'PROMOTE_TEMPORARY_STYLES';
export const CLEAR_TEMPORARY_STYLES = 'CLEAR_TEMPORARY_STYLES';
export const TOUCH_LAYER = 'TOUCH_LAYER';
export const UPDATE_LAYER_ALPHA_VALUE = 'UPDATE_LAYER_ALPHA_VALUE';
export const UPDATE_SOURCE_PROP = 'UPDATE_SOURCE_PROP';
export const SET_REFRESH_CONFIG = 'SET_REFRESH_CONFIG';
export const SET_MOUSE_COORDINATES = 'SET_MOUSE_COORDINATES';
export const CLEAR_MOUSE_COORDINATES = 'CLEAR_MOUSE_COORDINATES';
export const SET_GOTO = 'SET_GOTO';
export const CLEAR_GOTO = 'CLEAR_GOTO';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

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
    dispatch(clearTemporaryLayers());

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

export function toggleLayerVisible(layerId) {
  return {
    type: TOGGLE_LAYER_VISIBLE,
    layerId
  };
}

export function setSelectedLayer(layerId) {
  return {
    type: SET_SELECTED_LAYER,
    selectedLayerId: layerId
  };
}

export function updateLayerOrder(newLayerOrder) {
  return {
    type: UPDATE_LAYER_ORDER,
    newLayerOrder
  };
}

export function promoteTemporaryStyles() {
  return {
    type: PROMOTE_TEMPORARY_STYLES
  };
}

export function promoteTemporaryLayers() {
  return {
    type: PROMOTE_TEMPORARY_LAYERS
  };
}

export function clearTemporaryStyles() {
  return {
    type: CLEAR_TEMPORARY_STYLES
  };
}

export function clearTemporaryLayers() {
  return (dispatch, getState) => {
    getLayerListRaw(getState()).forEach(({ temporary, id }) => {
      if (temporary) {
        dispatch(removeLayer(id));
      }
    });
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
  return {
    type: SET_MOUSE_COORDINATES,
    lat,
    lon,
  };
}

export function clearMouseCoordinates() {
  return { type: CLEAR_MOUSE_COORDINATES };
}

export function setGoto({ lat, lon, zoom }) {
  return {
    type: SET_GOTO,
    lat,
    lon,
    zoom,
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
  return ({
    type: LAYER_DATA_LOAD_ERROR,
    layerId,
    dataId,
    requestToken,
    errorMessage
  });
}

export function updateSourceProp(layerId, propName, value) {

  return (dispatch) => {
    dispatch({
      type: UPDATE_SOURCE_PROP,
      layerId,
      propName,
      value,
    });

    dispatch(syncDataForLayer(layerId));
  };
}

export function syncDataForLayer(layerId) {
  return (dispatch, getState) => {
    const targetLayer = getLayerList(getState()).find(layer => {
      return layer.getId() === layerId;
    });
    if (targetLayer) {
      const dataFilters = getDataFilters(getState());
      const loadingFunctions = getLayerLoadingCallbacks(dispatch, layerId);
      targetLayer.syncData({ ...loadingFunctions, dataFilters });
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

export function updateLayerAlphaValue(id, newAlphaValue) {
  return {
    type: UPDATE_LAYER_ALPHA_VALUE,
    id,
    newAlphaValue
  };
}

export function removeSelectedLayer() {
  return (dispatch, getState) => {
    const state = getState();
    const layer = getSelectedLayer(state);
    dispatch(removeLayer(layer.getId()));
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

export function setMeta(metaJson) {
  return async dispatch => {
    dispatch({
      type: SET_META,
      meta: metaJson
    });
  };
}

export function setTimeFiltersToKbnGlobalTime() {
  return (dispatch) => {
    dispatch(setTimeFilters(timeService.getTime()));
  };
}

export function setTimeFilters({ from, to }) {
  return async (dispatch, getState) => {
    dispatch({
      type: SET_TIME_FILTERS,
      from,
      to,
    });

    // Update Kibana global time
    const kbnTime = timeService.getTime();
    if ((to && to !== kbnTime.to) || (from && from !== kbnTime.from)) {
      timeService.setTime({ from, to });
    }

    const dataFilters = getDataFilters(getState());
    await syncDataForAllLayers(getState, dispatch, dataFilters);
  };
}

export function setQuery({ query }) {
  return async (dispatch, getState) => {
    dispatch({
      type: SET_QUERY,
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
  return async (dispatch) => {
    dispatch({
      type: SET_REFRESH_CONFIG,
      isPaused,
      interval,
    });

    // Update Kibana global refresh
    const kbnRefresh = timeService.getRefreshInterval();
    if (isPaused !== kbnRefresh.pause || interval !== kbnRefresh.value) {
      timeService.setRefreshInterval({
        pause: isPaused,
        value: interval,
      });
    }
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

export function updateLayerStyleForSelectedLayer(style, temporary = true) {
  return async (dispatch, getState) => {
    await dispatch({
      type: UPDATE_LAYER_STYLE_FOR_SELECTED_LAYER,
      style: {
        ...style,
        temporary
      },
    });
    const layer = getSelectedLayer(getState());
    dispatch(syncDataForLayer(layer.getId()));
  };
}

export function setJoinsForLayer(layer, joins) {
  return async (dispatch) => {
    console.warn('Not Implemented: must remove any styles that are driven by join-fields that are no longer present');
    await dispatch({
      type: SET_JOINS,
      layer: layer,
      joins: joins
    });

    dispatch(syncDataForLayer(layer.getId()));
  };
}

export async function loadMetaResources(dispatch) {
  const meta = await fetch(`${GIS_API_RELATIVE}/meta`);
  const metaJson = await meta.json();
  await dispatch(setMeta(metaJson));
}
