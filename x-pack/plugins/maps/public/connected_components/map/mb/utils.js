/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { RGBAImage } from './image_utils';

export function removeOrphanedSourcesAndLayers(mbMap, layerList, spatialFilterLayer) {
  const mbStyle = mbMap.getStyle();

  const mbLayerIdsToRemove = [];
  mbStyle.layers.forEach(mbLayer => {
    // ignore mapbox layers from spatial filter layer
    if (spatialFilterLayer.ownsMbLayerId(mbLayer.id)) {
      return;
    }

    const layer = layerList.find(layer => {
      return layer.ownsMbLayerId(mbLayer.id);
    });
    if (!layer) {
      mbLayerIdsToRemove.push(mbLayer.id);
    }
  });
  mbLayerIdsToRemove.forEach(mbLayerId => mbMap.removeLayer(mbLayerId));

  const mbSourcesToRemove = [];
  for (const mbSourceId in mbStyle.sources) {
    if (mbStyle.sources.hasOwnProperty(mbSourceId)) {
      // ignore mapbox sources from spatial filter layer
      if (spatialFilterLayer.ownsMbSourceId(mbSourceId)) {
        return;
      }

      const layer = layerList.find(layer => {
        return layer.ownsMbSourceId(mbSourceId);
      });
      if (!layer) {
        mbSourcesToRemove.push(mbSourceId);
      }
    }
  }
  mbSourcesToRemove.forEach(mbSourceId => mbMap.removeSource(mbSourceId));
}

export function moveLayerToTop(mbMap, layer) {
  const mbStyle = mbMap.getStyle();

  if (!mbStyle.layers || mbStyle.layers.length === 0) {
    return;
  }

  layer.getMbLayerIds().forEach(mbLayerId => {
    const mbLayer = mbMap.getLayer(mbLayerId);
    if (mbLayer) {
      mbMap.moveLayer(mbLayerId);
    }
  });
}

/**
 * This is function assumes only a single layer moved in the layerList, compared to mbMap
 * It is optimized to minimize the amount of mbMap.moveLayer calls.
 * @param mbMap
 * @param layerList
 */
export function syncLayerOrderForSingleLayer(mbMap, layerList) {
  if (!layerList || layerList.length === 0) {
    return;
  }

  const mbLayers = mbMap.getStyle().layers.slice();
  const layerIds = [];
  mbLayers.forEach(mbLayer => {
    const layer = layerList.find(layer => layer.ownsMbLayerId(mbLayer.id));
    if (layer) {
      layerIds.push(layer.getId());
    }
  });

  const currentLayerOrderLayerIds = _.uniq(layerIds);

  const newLayerOrderLayerIdsUnfiltered = layerList.map(l => l.getId());
  const newLayerOrderLayerIds = newLayerOrderLayerIdsUnfiltered.filter(layerId =>
    currentLayerOrderLayerIds.includes(layerId)
  );

  let netPos = 0;
  let netNeg = 0;
  const movementArr = currentLayerOrderLayerIds.reduce((accu, id, idx) => {
    const movement = newLayerOrderLayerIds.findIndex(newOId => newOId === id) - idx;
    movement > 0 ? netPos++ : movement < 0 && netNeg++;
    accu.push({ id, movement });
    return accu;
  }, []);
  if (netPos === 0 && netNeg === 0) {
    return;
  }
  const movedLayerId =
    (netPos >= netNeg && movementArr.find(l => l.movement < 0).id) ||
    (netPos < netNeg && movementArr.find(l => l.movement > 0).id);
  const nextLayerIdx = newLayerOrderLayerIds.findIndex(layerId => layerId === movedLayerId) + 1;

  let nextMbLayerId;
  if (nextLayerIdx === newLayerOrderLayerIds.length) {
    nextMbLayerId = null;
  } else {
    const foundLayer = mbLayers.find(({ id: mbLayerId }) => {
      const layerId = newLayerOrderLayerIds[nextLayerIdx];
      const layer = layerList.find(layer => layer.getId() === layerId);
      return layer.ownsMbLayerId(mbLayerId);
    });
    nextMbLayerId = foundLayer.id;
  }

  const movedLayer = layerList.find(layer => layer.getId() === movedLayerId);
  mbLayers.forEach(({ id: mbLayerId }) => {
    if (movedLayer.ownsMbLayerId(mbLayerId)) {
      mbMap.moveLayer(mbLayerId, nextMbLayerId);
    }
  });
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
    image.onload = el => {
      const imgData = getImageData(el.currentTarget);
      resolve(imgData);
    };
    image.onerror = e => {
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
