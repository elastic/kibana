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
      settings: {
        index: false,
        properties: {
          showMapVisualizationTypes: { type: 'boolean' },
        },
      },
      indexPatternsWithGeoFieldCount: { type: 'long', index: false },
      indexPatternsWithGeoPointFieldCount: { type: 'long', index: false },
      indexPatternsWithGeoShapeFieldCount: { type: 'long', index: false },
      mapsTotalCount: { type: 'long', index: false },
      timeCaptured: { type: 'date', index: false },
      attributesPerMap: {
        index: false,
        properties: {
          dataSourcesCount: {
            properties: {
              min: { type: 'long' },
              max: { type: 'long' },
              avg: { type: 'long' },
            },
          },
          layersCount: {
            properties: {
              min: { type: 'long' },
              max: { type: 'long' },
              avg: { type: 'long' },
            },
          },
          layerTypesCount: { type: 'object' },
          emsVectorLayersCount: { type: 'object' },
        },
      },
    },
  },
};
