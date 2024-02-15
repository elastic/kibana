/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Map as MLMap,
  Marker as MLMarker,
  ImageSourceSpecification as MLImageSourceSpecification,
  LngLatBoundsLike as MLLngLatBoundsLike,
  LngLatLike as MLLngLatLike,
  PointLike as MLPointLike,
  Point2D as MLPoint2D,
  ILngLat as MLILngLat,
  HeatmapLayerSpecification as MLHeatmapLayerSpecification,
} from 'maplibre-gl';

export type FlatBounds = [number, number, number, number];

import {
  BACKGROUND_LAYER_ID,
  BACKGROUND_SOURCE_ID,
  X_MIN,
  Y_MIN,
  X_MAX,
  Y_MAX,
  SYNTHETICS_LAYER_ID,
  MAX_BOUNDS_EXTENDED,
} from './constants';

export function paintMapWithBackgroundColor(
  map: MLMap,
  color: string = 'white'
) {
  map.setPaintProperty('background', 'background-color', 'white');

  // Add a polygon layer with white background

  map.addSource(BACKGROUND_SOURCE_ID, {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [MAX_BOUNDS_EXTENDED[0], MAX_BOUNDS_EXTENDED[1]],
            [MAX_BOUNDS_EXTENDED[2], MAX_BOUNDS_EXTENDED[1]],
            [MAX_BOUNDS_EXTENDED[2], MAX_BOUNDS_EXTENDED[3]],
            [MAX_BOUNDS_EXTENDED[0], MAX_BOUNDS_EXTENDED[3]],
            [MAX_BOUNDS_EXTENDED[0], MAX_BOUNDS_EXTENDED[1]],
          ],
        ],
      },
    },
  });

  map.addLayer(
    {
      id: BACKGROUND_LAYER_ID,
      type: 'fill',
      source: BACKGROUND_SOURCE_ID,
      layout: {},
      paint: {
        'fill-color': color,
        'fill-opacity': 1,
      },
    },
    SYNTHETICS_LAYER_ID
  );
}

// Returns the multiplier factor to calculate the physical width and height (what is plotted on map) based
// on the original given dimensions
export function getRelativeFactorForWidthAndHeight(
  map: MLMap,
  width: number,
  height: number
) {
  // fitMapToMaxBounds(map);
  const bounds = map.getBounds();

  // Project the bounds to pixel coordinates
  const topLeft = map.project(bounds.getNorthWest());
  const bottomRight = map.project(bounds.getSouthEast());

  // Calculate the pixel width and height
  const physicalWidth = bottomRight.x - topLeft.x;
  const physicalHeight = bottomRight.y - topLeft.y;

  // const isLandscape = width > height;
  // const largerDim = isLandscape ? width : height;
  //
  // const factor = (isLandscape ? physicalWidth : physicalHeight) / largerDim;
  const factorX = physicalWidth / width;

  return { factor: factorX, physicalWidth, physicalHeight };
}

export function getMaxBoundsForPixelWidthHeight(
  map: MLMap,
  width: number,
  height: number
): FlatBounds {
  // fitMapToMaxBounds(map);

  const { factor, physicalWidth, physicalHeight } =
    getRelativeFactorForWidthAndHeight(map, width, height);
  const maxPixelCoord = { x: width * factor, y: height * factor };
  const minPixelCoord = {
    x: (physicalWidth - maxPixelCoord.x) / 2,
    y: (physicalHeight - maxPixelCoord.y) / 2,
  };

  const maxCoord = toGeoCoord(map, [maxPixelCoord.x, maxPixelCoord.y]);
  const minCoord = toGeoCoord(map, [minPixelCoord.x, minPixelCoord.y]);

  return [minCoord.lng, minCoord.lat, maxCoord.lng, maxCoord.lat];
}

export function pixelsToLatLng(map: MLMap, pixel: number[]) {
  const lngLat = map.unproject([pixel[0], pixel[1]]);

  return [lngLat.lng, lngLat.lat] as [number, number];
}

export function fitMapContent(map: MLMap) {
  const maxBounds = map.getMaxBounds();
  if (maxBounds) {
    map.fitBounds(maxBounds);
  }
}

export function fitMapToMaxBounds(map: MLMap) {
  map.fitBounds([X_MIN, Y_MIN, X_MAX, Y_MAX]);
}

export function toPixelCoord(map: MLMap, lngLat: MLLngLatLike) {
  return map.project(lngLat);
}

export function toGeoCoord(map: MLMap, point: MLPointLike) {
  return map.unproject(point);
}

/**
 * It first transforms the pixels per physical width and height
 * e.g. if a pixel (10, 10) on an image of original width 1024px is recorded, and now the displayed actual
 * width of the image on map is 512px, the pixel will be transformed to (512/1024 * 10, 512/1024 * 10).
 *
 * Then it unprojects the pixel from pixel coords to geo coords
 * @param map
 * @param width
 * @param height
 * @param pixels
 */
export function unprojectPixelsForWidthAndHeight(
  map: MLMap,
  width: number,
  height: number,
  pixels: Array<{ x: number; y: number }>
) {
  const { factor } = getRelativeFactorForWidthAndHeight(map, width, height);
  return pixels.map(({ x, y }) => map.unproject([x * factor, y * factor]));
}

export function coordsToPointGeoJsonFeatureCollections(
  coords: Array<ReturnType<MLMap['unproject']>>
) {
  return {
    type: 'FeatureCollection',
    features: coords.map((coord) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: coord.toArray(),
      },
      properties: {}, // You can add additional properties if needed
    })),
  };
}

export function flatBoundsToClockwiseCoords(flatBounds: FlatBounds) {
  const [xMin, yMin, xMax, yMax] = flatBounds;
  return [
    [xMin, yMin],
    [xMax, yMin],
    [xMax, yMax],
    [xMin, yMax],
  ] as MLImageSourceSpecification['coordinates'];
}

export function projectPixelCoordsToViewportSize(
  captureWidth: number,
  captureHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  coordinates: Array<{ x: number; y: number }>
) {
  const translateFactorX = viewportWidth / captureWidth;
  // const translateFactorY = viewportHeight / captureHeight;

  // Note that y is not being translated here as a shorter viewport height doesn't mean the image is shrunk
  // For viewport responsiveness, only width is translated
  return coordinates.map(({ x, y }) => ({
    x: x * translateFactorX - (captureWidth - viewportWidth) / 4,
    y,
  }));
}

export {
  MLMap,
  MLMarker,
  type MLILngLat,
  type MLPoint2D,
  type MLImageSourceSpecification,
  type MLLngLatBoundsLike,
  type MLHeatmapLayerSpecification,
};
