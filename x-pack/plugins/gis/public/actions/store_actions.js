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


export function addLayerFromSource(source, layerOptions = {}, position) {

  return async (dispatch) => {
    dispatch(layerLoading(true));
    //todo: creating a default layer-descriptor should just be an implementation on the source
    let layerDescriptor;
    if (source.type === XYZTMSSource.type) {
      layerDescriptor = await createDefaultLayerDescriptorForXYZTMSSource(source, layerOptions);
    } else if (source.type === EMSFileSource.type) {
      layerDescriptor = await createDefaultLayerDescriptorForEMSFileSource(source, layerOptions);
    } else {
      throw new Error('Does not recognize source-type ' + source.type);
    }
    dispatch(addLayer(layerDescriptor, position));
  };
}

async function createDefaultLayerDescriptorForEMSFileSource(emsFileSource, options) {
  const geojson = await EMSFileSource.getGeoJson(emsFileSource);
  return VectorLayer.createDescriptor({
    source: geojson,
    sourceDescriptor: emsFileSource,
    name: emsFileSource.name || emsFileSource.id,
    ...options
  });
}

async function createDefaultLayerDescriptorForXYZTMSSource(xyzTMSsource, options) {
  const service = await XYZTMSSource.getTMSOptions(xyzTMSsource);
  return TileLayer.createDescriptor({
    source: service.url,
    sourceDescriptor: xyzTMSsource,
    name: service.url,
    ...options
  });
}

export function addVectorLayerFromEMSFileSource(emsFileSource, options = {}, position) {
  return async (dispatch) => {
    dispatch(layerLoading(true));
    const layer = await createDefaultLayerDescriptorForEMSFileSource(emsFileSource, options);
    dispatch(addLayer(layer, position));
  };
}

export function addEMSTMSFromSource(sourceDescriptor, options = {}, position) {
  return async (dispatch, getState) => {
    dispatch(layerLoading(true));
    const allServices = getState().config.meta.data_sources.ems.tms;
    const service = await EMSTMSSource.getTMSOptions(sourceDescriptor, allServices);
    const layer = TileLayer.createDescriptor({
      source: service.url,
      sourceDescriptor: sourceDescriptor,
      name: sourceDescriptor.id,
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


export async function loadMapResources(dispatch) {

  const meta = await fetch(`${GIS_API_RELATIVE}/meta`);
  const metaJson = await meta.json();
  await dispatch(setMeta(metaJson));

  // Add initial layers
  const roadMapEms = EMSTMSSource.createDescriptor('road_map');
  await dispatch(addEMSTMSFromSource(roadMapEms, {}, 0));

  const worldCountries = EMSFileSource.createDescriptor('World Countries');
  await dispatch(addVectorLayerFromEMSFileSource(worldCountries, {}, 1));
}
