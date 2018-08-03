/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMSTMSSource } from "../shared/layers/sources/ems_tms_source";
import { EMSFileSource } from "../shared/layers/sources/ems_file_source";
import { XYZTMSSource } from "../shared/layers/sources/xyz_tms_source";

import { VectorLayer } from "../shared/layers/vector_layer";
import { TileLayer } from "../shared/layers/tile_layer";

import { GIS_API_PATH } from '../../common/constants';

export const SET_SELECTED_LAYER = 'SET_SELECTED_LAYER';
export const UPDATE_LAYER_ORDER = 'UPDATE_LAYER_ORDER';
export const ADD_LAYER = 'ADD_LAYER';
export const LAYER_LOADING = 'LAYER_LOADING';
export const REMOVE_LAYER = 'REMOVE_LAYER';
export const PROMOTE_TEMPORARY_LAYERS = 'PROMOTE_TEMPORARY_LAYERS';
export const CLEAR_TEMPORARY_LAYERS = 'CLEAR_TEMPORARY_LAYERS';
export const SET_META = 'SET_META';
export const TOGGLE_LAYER_VISIBLE = 'TOGGLE_LAYER_VISIBLE';

const GIS_API_RELATIVE = `../${GIS_API_PATH}`;

export function toggleLayerVisible(layerId) {
  return {
    type: TOGGLE_LAYER_VISIBLE,
    layerId
  };
}

export function setSelectedLayer(layerId) {
  return {
    type: SET_SELECTED_LAYER,
    selectedLayer: layerId
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
    dispatch(layerLoading(false));
  };
}


export function layerLoading(loadingBool) {
  return {
    type: LAYER_LOADING,
    loadingBool
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

export function addVectorLayerFromEMSFileSource(emsFileSource, options = {}, position) {
  return async (dispatch, getState) => {

    dispatch(layerLoading(true));

    const allFiles = getState().map.meta.data_sources.ems.file;
    const geojson = await EMSFileSource.getGeoJson(emsFileSource, allFiles);
    const layer = VectorLayer.create({
      source: geojson,
      name: emsFileSource.name || emsFileSource.id,
      ...options
    });

    dispatch(addLayer(layer, position));
  };
}

export function addXYZTMSLayerFromSource(xyzTMSsource, options = {}, position) {
  return async (dispatch) => {
    dispatch(layerLoading(true));
    const service = await XYZTMSSource.getTMSOptions(xyzTMSsource);
    const layer = TileLayer.create({
      source: service.url,
      name: service.url,
      ...options
    });
    dispatch(addLayer(layer, position));
  };
}

export function addEMSTMSFromSource(source, options = {}, position) {
  return async (dispatch, getState) => {
    dispatch(layerLoading(true));
    const allServices = getState().map.meta.data_sources.ems.tms;
    const service = await EMSTMSSource.getTMSOptions(source, allServices);
    const layer = TileLayer.create({
      source: service.url,
      name: source.id,
      ...options
    });
    dispatch(addLayer(layer, position));
  };
}

export function removeLayer(layerName) {
  return {
    type: REMOVE_LAYER,
    layerName
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


export async function loadMapResources(serviceSettings, dispatch) {

  const meta = await fetch(`${GIS_API_RELATIVE}/meta`);
  const metaJson = await meta.json();
  await dispatch(setMeta(metaJson));

  // Add initial layers
  const roadMapEms = EMSTMSSource.createDescriptor('road_map');
  await dispatch(addEMSTMSFromSource(roadMapEms, {}, 0));

  const worldCountries = EMSFileSource.createDescriptor('World Countries');
  await dispatch(addVectorLayerFromEMSFileSource(worldCountries, {}, 1));

}
