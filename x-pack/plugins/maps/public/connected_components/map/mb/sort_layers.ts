/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Map as MbMap } from 'mapbox-gl';
import { ILayer } from '../../../classes/layers/layer';

// "Layer" is overloaded.
// 1) Map layer: ILayer implemenation. A single map layer consists of one to many mapbox layers.
// 2) Mapbox layer: Individual unit of rendering such as text, circles, polygons, or lines.

function getIsTextLayer(mbLayer) {
  if (mbLayer.type !== 'symbol') {
    return false;
  }

  const styleNames = [];
  if (mbLayer.paint) {
    styleNames.push(...Object.keys(mbLayer.paint));
  }
  if (mbLayer.layout) {
    styleNames.push(...Object.keys(mbLayer.layout));
  }
  return styleNames.some((styleName) => {
    return styleName.startsWith('text-');
  });
}

function doesMbLayerBelongToMapLayerAndClass(mapLayer: ILayer, mbLayer, layerClass: LAYER_CLASS) {
  if (!mapLayer.ownsMbLayerId(mbLayer.id)) {
    return false;
  }

  // mb layer belongs to mapLayer, now filter by layer class
  if (layerClass === LAYER_CLASS.ANY) {
    return true;
  }
  const isTextLayer = getIsTextLayer(mbLayer);
  return layerClass === LAYER_CLASS.LABEL ? isTextLayer : !isTextLayer;
}

enum LAYER_CLASS {
  ANY = 'ANY',
  LABEL = 'LABEL',
  NON_LABEL = 'NON_LABEL',
}

function moveMapLayer(
  mbMap: MbMap,
  mapLayer: ILayer,
  layerClass: LAYER_CLASS,
  beneathLayerId: string | null
) {
  const mbLayers = mbMap.getStyle().layers;
  mbLayers
    .filter((mbLayer) => {
      if (!doesMbLayerBelongToMapLayerAndClass(mapLayer, mbLayer, layerClass)) {
        return false;
      }

      // TODO handle case where beneathLayerId is not provided. Then check if layer is top layer and skip if it is

      // Only move layer when its not in correct order.
      const nextMbLayerId = getNextMapLayerBottomMbLayerId(mbLayers, mapLayer, layerClass);
      return nextMbLayerId !== beneathLayerId;
    })
    .forEach((mbLayer) => {
      console.log(`Move mbLayer: ${mbLayer.id}, beneathLayerId: ${beneathLayerId}`);
      mbMap.moveLayer(mbLayer.id, beneathLayerId);
    });
}

function getBottomMbLayerId(mbLayers: unknown[], mapLayer: ILayer, layerClass: LAYER_CLASS) {
  const mbLayer = mbLayers.find((mbLayer) => {
    return doesMbLayerBelongToMapLayerAndClass(mapLayer, mbLayer, layerClass);
  });
  return mbLayer ? mbLayer.id : null;
}

function getNextMapLayerBottomMbLayerId(
  mbLayers: unknown[],
  mapLayer: ILayer,
  layerClass: LAYER_CLASS
) {
  let bottomMbLayerFound = false;
  let nextMbLayerId = null;
  for (let i = 0; i < mbLayers.length; i++) {
    if (!bottomMbLayerFound) {
      if (doesMbLayerBelongToMapLayerAndClass(mapLayer, mbLayers[i], layerClass)) {
        bottomMbLayerFound = true;
      }
    } else {
      // Next mbLayer not belonging to map layer is the mapbox layer we are looking for
      if (!doesMbLayerBelongToMapLayerAndClass(mapLayer, mbLayers[i], layerClass)) {
        nextMbLayerId = mbLayers[i].id;
        break;
      }
    }
  }

  return nextMbLayerId;
}

export function syncLayerOrder(mbMap: MbMap, spatialFiltersLayer: ILayer, layerList: ILayer) {
  const mbStyle = mbMap.getStyle();
  if (!mbStyle.layers || mbStyle.layers.length === 0) {
    return;
  }

  // Ensure spatial filters layer is the top layer.
  moveMapLayer(mbMap, spatialFiltersLayer, LAYER_CLASS.ANY);
  let beneathLayerId = getBottomMbLayerId(mbStyle.layers, spatialFiltersLayer, LAYER_CLASS.ANY);

  // Move map layer labels to top
  [...layerList]
    .reverse()
    .filter((mapLayer) => {
      return mapLayer.bubbleLabelsToTop();
    })
    .forEach((mapLayer: ILayer) => {
      moveMapLayer(mbMap, mapLayer, LAYER_CLASS.LABEL, beneathLayerId);
      beneathLayerId = getBottomMbLayerId(
        mbStyle.layers,
        mapLayer,
        LAYER_CLASS.LABEL,
        beneathLayerId
      );
    });

  // Move map layers to top
  [...layerList].reverse().forEach((mapLayer: ILayer) => {
    const layerClass = mapLayer.bubbleLabelsToTop() ? LAYER_CLASS.NON_LABEL : LAYER_CLASS.ANY;
    moveMapLayer(mbMap, mapLayer, layerClass, beneathLayerId);
    beneathLayerId = getBottomMbLayerId(mbStyle.layers, mapLayer, layerClass, beneathLayerId);
  });
}
