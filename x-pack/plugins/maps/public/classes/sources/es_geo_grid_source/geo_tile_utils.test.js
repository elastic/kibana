/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../kibana_services', () => {});

import { parseTileKey, getTileBoundingBox, expandToTileBoundaries } from './geo_tile_utils';

it('Should parse tile key', () => {
  expect(parseTileKey('15/23423/1867')).toEqual({
    zoom: 15,
    x: 23423,
    y: 1867,
    tileCount: Math.pow(2, 15),
  });
});

it('Should convert tile key to geojson Polygon', () => {
  const geometry = getTileBoundingBox('15/23423/1867');
  expect(geometry).toEqual({
    top: 82.92546,
    bottom: 82.92411,
    right: 77.34375,
    left: 77.33276,
  });
});

it('Should convert tile key to geojson Polygon with extra precision', () => {
  const geometry = getTileBoundingBox('26/19762828/25222702');
  expect(geometry).toEqual({
    top: 40.7491508,
    bottom: 40.7491467,
    right: -73.9839238,
    left: -73.9839292,
  });
});

it('Should expand extent to align boundaries with tile boundaries', () => {
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
