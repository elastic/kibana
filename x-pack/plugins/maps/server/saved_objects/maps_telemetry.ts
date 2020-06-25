/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsType } from 'src/core/server';

export const mapsTelemetrySavedObjects: SavedObjectsType = {
  name: 'maps-telemetry',
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      settings: { type: 'object', index: false },
      indexPatternsWithGeoFieldCount: { type: 'long', index: false },
      indexPatternsWithGeoPointFieldCount: { type: 'long', index: false },
      indexPatternsWithGeoShapeFieldCount: { type: 'long', index: false },
      mapsTotalCount: { type: 'long', index: false },
      timeCaptured: { type: 'date', index: false },
      attributesPerMap: { type: 'object', index: false },
    },
  },
};
