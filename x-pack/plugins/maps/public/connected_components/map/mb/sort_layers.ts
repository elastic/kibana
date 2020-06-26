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
  return layerClass.LABEL ? isTextLayer : !isTextLayer;
}

enum LAYER_CLASS {
  ANY = 'ANY',
  LABEL = 'LABEL',
  NON_LABEL = 'NON_LABEL',
}

export function syncLayerOrder(mbMap: MbMap, spatialFiltersLayer: ILayer, layerList: ILayer) {
  const mbStyle = mbMap.getStyle();
  if (!mbStyle.layers || mbStyle.layers.length === 0) {
    return;
  }

  console.log('before', mbMap.getStyle());

  // mapbox stores layers in draw order so layers with higher index are drawn on-top of layers with lower index
  // Need to reverse order because layer ordering starts from the top and work its way down.
  const reversedMbLayers = [...mbStyle.layers].reverse();
  let index = 0;
  let beneathLayerId;
  // track sorted mbLayers so when/if they are encounted later, they can be skipped
  const processedMbLayerIds = new Map<string, boolean>();

  function moveMapLayer(mapLayer: ILayer, layerClass: LAYER_CLASS) {
    mbStyle.layers
      .filter((mbLayer) => {
        return doesMbLayerBelongToMapLayerAndClass(mapLayer, mbLayer, layerClass);
      })
      .forEach((mbLayer) => {
        mbMap.moveLayer(mbLayer.id, beneathLayerId);
        processedMbLayerIds.set(mbLayer.id, true);
      });
  }

  function advanceIndexToNextMapLayer(mapLayer: ILayer, layerClass: LAYER_CLASS) {
    while (
      index < reversedMbLayers.length - 1 &&
      (doesMbLayerBelongToMapLayerAndClass(mapLayer, reversedMbLayers[index], layerClass) ||
        processedMbLayerIds.has(reversedMbLayers[index].id))
    ) {
      index++;
    }
  }

  function getBottomMbLayerIdForMapLayer(mapLayer: ILayer, layerClass: LAYER_CLASS) {
    const mbLayer = mbStyle.layers.find((mbLayer) => {
      return doesMbLayerBelongToMapLayerAndClass(mapLayer, mbLayer, layerClass);
    });
    return mbLayer ? mbLayer.id : null;
  }

  // Ensure spatial filters layer is the top layer.
  if (
    !doesMbLayerBelongToMapLayerAndClass(
      spatialFiltersLayer,
      reversedMbLayers[index],
      LAYER_CLASS.ANY
    )
  ) {
    moveMapLayer(spatialFiltersLayer, LAYER_CLASS.ANY);
  } else {
    advanceIndexToNextMapLayer(spatialFiltersLayer, LAYER_CLASS.ANY);
  }
  beneathLayerId = getBottomMbLayerIdForMapLayer(spatialFiltersLayer, LAYER_CLASS.ANY);

  // Move map layer labels to top
  /* [...layerList].reverse()
    .filter((mapLayer => {
      return mapLayer.bubbleLabelsToTop();
    }))
    .forEach((mapLayer: ILayer) => {
      if (!doesMbLayerBelongToMapLayerAndClass(mapLayer, reversedMbLayers[index], LAYER_CLASS.LABEL)) {
        moveMapLayer(mapLayer, LAYER_CLASS.LABEL);
      } else {
        advanceIndexToNextMapLayer(mapLayer, LAYER_CLASS.LABEL);
      }
      beneathLayerId = getBottomMbLayerIdForMapLayer(mapLayer, LAYER_CLASS.LABEL);
    });*/

  // Move map layers to top
  [...layerList].reverse().forEach((mapLayer: ILayer) => {
    // const layerClass = mapLayer.bubbleLabelsToTop() ? LAYER_CLASS.NON_LABEL : LAYER_CLASS.ANY;
    const layerClass = LAYER_CLASS.ANY;
    if (!doesMbLayerBelongToMapLayerAndClass(mapLayer, reversedMbLayers[index], layerClass)) {
      moveMapLayer(mapLayer, layerClass);
    } else {
      advanceIndexToNextMapLayer(mapLayer, layerClass);
    }
    beneathLayerId = getBottomMbLayerIdForMapLayer(mapLayer, layerClass);
  });

  console.log('after', mbMap.getStyle());
}
