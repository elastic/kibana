/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GIS_API_PATH } from '../../common/constants';
import { getLayerList, getDataFilters, getSelectedLayer } from '../selectors/map_selectors';

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
export const LAYER_DATA_LOAD_ERROR = 'LAYER_DATA_LOAD_ERROR';
export const REPLACE_LAYERLIST = 'REPLACE_LAYERLIST';
export const SET_TIME_FILTERS = 'SET_TIME_FILTERS';
export const UPDATE_LAYER_PROP = 'UPDATE_LAYER_PROP';
export const UPDATE_LAYER_STYLE_FOR_SELECTED_LAYER = 'UPDATE_LAYER_STYLE';
export const PROMOTE_TEMPORARY_STYLES = 'PROMOTE_TEMPORARY_STYLES';
export const CLEAR_TEMPORARY_STYLES = 'CLEAR_TEMPORARY_STYLES';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

function getLayerLoadingFunctions(dispatch, layerId, tokenString) {
  const requestToken = Symbol(tokenString);
  return {
    startLoading: initData => dispatch(startDataLoad(layerId, requestToken, initData)),
    stopLoading: returnData => dispatch(endDataLoad(layerId, requestToken, returnData)),
    onLoadError: errorMessage => dispatch(onDataLoadError(layerId, requestToken, errorMessage)),
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
      const loadingFunctions = getLayerLoadingFunctions(dispatch, layer.getId(), tokenString);
      layer.syncData({ ...loadingFunctions, dataFilters });
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
      const loadingFunctions = getLayerLoadingFunctions(dispatch, layer.getId(), tokenString);
      layer.syncData({
        ...loadingFunctions,
        dataFilters: { ...dataFilters, ...newMapConstants }
      });
    });
  };
}

export function startDataLoad(layerId, requestToken, meta = {}) {
  return ({
    meta,
    type: LAYER_DATA_LOAD_STARTED,
    layerId,
    requestToken
  });
}

export function endDataLoad(layerId, requestToken, data) {
  return ({
    type: LAYER_DATA_LOAD_ENDED,
    layerId,
    data,
    requestToken
  });
}

export function onDataLoadError(layerId, requestToken, errorMessage) {
  return ({
    type: LAYER_DATA_LOAD_ERROR,
    layerId,
    requestToken,
    errorMessage
  });
}

export function addPreviewLayer(layer, position) {
  const tokenString = 'data_request';
  const layerDescriptor = layer.toLayerDescriptor();

  return async (dispatch, getState) => {
    await dispatch(addLayer(layerDescriptor, position));
    const dataFilters = getDataFilters(getState());
    const loadingFunctions = getLayerLoadingFunctions(dispatch, layer.getId(), tokenString);
    layer.syncData({ ...loadingFunctions, dataFilters });
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

export function updateLayerShowAtAllZoomLevels(id, showAtAllZoomLevels) {
  return {
    type: UPDATE_LAYER_PROP,
    id,
    propName: 'showAtAllZoomLevels',
    newValue: showAtAllZoomLevels,
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
      const loadingFunctions = getLayerLoadingFunctions(dispatch, layer.getId(), tokenString);
      layer.syncData({
        ...loadingFunctions,
        dataFilters: { ...dataFilters, timeFilters: { ...timeFilters } }
      });
    });
  };
}

export function updateLayerStyle(style, temporary = true) {
  const tokenString = 'data_request_sync_style_change';
  return async (dispatch, getState) => {
    await dispatch({
      type: UPDATE_LAYER_STYLE_FOR_SELECTED_LAYER,
      style: {
        ...style,
        temporary
      },
    });
    const state = getState();
    const dataFilters = getDataFilters(state);
    const layer = getSelectedLayer(state);
    const loadingFunctions = getLayerLoadingFunctions(dispatch, layer.getId(), tokenString);
    layer.syncData({ ...loadingFunctions, dataFilters });
  };
}

export function promoteTemporaryStyles() {
  return {
    type: PROMOTE_TEMPORARY_STYLES
  };
}

export function clearTemporaryStyles() {
  return {
    type: CLEAR_TEMPORARY_STYLES
  };
}



export async function loadMapResources(dispatch) {

  const meta = await fetch(`${GIS_API_RELATIVE}/meta`);
  const metaJson = await meta.json();
  await dispatch(setMeta(metaJson));


  await dispatch(replaceLayerList(
    [

      {
        dataDirty: false,
        id: "0hmz5",
        sourceDescriptor: { "type": "EMS_TMS", "id": "road_map" },
        visible: true,
        temporary: false,
        style: {},
        type: "TILE",
        showAtAllZoomLevels: true,
        minZoom: 0,
        maxZoom: 24,
      },
      {
        id: "0pmk0",
        sourceDescriptor: { "type": "EMS_XYZ", "urlTemplate": "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png" },
        visible: false,
        temporary: false,
        style: {},
        type: "TILE",
        showAtAllZoomLevels: true,
        minZoom: 0,
        maxZoom: 24,
      },
      {
        "dataDirty": false,
        "id": "fn5wx",
        "label": "logs* documents",
        "showAtAllZoomLevels": false,
        "minZoom": 6,
        "maxZoom": 24,
        "sourceDescriptor": {
          "type": "ES_SEARCH",
          "indexPatternId": "90943e30-9a47-11e8-b64d-95841ca0b247",
          "geoField": "geo.coordinates",
          "limit": 1000,
          "filterByMapBounds": true
        },
        "visible": true,
        "temporary": false,
        "showTooltip": true,
        "tooltipProperties": ["timestamp", "clientip", "response"],
        "style": {
          "type": "VECTOR",
          "properties": {
            "fillColor": {
              "type": "STATIC",
              "options": {
                "color": "#e6194b"
              }
            }
          }
        },
        "type": "VECTOR"
      },
      // {
      //   "id": "1pnwt",
      //   "label": null,
      //   "sourceDescriptor": {
      //     "type": "ES_SEARCH",
      //     "indexPatternId": "6e853b20-bbb5-11e8-88aa-9d8656848e00",
      //     "geoField": "geometry",
      //     "limit": 256
      //   },
      //   "visible": true,
      //   "temporary": false,
      //   "style": {
      //     "type": "VECTOR",
      //     "properties": {
      //       fillAndOutline: {
      //         type: 'STATIC',
      //         options: {
      //           color: "#e6194b"
      //         }
      //       }
      //     }
      //   },
      //   "type": "VECTOR"
      // }
    ]
  ));

}
