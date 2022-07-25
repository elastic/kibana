/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { isGlDrawLayer } from './sort_layers';
import { ILayer } from '../../classes/layers/layer';

export function removeOrphanedSourcesAndLayers(
  mbMap: MbMap,
  layerList: ILayer[],
  spatialFilterLayer: ILayer
) {
  const mbStyle = mbMap.getStyle();
  if (!mbStyle.layers) {
    return;
  }

  const mbLayerIdsToRemove: string[] = [];
  mbStyle.layers.forEach((mbLayer) => {
    // ignore mapbox layers from spatial filter layer
    if (spatialFilterLayer.ownsMbLayerId(mbLayer.id)) {
      return;
    }

    // ignore gl-draw layers
    if (isGlDrawLayer(mbLayer.id)) {
      return;
    }

    const targetLayer = layerList.find((layer) => {
      return layer.ownsMbLayerId(mbLayer.id);
    });
    if (!targetLayer) {
      mbLayerIdsToRemove.push(mbLayer.id);
    }
  });
  mbLayerIdsToRemove.forEach((mbLayerId) => mbMap.removeLayer(mbLayerId));

  const mbSourcesToRemove = [];
  for (const mbSourceId in mbStyle.sources) {
    if (mbStyle.sources.hasOwnProperty(mbSourceId)) {
      // ignore mapbox sources from spatial filter layer
      if (spatialFilterLayer.ownsMbSourceId(mbSourceId)) {
        return;
      }

      const targetLayer = layerList.find((layer) => {
        return layer.ownsMbSourceId(mbSourceId);
      });
      if (!targetLayer) {
        mbSourcesToRemove.push(mbSourceId);
      }
    }
  }
  mbSourcesToRemove.forEach((mbSourceId) => mbMap.removeSource(mbSourceId));
}
