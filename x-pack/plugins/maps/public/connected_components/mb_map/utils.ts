/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
import { TileMetaFeature } from '../../../common/descriptor_types';
import { isGlDrawLayer } from './sort_layers';
import { ILayer } from '../../classes/layers/layer';
import { ES_MVT_META_LAYER_NAME } from '../../classes/layers/vector_layer/mvt_vector_layer/mvt_vector_layer';

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

export function getTileMetaFeatures(mbMap: MbMap, mbSourceId: string): TileMetaFeature[] {
  // querySourceFeatures can return duplicated features when features cross tile boundaries.
  // Tile meta will never have duplicated features since by there nature, tile meta is a feature contained within a single tile
  const mbFeatures = mbMap.querySourceFeatures(mbSourceId, {
    sourceLayer: ES_MVT_META_LAYER_NAME,
  });

  return mbFeatures
    .map((mbFeature) => {
      try {
        return {
          type: 'Feature',
          id: mbFeature?.id,
          geometry: mbFeature?.geometry, // this getter might throw with non-conforming geometries
          properties: mbFeature?.properties,
        } as TileMetaFeature;
      } catch (e) {
        return null;
      }
    })
    .filter((mbFeature) => mbFeature !== null) as TileMetaFeature[];
}
