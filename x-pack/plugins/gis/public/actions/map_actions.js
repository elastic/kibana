/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DATA_ORIGIN } from "../shared/layers/sources/source";
import { VectorSource } from "../shared/layers/sources/vector_source";
import { TMSSource } from "../shared/layers/sources/tms_source";
import { VectorLayer } from "../shared/layers/vector_layer";
import { TileLayer } from "../shared/layers/tile_layer";

export const SET_SELECTED_LAYER = 'SET_SELECTED_LAYER';
export const UPDATE_LAYER_ORDER = 'UPDATE_LAYER_ORDER';
export const ADD_LAYER = 'ADD_LAYER';
export const LAYER_LOADING = 'LAYER_LOADING';
export const REMOVE_LAYER = 'REMOVE_LAYER';
export const PROMOTE_TEMPORARY_LAYERS = 'PROMOTE_TEMPORARY_LAYERS';
export const CLEAR_TEMPORARY_LAYERS = 'CLEAR_TEMPORARY_LAYERS';
export const ADD_SOURCE = 'ADD_SOURCE';

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

export function addLayer(layer) {
  return dispatch => {
    dispatch({
      type: ADD_LAYER,
      layer
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

export function addVectorLayer(sourceName, layerId, options = {}) {
  return async (dispatch, getState) => {
    dispatch(layerLoading(true));
    const { map } = getState();
    const vectorSource = map.sources.find(({ name }) => name === sourceName);
    const service = vectorSource.service.find(({ id }) => id === layerId);
    const vectorFetch = await fetch(service.url);
    vectorFetch.json().then(resolvedResource => {
      const layer = VectorLayer.create({
        source: resolvedResource,
        name: service.name || service.id,
        nameList: map.layerList.map(({ name }) => name),
        ...options
      });
      dispatch(addLayer(layer));
    });
  };
}

export function addTileLayer(sourceName, layerId, options = {}) {
  return (dispatch, getState) => {
    dispatch(layerLoading(true));
    const { map } = getState();
    const tmsSource = map.sources.find(({ name }) => name === sourceName);
    const service = tmsSource.service.find(({ id }) => id === layerId);
    const layer = TileLayer.create({
      source: service.url,
      name: service.name || service.id,
      nameList: map.layerList.map(({ name }) => name),
      ...options
    });
    dispatch(addLayer(layer));
  };
}

export function removeLayer(layerName) {
  return {
    type: REMOVE_LAYER,
    layerName
  };
}

export function addTMSSource(dataOrigin, service, sourceName) {
  return dispatch => {
    const source = TMSSource.create({
      dataOrigin,
      service,
      name: sourceName
    });
    dispatch({
      type: ADD_SOURCE,
      source
    });
  };
}

export function addVectorSource(dataOrigin, service, sourceName) {
  return dispatch => {
    const source = VectorSource.create({
      dataOrigin,
      service,
      name: sourceName
    });
    dispatch({
      type: ADD_SOURCE,
      source
    });
  };
}

export async function loadMapResources(serviceSettings, dispatch) {

  const tmsSource = await serviceSettings.getTMSServices();
  const emsSource = await serviceSettings.getFileLayers();

  // Sample TMS Road Map Source
  dispatch(addTMSSource(DATA_ORIGIN.EMS, tmsSource, 'road_map_source'));
  // Sample TMS OSM Source
  dispatch(addTMSSource(DATA_ORIGIN.TMS,
    [{ id: 'osm', url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png' }], 'osm_source'));
  // EMS Vector Source
  dispatch(addVectorSource(DATA_ORIGIN.EMS, emsSource, 'ems_source'));

  // Add initial layers
  dispatch(addTileLayer('road_map_source', 'road_map', { name: 'Road Map' }));
  dispatch(addTileLayer('osm_source', 'osm', { name: 'Open Street Maps' }));
  dispatch(addVectorLayer('ems_source', 5715999101812736, { name: 'World Countries' }));
}
