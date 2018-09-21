/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GIS_API_PATH } from '../../common/constants';
import { getLayerList, getDataFilters } from '../selectors/map_selectors';

export const SET_SELECTED_LAYER = 'SET_SELECTED_LAYER';
export const UPDATE_LAYER_ORDER = 'UPDATE_LAYER_ORDER';
export const ADD_LAYER = 'ADD_LAYER';
export const REMOVE_LAYER = 'REMOVE_LAYER';
export const PROMOTE_TEMPORARY_LAYERS = 'PROMOTE_TEMPORARY_LAYERS';
export const CLEAR_TEMPORARY_LAYERS = 'CLEAR_TEMPORARY_LAYERS';
export const SET_META = 'SET_META';
export const TOGGLE_LAYER_VISIBLE = 'TOGGLE_LAYER_VISIBLE';
export const MAP_EXTENT_CHANGED = 'MAP_EXTENT_CHANGED';
export const MAP_READY = 'MAP_READY';
export const LAYER_DATA_LOAD_STARTED = 'LAYER_DATA_LOAD_STARTED';
export const LAYER_DATA_LOAD_ENDED = 'LAYER_DATA_LOAD_ENDED';
export const REPLACE_LAYERLIST = 'REPLACE_LAYERLIST';
export const SET_TIME_FILTERS = 'SET_TIME_FILTERS';
export const UPDATE_LAYER_LABEL = 'UPDATE_LAYER_LABEL';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

function getLayerLoadingFunctions(dispatch, layerId, tokenString) {
  const requestToken = Symbol(tokenString);
  return {
    startLoading: initData => dispatch(startDataLoad(layerId, requestToken, initData)),
    stopLoading: returnData => dispatch(endDataLoad(layerId, requestToken, returnData))
  };
}

export function replaceLayerList(newLayerList) {
  const tokenString = 'data_request_sync_layerreplacement';

  return async (dispatch, getState) => {
    await dispatch({
      type: REPLACE_LAYERLIST,
      layerList: newLayerList
    });

    const state = getState();
    const layerList = getLayerList(state);
    const dataFilters = getDataFilters(state);

    layerList.forEach(layer => {
      const { startLoading, stopLoading } =
        getLayerLoadingFunctions(dispatch, layer.getId(), tokenString);
      layer.syncDataToMapState(startLoading, stopLoading, dataFilters);

    });
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

export function addLayer(layer, position = -1) {
  return async dispatch => {
    dispatch({
      type: ADD_LAYER,
      layer,
      position
    });
  };
}

export function promoteTemporaryLayers() {
  return {
    type: PROMOTE_TEMPORARY_LAYERS
  };
}

export function clearTemporaryLayers() {
  return {
    type: CLEAR_TEMPORARY_LAYERS
  };
}

export function mapReady() {
  return {
    type: MAP_READY
  };
}

export function mapExtentChanged(newMapConstants) {
  const tokenString = 'data_request_sync_extentchange';
  return async (dispatch, getState) => {
    const state = getState();
    const dataFilters = getDataFilters(state);

    dispatch({
      type: MAP_EXTENT_CHANGED,
      mapState: {
        ...dataFilters,
        ...newMapConstants
      }
    });

    const layerList = getLayerList(state);
    layerList.forEach(layer => {
      const { startLoading, stopLoading } = getLayerLoadingFunctions(
        dispatch, layer.getId(), tokenString);
      layer.syncDataToMapState(startLoading, stopLoading,
        { ...dataFilters, ...newMapConstants });
    });
  };
}

export function startDataLoad(layerId, requestToken, meta) {
  return ({
    meta,
    type: LAYER_DATA_LOAD_STARTED,
    layerId: layerId,
    requestToken: requestToken
  });
}

export function endDataLoad(layerId, requestToken, data) {
  return ({
    type: LAYER_DATA_LOAD_ENDED,
    layerId: layerId,
    data: data,
    requestToken: requestToken
  });
}

export function addPreviewLayer(layer, position) {
  const tokenString = 'data_request';
  const layerDescriptor = layer.toLayerDescriptor();

  return async (dispatch, getState) => {
    await dispatch(addLayer(layerDescriptor, position));
    const dataFilters = getDataFilters(getState());
    const { startLoading, stopLoading } =
      getLayerLoadingFunctions(dispatch, layer.getId(), tokenString);
    layer.syncDataToMapState(startLoading, stopLoading, dataFilters);
  };
}

export function updateLayerLabel(id, newLabel) {
  return {
    type: UPDATE_LAYER_LABEL,
    id,
    newLabel
  };
}

export function removeLayer(id) {
  return {
    type: REMOVE_LAYER,
    id
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

export function setTimeFilters(timeFilters) {
  const tokenString = 'data_request_sync_timechange';
  return async (dispatch, getState) => {
    dispatch({
      type: SET_TIME_FILTERS,
      ...timeFilters
    });
    const state = getState();
    const dataFilters = getDataFilters(state);

    const layerList = getLayerList(getState());
    layerList.forEach(layer => {
      const { startLoading, stopLoading } = getLayerLoadingFunctions(
        dispatch, layer.getId(), tokenString);
      // State should be up-to-date, but just in case, pass timefilters explicitly
      layer.syncDataToMapState(startLoading, stopLoading,
        { ...dataFilters, timeFilters: { ...timeFilters } });
    });
  };
}


export async function loadMapResources(dispatch) {

  const meta = await fetch(`${GIS_API_RELATIVE}/meta`);
  const metaJson = await meta.json();
  await dispatch(setMeta(metaJson));


  await dispatch(replaceLayerList(
    [
      {
        "dataDirty": false,
        "id": "0hmz5",
        "sourceDescriptor": { "type": "EMS_TMS", "id": "road_map" },
        "visible": true,
        "temporary": false,
        "style": {},
        "type": "TILE"
      },
      {
        "id": "0pmk0",
        "sourceDescriptor": { "type": "EMS_XYZ", "urlTemplate": "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png" },
        "visible": false,
        "temporary": false,
        "style": {},
        "type": "TILE"
      },
      {
        "id": "hqoqo",
        "sourceDescriptor": { "name": "World Countries", "type": "EMS_FILE",
          "format": "geojson" },
        "visible": true,
        "temporary": false,
        "style": { "type": "FILL_AND_OUTLINE", "color": "#e6194b" },
        "type": "VECTOR"
      },
      {
        "id": "dx9uf",
        "sourceDescriptor": { "type": "ES_GEOHASH_GRID", "esIndexPattern": "log*", "pointField": "geo.coordinates" },
        "visible": true,
        "temporary": false,
        "style": { "type": "HEATMAP" },
        "type": "GEOHASH_GRID"
      }
    ]
  ));

}
