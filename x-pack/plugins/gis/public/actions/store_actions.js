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
export const SET_JOINS = 'SET_JOINS';
export const SET_TIME_FILTERS = 'SET_TIME_FILTERS';
export const UPDATE_LAYER_PROP = 'UPDATE_LAYER_PROP';
export const UPDATE_LAYER_STYLE_FOR_SELECTED_LAYER = 'UPDATE_LAYER_STYLE';
export const PROMOTE_TEMPORARY_STYLES = 'PROMOTE_TEMPORARY_STYLES';
export const CLEAR_TEMPORARY_STYLES = 'CLEAR_TEMPORARY_STYLES';
export const TOUCH_LAYER = 'TOUCH_LAYER';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

function getLayerLoadingCallbacks(dispatch, layerId) {
  return {
    startLoading: (dataId, requestToken, initData) => dispatch(startDataLoad(layerId, dataId, requestToken, initData)),
    stopLoading: (dataId, requestToken, returnData) => dispatch(endDataLoad(layerId, dataId, requestToken, returnData)),
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
  return async (dispatch, getState) => {
    await dispatch({
      type: REPLACE_LAYERLIST,
      layerList: newLayerList
    });
    const dataFilters = getDataFilters(getState());
    await syncDataForAllLayers(getState, dispatch, dataFilters);
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
    const newDataFilters =  { ...dataFilters, ...newMapConstants };
    await syncDataForAllLayers(getState, dispatch, newDataFilters);
  };
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

export function endDataLoad(layerId, dataId, requestToken, data) {
  return ({
    type: LAYER_DATA_LOAD_ENDED,
    layerId,
    dataId,
    data,
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

export function addPreviewLayer(layer, position) {

  const layerDescriptor = layer.toLayerDescriptor();

  return async (dispatch, getState) => {
    await dispatch(addLayer(layerDescriptor, position));
    const dataFilters = getDataFilters(getState());
    const loadingFunctions = getLayerLoadingCallbacks(dispatch, layer.getId());
    await layer.syncData({ ...loadingFunctions, dataFilters });
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

// export function updateLayerShowAtAllZoomLevels(id, showAtAllZoomLevels) {
//   return {
//     type: UPDATE_LAYER_PROP,
//     id,
//     propName: 'showAtAllZoomLevels',
//     newValue: showAtAllZoomLevels,
//   };
// }

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
  return async (dispatch, getState) => {
    dispatch({
      type: SET_TIME_FILTERS,
      ...timeFilters
    });

    const dataFilters = getDataFilters(getState());
    const newDataFilters = { ...dataFilters, timeFilters: { ...timeFilters } };
    await syncDataForAllLayers(getState, dispatch, newDataFilters);
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
    const state = getState();
    const dataFilters = getDataFilters(state);
    const layer = getSelectedLayer(state);
    const loadingFunctions = getLayerLoadingCallbacks(dispatch, layer.getId());
    await layer.syncData({ ...loadingFunctions, dataFilters });
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


export function setJoinsForLayer(layer, joins) {
  return async (dispatch, getState) => {
    await dispatch({
      type: SET_JOINS,
      layer: layer,
      joins: joins
    });
    const dataFilters = getDataFilters(getState());
    const layersWithJoin = getLayerList(getState());
    const layerWithJoin = layersWithJoin.find(lwj => lwj.getId() === layer.getId());
    const loadingFunctions = getLayerLoadingCallbacks(dispatch, layer.getId());
    await layerWithJoin.syncData({ ...loadingFunctions, dataFilters });
  };
}

export async function loadMetaResources(dispatch) {
  const meta = await fetch(`${GIS_API_RELATIVE}/meta`);
  const metaJson = await meta.json();
  await dispatch(setMeta(metaJson));
}

export async function loadMapResources(dispatch) {
  await dispatch(replaceLayerList(
    [
      {
        id: "0hmz5",
        label: 'light theme tiles',
        sourceDescriptor: { "type": "EMS_TMS", "id": "road_map" },
        visible: true,
        temporary: false,
        style: {},
        type: "TILE",
        // showAtAllZoomLevels: true,
        minZoom: 0,
        maxZoom: 24,
      }
    ]
  ));

}
