/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { getLayerList, getMapState, getDataSources } from "../../../selectors/map_selectors";
import mapboxgl from 'mapbox-gl';

function removeOrphanedSourcesAndLayers(mbMap, layerList) {

  const layerIds = layerList.map((layer) => layer.getId());
  const mbStyle = mbMap.getStyle();
  const mbSourcesToRemove = [];
  for (const sourceId in mbStyle.sources) {
    if (layerIds.indexOf(sourceId) === -1) {
      mbSourcesToRemove.push(sourceId);
    }
  }
  const mbLayersToRemove = [];
  mbStyle.layers.forEach(layer => {
    if (mbSourcesToRemove.indexOf(layer.source) >= 0) {
      mbLayersToRemove.push(layer.id);
    }
  });
  mbLayersToRemove.forEach((layerId) => {
    mbMap.removeLayer(layerId);
  });
  mbSourcesToRemove.forEach(sourceId => {
    mbMap.removeSource(sourceId);
  });

}

function syncLayerOrder(mbMap, layerList) {

  const mbStyle = mbMap.getStyle();
  const mbLayers = mbStyle.layers.slice();
  for (let i = 0; i < layerList.length - 1; i++) {
    const layer = layerList[i];
    const nextLayer = layerList[i + 1];
    const mbLayersToMove = mbLayers.filter((mbLayer) => mbLayer.source === layer.getId());
    const nextMbLayer = mbLayers.find(mbLayer => mbLayer.source === nextLayer.getId());//first layer of "next" source
    if (nextMbLayer) {
      for (let j = 0; j < mbLayersToMove.length; j++) {
        mbMap.moveLayer(mbLayersToMove[j].id, nextMbLayer.id);
      }
    }
  }

}


const container = document.createElement('div');
const MB_MAP = new mapboxgl.Map({
  container: container,
  style: {
    version: 8,
    sources: {},
    layers: [],
  },
});

const getMBImplementation = createSelector(() => {
  return MB_MAP;
});
window._mb = MB_MAP;

// Selectors
const syncMBMapWithMapState = createSelector(
  getMBImplementation,
  getMapState,
  (mbMap) => {
    return mbMap;
  }
);

export const syncMBState = createSelector(
  syncMBMapWithMapState,
  getLayerList,
  getDataSources,
  (mbMap, layerList, dataSources) => {

    removeOrphanedSourcesAndLayers(mbMap, layerList);
    layerList.forEach((layer) => {
      layer.syncLayerWithMB(mbMap, dataSources);
    });
    syncLayerOrder(mbMap, layerList);
    return mbMap;
  }
);
