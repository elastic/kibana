/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Map as MbMap } from '@kbn/mapbox-gl';
// @ts-expect-error
import { RGBAImage } from './image_utils';
import { isGlDrawLayer } from './sort_layers';
import { ILayer } from '../../classes/layers/layer';
import { EmsSpriteSheet } from '../../classes/layers/vector_tile_layer/vector_tile_layer';

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

function getImageData(img: HTMLImageElement) {
  const canvas = window.document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('failed to create canvas 2d context');
  }
  canvas.width = img.width;
  canvas.height = img.height;
  context.drawImage(img, 0, 0, img.width, img.height);
  return context.getImageData(0, 0, img.width, img.height);
}

function isCrossOriginUrl(url: string) {
  const a = window.document.createElement('a');
  a.href = url;
  return (
    a.protocol !== window.document.location.protocol ||
    a.host !== window.document.location.host ||
    a.port !== window.document.location.port
  );
}

export async function loadSpriteSheetImageData(imgUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (isCrossOriginUrl(imgUrl)) {
      image.crossOrigin = 'Anonymous';
    }
    image.onload = (event) => {
      resolve(getImageData(image));
    };
    image.onerror = (e) => {
      reject(e);
    };
    image.src = imgUrl;
  });
}

export function addSpriteSheetToMapFromImageData(
  json: EmsSpriteSheet,
  imgData: ImageData,
  mbMap: MbMap
) {
  for (const imageId in json) {
    if (!(json.hasOwnProperty(imageId) && !mbMap.hasImage(imageId))) {
      continue;
    }
    const { width, height, x, y, sdf, pixelRatio } = json[imageId];
    if (typeof width !== 'number' || typeof height !== 'number') {
      continue;
    }

    const data = new RGBAImage({ width, height });
    RGBAImage.copy(imgData, data, { x, y }, { x: 0, y: 0 }, { width, height });
    mbMap.addImage(imageId, data, { pixelRatio, sdf });
  }
}
