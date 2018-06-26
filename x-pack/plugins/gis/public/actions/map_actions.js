/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DATA_ORIGIN } from "../components/map/layers/sources/source";
import { VectorSource } from "../components/map/layers/sources/vector_source";
import { TMSSource } from "../components/map/layers/sources/tms_source";
import { VectorLayer } from "../components/map/layers/vector_layer";
import { TileLayer } from "../components/map/layers/tile_layer";

export const SET_SELECTED_LAYER = 'SET_SELECTED_LAYER';
export const UPDATE_LAYER_ORDER = 'UPDATE_LAYER_ORDER';
export const ADD_VECTOR_LAYER = 'ADD_VECTOR_LAYER';
export const ADD_TILE_LAYER = 'ADD_TILE_LAYER';
export const ADD_VECTOR_SOURCE = 'ADD_VECTOR_SOURCE';
export const ADD_TMS_SOURCE = 'ADD_TMS_SOURCE';

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

export function addVectorLayer(sourceName, layerName) {
  return async (dispatch, getState) => {
    const { map } = getState();
    const vectorSource = map.vectorSources.find(
      source => source.name === sourceName);
    //TODO: Grab by name
    const vectorFetch = await fetch(vectorSource.service[0].url);
    vectorFetch.json().then(resolvedResource => {
      const layer = VectorLayer.create({
        layerName,
        source: resolvedResource
      });
      dispatch({
        type: ADD_VECTOR_LAYER,
        layer
      });
    });
  };
}

export function addTileLayer(sourceName, layerName) {
  return (dispatch, getState) => {
    const { map } = getState();
    const tmsSource = map.tmsSources.find(
      source => source.name === sourceName);
    const layer = TileLayer.create({
      layerName,
      //TODO: Grab by name
      source: tmsSource.service[0].url
    });
    dispatch({
      type: ADD_TILE_LAYER,
      layer
    });
  };
}

export function addTMSSource(dataOrigin, service, sourceName) {
  return dispatch => {
    const tms = TMSSource.create({
      dataOrigin,
      service,
      name: sourceName
    });
    dispatch({
      type: ADD_TMS_SOURCE,
      tms
    });
  };
}

export function addVectorSource(dataOrigin, service, sourceName) {
  return dispatch => {
    const vectorSource = VectorSource.create({
      dataOrigin,
      service,
      name: sourceName
    });
    dispatch({
      type: ADD_VECTOR_SOURCE,
      vectorSource
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
    [{ url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png' }], 'osm_source'));
  // EMS Vector Source
  dispatch(addVectorSource(DATA_ORIGIN.CONFIG, emsSource, 'ems_source'));

  // Add initial layers
  dispatch(addTileLayer('road_map_source', 'road_map'));
  dispatch(addTileLayer('osm_source', 'osm'));
  dispatch(addVectorLayer('ems_source', 'world_countries'));
}
