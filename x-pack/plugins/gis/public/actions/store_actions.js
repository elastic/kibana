/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EMSTMSSource } from "../shared/layers/sources/ems_tms_source";
// import { EMSFileSource } from "../shared/layers/sources/ems_file_source";
import { KibanaRegionmapSource } from "../shared/layers/sources/kibana_regionmap_source";
import { GIS_API_PATH } from '../../common/constants';
import { ESGeohashGridSource } from '../shared/layers/sources/es_geohashgrid_source';

export const SET_SELECTED_LAYER = 'SET_SELECTED_LAYER';
export const UPDATE_LAYER_ORDER = 'UPDATE_LAYER_ORDER';
export const ADD_LAYER = 'ADD_LAYER';
export const LAYER_LOADING = 'LAYER_LOADING';
export const REMOVE_LAYER = 'REMOVE_LAYER';
export const PROMOTE_TEMPORARY_LAYERS = 'PROMOTE_TEMPORARY_LAYERS';
export const CLEAR_TEMPORARY_LAYERS = 'CLEAR_TEMPORARY_LAYERS';
export const SET_META = 'SET_META';
export const TOGGLE_LAYER_VISIBLE = 'TOGGLE_LAYER_VISIBLE';
export const MAP_EXTENT_CHANGED = 'MAP_EXTENT_CHANGED';

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

//todo: should be on per-layer basis iso global?
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

export function mapExtentChanged(mapConstants) {
  console.log('should check for every layer if it needs data');
  return {
    type: MAP_EXTENT_CHANGED,
    mapConstants: mapConstants
  };
}

export function addLayerFromSource(source, layerOptions = {}, position) {
  return async (dispatch) => {
    dispatch(layerLoading(true));
    //todo: remove this asyncyness. data loading will get a lot more flexible..
    const layerDescriptor = await source.createDefaultLayerDescriptor(layerOptions);
    dispatch(addLayer(layerDescriptor, position));
  };
}

export function addEMSTMSFromSource(sourceDescriptor, options = {}, position) {
  return async (dispatch, getState) => {
    dispatch(layerLoading(true));
    const source = new EMSTMSSource(sourceDescriptor);
    const layer = await source.createDefaultLayerDescriptor(options, getState().config.meta.data_sources);
    dispatch(addLayer(layer, position));
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

export async function loadMapResources(dispatch) {

  const meta = await fetch(`${GIS_API_RELATIVE}/meta`);
  const metaJson = await meta.json();
  await dispatch(setMeta(metaJson));

  // Add initial layers
  // const roadMapEms = EMSTMSSource.createDescriptor('road_map');
  // await dispatch(addEMSTMSFromSource(roadMapEms, {}, 0));

  // const worldCountrySource = new EMSFileSource(EMSFileSource.createDescriptor('World Countries'));
  // await dispatch(addLayerFromSource(worldCountrySource, {}, 1));

  const worldCountrySource = new KibanaRegionmapSource(KibanaRegionmapSource.createDescriptor('../api/gis/junk'));
  await dispatch(addLayerFromSource(worldCountrySource, {}, 0));

  const heatmapsource = new ESGeohashGridSource(ESGeohashGridSource.createDescriptor({
    esIndexPattern: 'foo',
    pointField: 'bar'
  }));
  await dispatch(addLayerFromSource(heatmapsource, {}, 1));
}
