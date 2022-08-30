/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getTileKey,
  parseTileKey,
  getTileBoundingBox,
  getTilesForExtent,
  expandToTileBoundaries,
} from './geo_tile_utils';

test('Should parse tile key', () => {
  expect(parseTileKey('15/23423/1867')).toEqual({
    zoom: 15,
    x: 23423,
    y: 1867,
    tileCount: Math.pow(2, 15),
  });
});

test('Should get tiles for extent', () => {
  const extent = {
    minLon: -132.19235,
    minLat: 12.05834,
    maxLon: -83.6593,
    maxLat: 30.03121,
  };

  expect(getTilesForExtent(4.74, extent)).toEqual([
    { x: 2, y: 6, z: 4 },
    { x: 2, y: 7, z: 4 },
    { x: 3, y: 6, z: 4 },
    { x: 3, y: 7, z: 4 },
    { x: 4, y: 6, z: 4 },
    { x: 4, y: 7, z: 4 },
  ]);
});

test('Should get tiles for extent that crosses dateline', () => {
  const extent = {
    minLon: -267.34624,
    minLat: 10,
    maxLon: 33.8355,
    maxLat: 79.16772,
  };

  expect(getTilesForExtent(2.12, extent)).toEqual([
    { x: 3, y: 0, z: 2 },
    { x: 3, y: 1, z: 2 },
    { x: 0, y: 0, z: 2 },
    { x: 0, y: 1, z: 2 },
    { x: 1, y: 0, z: 2 },
    { x: 1, y: 1, z: 2 },
    { x: 2, y: 0, z: 2 },
    { x: 2, y: 1, z: 2 },
  ]);
});

test('Should get tiles for extent that crosses dateline and not add tiles in between right and left', () => {
  const extent = {
    minLon: -183.25917,
    minLat: 50.10446,
    maxLon: -176.63722,
    maxLat: 53.06071,
  };

  expect(getTilesForExtent(6.8, extent)).toEqual([
    { x: 63, y: 20, z: 6 },
    { x: 63, y: 21, z: 6 },
    { x: 0, y: 20, z: 6 },
    { x: 0, y: 21, z: 6 },
  ]);
});

test('Should return single tile for zoom level 0', () => {
  const extent = {
    minLon: -180.39426,
    minLat: -85.05113,
    maxLon: 270.66456,
    maxLat: 85.05113,
  };

  expect(getTilesForExtent(0, extent)).toEqual([{ x: 0, y: 0, z: 0 }]);
});

test('Should get tile key', () => {
  expect(getTileKey(45, 120, 10)).toEqual('10/853/368');
});

test('Should convert tile key to geojson Polygon', () => {
  const geometry = getTileBoundingBox('15/23423/1867');
  expect(geometry).toEqual({
    top: 82.92546,
    bottom: 82.92411,
    right: 77.34375,
    left: 77.33276,
  });
});

test('Should convert tile key to geojson Polygon with extra precision', () => {
  const geometry = getTileBoundingBox('26/19762828/25222702');
  expect(geometry).toEqual({
    top: 40.7491508,
    bottom: 40.7491467,
    right: -73.9839238,
    left: -73.9839292,
  });
});

test('Should expand extent to align boundaries with tile boundaries', () => {
  const extent = {
    maxLat: 12.5,
    maxLon: 102.5,
    minLat: 2.5,
    minLon: 92.5,
  };
  const tileAlignedExtent = expandToTileBoundaries(extent, 7);
  expect(tileAlignedExtent).toEqual({
    maxLat: 13.9234,
    maxLon: 104.0625,
    minLat: 0,
    minLon: 90,
  });
});
