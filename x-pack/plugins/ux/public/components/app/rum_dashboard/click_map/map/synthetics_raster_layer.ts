/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLICKS_LAYER_ID,
  SYNTHETICS_LAYER_ID,
  SYNTHETICS_SOURCE_ID,
} from './constants';
import {
  flatBoundsToClockwiseCoords,
  getMaxBoundsForPixelWidthHeight,
  MLMap,
} from './helpers';

export function addSyntheticsScreenshotRasterLayer(
  map: MLMap,
  viewportWidth: number,
  viewportHeight: number,
  imageUrl: string
) {
  map.addSource(SYNTHETICS_SOURCE_ID, {
    type: 'image',
    url: imageUrl,
    coordinates: flatBoundsToClockwiseCoords(
      getMaxBoundsForPixelWidthHeight(map, viewportWidth, viewportHeight)
    ),
  });

  map.addLayer(
    {
      id: SYNTHETICS_LAYER_ID,
      source: SYNTHETICS_SOURCE_ID,
      type: 'raster',
      paint: {
        'raster-opacity': 1,
      },
    },
    CLICKS_LAYER_ID
  );
}

// Remove the synthetics screenshot raster layer if it exists
export function removeSyntheticsScreenshotRasterLayer(map: MLMap) {
  if (map.getLayer(SYNTHETICS_LAYER_ID)) {
    map.removeLayer(SYNTHETICS_LAYER_ID);
  }
  if (map.getSource(SYNTHETICS_SOURCE_ID)) {
    map.removeSource(SYNTHETICS_SOURCE_ID);
  }
}
