/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RGBAImage } from './image_utils';

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
