/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import mapboxgl from 'mapbox-gl';

export async function createMbMapInstance({ node, initialView, scrollZoom }) {
  return new Promise((resolve) => {
    const options = {
      attributionControl: false,
      container: node,
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
      scrollZoom
    };
    if (initialView) {
      options.zoom = initialView.zoom;
      options.center = {
        lng: initialView.lon,
        lat: initialView.lat
      };
    }
    const mbMap = new mapboxgl.Map(options);
    mbMap.dragRotate.disable();
    mbMap.touchZoomRotate.disableRotation();
    mbMap.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }), 'top-left'
    );
    mbMap.on('load', () => {
      resolve(mbMap);
    });
  });
}

export function removeOrphanedSourcesAndLayers(mbMap, layerList) {
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

export function syncLayerOrder(mbMap, layerList) {
  if (layerList && layerList.length) {
    const mbLayers = mbMap.getStyle().layers.slice();
    const currentLayerOrder = _.uniq( // Consolidate layers and remove suffix
      mbLayers.map(({ id }) => id.substring(0, id.lastIndexOf('_'))));
    const newLayerOrder = layerList.map(l => l.getId())
      .filter(layerId => currentLayerOrder.includes(layerId));
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
