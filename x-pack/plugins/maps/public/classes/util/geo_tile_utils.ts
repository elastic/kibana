/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { DECIMAL_DEGREES_PRECISION } from '../../../common/constants';
import { clampToLatBounds } from '../../../common/elasticsearch_util';
import { MapExtent } from '../../../common/descriptor_types';

const ZOOM_TILE_KEY_INDEX = 0;
const X_TILE_KEY_INDEX = 1;
const Y_TILE_KEY_INDEX = 2;

function getTileCount(zoom: number): number {
  return Math.pow(2, zoom);
}

export interface ESBounds {
  top_left: {
    lon: number;
    lat: number;
  };
  bottom_right: {
    lon: number;
    lat: number;
  };
}

export function parseTileKey(tileKey: string): {
  x: number;
  y: number;
  zoom: number;
  tileCount: number;
} {
  const tileKeyParts = tileKey.split('/');

  if (tileKeyParts.length !== 3) {
    throw new Error(`Invalid tile key, expecting "zoom/x/y" format but got ${tileKey}`);
  }

  const zoom = parseInt(tileKeyParts[ZOOM_TILE_KEY_INDEX], 10);
  const x = parseInt(tileKeyParts[X_TILE_KEY_INDEX], 10);
  const y = parseInt(tileKeyParts[Y_TILE_KEY_INDEX], 10);
  const tileCount = getTileCount(zoom);

  if (x >= tileCount) {
    throw new Error(
      `Tile key is malformed, expected x to be less than ${tileCount}, you provided ${x}`
    );
  }
  if (y >= tileCount) {
    throw new Error(
      `Tile key is malformed, expected y to be less than ${tileCount}, you provided ${y}`
    );
  }

  return { x, y, zoom, tileCount };
}

export function getTileKey(lat: number, lon: number, zoom: number): string {
  const tileCount = getTileCount(zoom);

  const x = longitudeToTile(lon, tileCount);
  const y = latitudeToTile(lat, tileCount);
  return `${zoom}/${x}/${y}`;
}

function sinh(x: number): number {
  return (Math.exp(x) - Math.exp(-x)) / 2;
}

// Calculate the minimum precision required to adequtely draw the box
// bounds.
//
// ceil(abs(log10(tileSize))) tells us how many decimals of precision
// are minimally required to represent the number after rounding.
//
// We add one extra decimal level of precision because, at high zoom
// levels rounding exactly can cause the boxes to render as uneven sizes
// (some will be slightly larger and some slightly smaller)
function precisionRounding(v: number, minPrecision: number, binSize: number): number {
  let precision = Math.ceil(Math.abs(Math.log10(binSize))) + 1;
  precision = Math.max(precision, minPrecision);
  return _.round(v, precision);
}

export function tile2long(x: number, z: number): number {
  const tileCount = getTileCount(z);
  return tileToLongitude(x, tileCount);
}

export function tile2lat(y: number, z: number): number {
  const tileCount = getTileCount(z);
  return tileToLatitude(y, tileCount);
}

export function tileToLatitude(y: number, tileCount: number) {
  const radians = Math.atan(sinh(Math.PI - (2 * Math.PI * y) / tileCount));
  const lat = (180 / Math.PI) * radians;
  return precisionRounding(lat, DECIMAL_DEGREES_PRECISION, 180 / tileCount);
}

export function tileToLongitude(x: number, tileCount: number) {
  const lon = (x / tileCount) * 360 - 180;
  return precisionRounding(lon, DECIMAL_DEGREES_PRECISION, 360 / tileCount);
}

export function getTileBoundingBox(tileKey: string) {
  const { x, y, tileCount } = parseTileKey(tileKey);

  return {
    top: tileToLatitude(y, tileCount),
    bottom: tileToLatitude(y + 1, tileCount),
    left: tileToLongitude(x, tileCount),
    right: tileToLongitude(x + 1, tileCount),
  };
}

function sec(value: number): number {
  return 1 / Math.cos(value);
}

function latitudeToTile(lat: number, tileCount: number) {
  const radians = (clampToLatBounds(lat) * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(radians) + sec(radians)) / Math.PI) / 2) * tileCount;
  return Math.floor(y);
}

function longitudeToTile(lon: number, tileCount: number) {
  const x = ((lon + 180) / 360) * tileCount;
  return Math.floor(x);
}

export function expandToTileBoundaries(extent: MapExtent, zoom: number): MapExtent {
  const tileCount = getTileCount(zoom);

  const upperLeftX = longitudeToTile(extent.minLon, tileCount);
  const upperLeftY = latitudeToTile(Math.min(extent.maxLat, 90), tileCount);
  const lowerRightX = longitudeToTile(extent.maxLon, tileCount);
  const lowerRightY = latitudeToTile(Math.max(extent.minLat, -90), tileCount);

  return {
    minLon: tileToLongitude(upperLeftX, tileCount),
    minLat: tileToLatitude(lowerRightY + 1, tileCount),
    maxLon: tileToLongitude(lowerRightX + 1, tileCount),
    maxLat: tileToLatitude(upperLeftY, tileCount),
  };
}
