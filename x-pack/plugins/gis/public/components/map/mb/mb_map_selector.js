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
  if (layerList && layerList.length) {
    const mbLayers = mbMap.getStyle().layers.slice();
    const currentLayerOrder = _.uniq( // Consolidate layers and remove suffix
      mbLayers.map(({ id }) => id.substring(0, id.lastIndexOf('_'))));
    const newLayerOrder = layerList.map(l => l.getId());
    let netPos = 0;
    let netNeg = 0;
    const movementArr = currentLayerOrder.reduce((accu, id, idx) => {
      const movement = newLayerOrder.findIndex(newOId => newOId === id) - idx;
      movement > 0 ? netPos++ : movement < 0 && netNeg++;
      accu.push({ id, movement });
      return accu;
    }, []);
    if (netPos === 0 && netNeg === 0) { return; }
    const movedLayer = (netPos >= netNeg) && movementArr.find(l => l.movement < 0).id ||
      (netPos < netNeg) && movementArr.find(l => l.movement > 0).id;
    const nextLayerIdx = newLayerOrder.findIndex(layerId => layerId === movedLayer) + 1;
    const nextLayerId = nextLayerIdx === newLayerOrder.length ? null :
      mbLayers.find(({ id }) => id.startsWith(newLayerOrder[nextLayerIdx])).id;

    mbLayers.forEach(({ id }) => {
      if (id.startsWith(movedLayer)) {
        mbMap.moveLayer(id, nextLayerId);
      }
    });
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

export const syncMBState = createSelector(getMapReady, getMbMapAndSyncWithMapState, getLayerList,
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
