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
export const ADD_LAYER = 'ADD_LAYER';

export function setSelectedLayer(layer) {
  return {
    type: SET_SELECTED_LAYER,
    selectedLayer: layer
  };
}

export function updateLayerOrder(newLayerOrder) {
  return {
    type: UPDATE_LAYER_ORDER,
    newLayerOrder
  };
}

export function addLayer(layer) {
  return {
    type: ADD_LAYER,
    layer
  };
}

export async function loadMapResources(serviceSettings, dispatch) {
  const tmsServices = await serviceSettings.getTMSServices();
  const fileLayers = await serviceSettings.getFileLayers();

  // Sample TMS
  const roadMapTms = TMSSource.create({
    dataOrigin: DATA_ORIGIN.EMS,
    service: tmsServices,
    serviceId: 'road_map'
  });
  // Sample OSM service
  const osmTms = TMSSource.create({
    dataOrigin: DATA_ORIGIN.TMS,
    service: [{ url: 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png' }],
    serviceId: 'osm'
  });
  // Sample Vector File
  const wcLayerService = fileLayers.find(fileLayer =>
    fileLayer.name === 'World Countries');
  VectorSource.create({
    dataOrigin: DATA_ORIGIN.CONFIG,
    service: wcLayerService,
    layerName: 'World Countries'
  }).then(worldCountriesVector => {
    // Add sample layers
    [
      TileLayer.create({ source: roadMapTms }),
      TileLayer.create({ source: osmTms }),
      VectorLayer.create({ source: worldCountriesVector })
    ].forEach(layer => {
      dispatch(addLayer(layer));
    });
  });
}
