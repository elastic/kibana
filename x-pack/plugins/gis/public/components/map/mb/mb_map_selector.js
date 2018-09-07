/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { getLayerList, getMapState, getDataSources } from "../../../selectors/map_selectors";
import mapboxgl from 'mapbox-gl';


function removeOrphanedSylesAndSources() {
  console.log('must remove orphaned layers from mapbox');
}


const container = document.createElement('div');
const MB_MAP = new mapboxgl.Map({
  container: container,
  style: {
    version: 8,
    sources: {
    },
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
    removeOrphanedSylesAndSources(mbMap, layerList);
    layerList.forEach((layer, position) => layer.syncLayerWithMB(mbMap, dataSources, position));
    return mbMap;
  }
);
