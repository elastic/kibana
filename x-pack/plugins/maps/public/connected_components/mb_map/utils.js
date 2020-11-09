/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RGBAImage } from './image_utils';

export function removeOrphanedSourcesAndLayers(mbMap, layerList, spatialFilterLayer) {
  const mbStyle = mbMap.getStyle();

  const mbLayerIdsToRemove = [];
  mbStyle.layers.forEach((mbLayer) => {
    // ignore mapbox layers from spatial filter layer
    if (spatialFilterLayer.ownsMbLayerId(mbLayer.id)) {
      return;
    }

    const layer = layerList.find((layer) => {
      return layer.ownsMbLayerId(mbLayer.id);
    });
    if (!layer) {
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

      const layer = layerList.find((layer) => {
        return layer.ownsMbSourceId(mbSourceId);
      });
      if (!layer) {
        mbSourcesToRemove.push(mbSourceId);
      }
    }
  }
  mbSourcesToRemove.forEach((mbSourceId) => mbMap.removeSource(mbSourceId));
}

export async function addSpritesheetToMap(json, imgUrl, mbMap) {
  const imgData = await loadSpriteSheetImageData(imgUrl);
  addSpriteSheetToMapFromImageData(json, imgData, mbMap);
}

function getImageData(img) {
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

function isCrossOriginUrl(url) {
  const a = window.document.createElement('a');
  a.href = url;
  return (
    a.protocol !== window.document.location.protocol ||
    a.host !== window.document.location.host ||
    a.port !== window.document.location.port
  );
}

export async function loadSpriteSheetImageData(imgUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (isCrossOriginUrl(imgUrl)) {
      image.crossOrigin = 'Anonymous';
    }
    image.onload = (el) => {
      const imgData = getImageData(el.currentTarget);
      resolve(imgData);
    };
    image.onerror = (e) => {
      reject(e);
    };
    image.src = imgUrl;
  });
}

export function addSpriteSheetToMapFromImageData(json, imgData, mbMap) {
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
