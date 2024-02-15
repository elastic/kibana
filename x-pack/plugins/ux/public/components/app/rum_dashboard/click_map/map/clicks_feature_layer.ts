/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLICKS_LAYER_ID, CLICKS_SOURCE_ID } from './constants';
import {
  coordsToPointGeoJsonFeatureCollections,
  MLMap,
  unprojectPixelsForWidthAndHeight,
  MLHeatmapLayerSpecification,
} from './helpers';

export function addClicksFeatureLayer(
  map: MLMap,
  captureWidth: number, // e.g. innerWidth
  captureHeight: number, // e.g. innerHeight
  viewportWidth: number,
  viewportHeight: number,
  translatedPixelCoordinates: Array<{ x: number; y: number }> // Coordinates translated as per viewport width and height
) {
  map.addSource(CLICKS_SOURCE_ID, {
    type: 'geojson',
    data: coordsToPointGeoJsonFeatureCollections(
      unprojectPixelsForWidthAndHeight(
        map,
        viewportWidth,
        viewportHeight,
        translatedPixelCoordinates
      )
    ),
  });

  map.addLayer({
    id: CLICKS_LAYER_ID,
    type: 'heatmap',
    source: CLICKS_SOURCE_ID,
    paint: pointStyle2,
  });
}

// Remove the clicks feature layer if it exists
export function removeClicksFeatureLayer(map: MLMap) {
  if (map.getLayer(CLICKS_LAYER_ID)) {
    map.removeLayer(CLICKS_LAYER_ID);
  }
  if (map.getSource(CLICKS_SOURCE_ID)) {
    map.removeSource(CLICKS_SOURCE_ID);
  }
}

const pointStyle1 = {
  // Increase the heatmap weight based on frequency and property magnitude
  'heatmap-weight': ['interpolate', ['linear'], ['get', 'mag'], 0, 0, 6, 1],
  // Increase the heatmap color weight weight by zoom level
  // heatmap-intensity is a multiplier on top of heatmap-weight
  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
  // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
  // Begin color ramp at 0-stop with a 0-transparancy color
  // to create a blur-like effect.
  'heatmap-color': [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(33,102,172,0)',
    0.2,
    'rgb(94,213,100)',
    0.4,
    'rgb(162,161,87)',
    0.6,
    'rgb(194,101,80)',
    0.8,
    'rgb(173,67,36)',
    1,
    'rgb(178,24,43)',
  ],
  // Adjust the heatmap radius by zoom level
  'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 20],
  // Transition from heatmap to circle layer by zoom level
  'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 1, 9, 0],
} as MLHeatmapLayerSpecification['paint'];

const pointStyle2 = {
  'heatmap-weight': 0.5, // You can adjust this value based on your preference
  'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
  'heatmap-color': [
    'interpolate',
    ['linear'],
    ['heatmap-density'],
    0,
    'rgba(50, 50, 255, 0)',
    0.2,
    'rgb(7,43,63)',
    0.4,
    'rgb(24,87,171)',
    0.6,
    'rgb(255, 255, 102)',
    0.8,
    'rgb(255, 128, 0)',
    1,
    'rgb(204, 0, 0)',
  ],
  'heatmap-radius': [
    'interpolate',
    ['linear'],
    ['zoom'],
    0,
    1,
    9,
    70, // Adjust the maximum radius based on your preference
  ],
  'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 7, 0.7, 9, 0],
} as MLHeatmapLayerSpecification['paint'];
