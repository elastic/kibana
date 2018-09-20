/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createSelector } from 'reselect';
import { getLayerList, getMapState, getMapReady } from "../../../selectors/map_selectors";
import { getMbMap } from './global_mb_map';
import _ from 'lodash';

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

// Selectors
const getMbMapAndSyncWithMapState = createSelector(
  getMapReady,
  getMapState,
  (mapReady, mapState) => {

    if (!mapReady) {
      return;
    }

    const mbMap = getMbMap();
    const mbCenter = mbMap.getCenter();
    const zoom = mbMap.getZoom();
    if (typeof mapState.zoom === 'number' && mapState.zoom !== zoom) {
      mbMap.setZoom(mapState.zoom);
    }
    if (mapState.center && !_.isEqual(mapState.center, { lon: mbCenter.lng, lat: mbCenter.lat })) {
      mbMap.setCenter({
        lng: mapState.center.lon,
        lat: mapState.center.lat
      });
    }

    return mbMap;
  }
);

export const syncMBState = createSelector(
  getMapReady,
  getMbMapAndSyncWithMapState,
  getLayerList,
  (mapReady, mbMap, layerList) => {
    if (!mapReady) {
      return;
    }
    removeOrphanedSourcesAndLayers(mbMap, layerList);
    layerList.forEach((layer) => {
      layer.syncLayerWithMB(mbMap);
    });
    syncLayerOrder(mbMap, layerList);
  }
);
