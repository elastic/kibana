/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { getLayerList, getMapState, getDataSources } from "../../../selectors/map_selectors";
import mapboxgl from 'mapbox-gl';

function removeOrphanedStylesAndSources(mbMap, layerList) {

  const ids = layerList.map((layer) => layer.getId());
  const style = mbMap.getStyle();
  const sourcesToRemove = [];
  for (const sourceId in style.sources) {
    if (ids.indexOf(sourceId) === -1) {
      sourcesToRemove.push(sourceId);
    }
  }

  const layersToRemove = [];
  style.layers.forEach(layer => {
    if (sourcesToRemove.indexOf(layer.source) >= 0) {
      layersToRemove.push(layer.id);
    }
  });

  layersToRemove.forEach((layerId) => {
    mbMap.removeLayer(layerId);
  });
  sourcesToRemove.forEach(sourceId => {
    mbMap.removeSource(sourceId);
  });

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
  (mbMap, mapState) => {
    console.warn('must sync mb map with mapstate', mapState, mbMap);
    return mbMap;
  }
);

export const syncMBState = createSelector(
  syncMBMapWithMapState,
  getLayerList,
  getDataSources,
  (mbMap, layerList, dataSources) => {
    removeOrphanedStylesAndSources(mbMap, layerList);
    layerList.forEach((layer, position) => layer.syncLayerWithMB(mbMap, dataSources, position));
    return mbMap;
  }
);
