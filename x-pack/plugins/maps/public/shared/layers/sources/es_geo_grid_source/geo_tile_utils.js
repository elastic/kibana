/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { DECIMAL_DEGREES_PRECISION } from '../../../../../common/constants';

const ZOOM_TILE_KEY_INDEX = 0;
const X_TILE_KEY_INDEX = 1;
const Y_TILE_KEY_INDEX = 2;

export function parseTileKey(tileKey) {
  const tileKeyParts = tileKey.split('/');

  if (tileKeyParts.length !== 3) {
    throw new Error(`Invalid tile key, expecting "zoom/x/y" format but got ${tileKey}`);
  }

  const zoom = parseInt(tileKeyParts[ZOOM_TILE_KEY_INDEX], 10);
  const x = parseInt(tileKeyParts[X_TILE_KEY_INDEX], 10);
  const y = parseInt(tileKeyParts[Y_TILE_KEY_INDEX], 10);
  const tileCount = Math.pow(2, zoom);

  if (x >= tileCount) {
    throw new Error(`Tile key is malformed, expected x to be less than ${tileCount}, you provided ${x}`);
  }
  if (y >= tileCount) {
    throw new Error(`Tile key is malformed, expected y to be less than ${tileCount}, you provided ${y}`);
  }

  return { x, y, zoom, tileCount };
}

function sinh(x) {
  return (Math.exp(x) - Math.exp(-x)) / 2;
}

function tileToLatitude(y, tileCount) {
  const radians = Math.atan(sinh(Math.PI - (2 * Math.PI * y / tileCount)));
  const lat = 180 / Math.PI * radians;
  return _.round(lat, DECIMAL_DEGREES_PRECISION);
}

function tileToLongitude(x, tileCount) {
  const lon = (x / tileCount * 360) - 180;
  return _.round(lon, DECIMAL_DEGREES_PRECISION);
}

export function getTileBoundingBox(tileKey) {
  const { x, y, tileCount } = parseTileKey(tileKey);

  return {
    top: tileToLatitude(y, tileCount),
    bottom: tileToLatitude(y + 1, tileCount),
    left: tileToLongitude(x, tileCount),
    right: tileToLongitude(x + 1, tileCount),
  };
}
