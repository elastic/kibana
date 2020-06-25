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
        properties: {
          showMapVisualizationTypes: { type: 'boolean', index: false },
        },
      },
      indexPatternsWithGeoFieldCount: { type: 'long', index: false },
      indexPatternsWithGeoPointFieldCount: { type: 'long', index: false },
      indexPatternsWithGeoShapeFieldCount: { type: 'long', index: false },
      mapsTotalCount: { type: 'long', index: false },
      timeCaptured: { type: 'date', index: false },
      attributesPerMap: {
        properties: {
          dataSourcesCount: {
            properties: {
              min: { type: 'long', index: false },
              max: { type: 'long', index: false },
              avg: { type: 'long', index: false },
            },
          },
          layersCount: {
            properties: {
              min: { type: 'long', index: false },
              max: { type: 'long', index: false },
              avg: { type: 'long', index: false },
            },
          },
          layerTypesCount: { type: 'object', index: false },
          emsVectorLayersCount: { type: 'object', index: false },
        },
      },
    },
  },
};
