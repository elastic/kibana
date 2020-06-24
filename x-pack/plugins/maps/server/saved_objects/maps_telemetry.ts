/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SavedObjectsType } from 'src/core/server';

export const mapsTelemetrySavedObjects: SavedObjectsType = {
  name: 'maps',
  hidden: false,
  namespaceType: 'agnostic',
  mappings: {
    properties: {
      settings: {
        properties: {
          showMapVisualizationTypes: { type: 'boolean' },
        },
      },
      indexPatternsWithGeoFieldCount: { type: 'long' },
      indexPatternsWithGeoPointFieldCount: { type: 'long' },
      indexPatternsWithGeoShapeFieldCount: { type: 'long' },
      mapsTotalCount: { type: 'long' },
      timeCaptured: { type: 'date' },
      attributesPerMap: {
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
          layerTypesCount: { dynamic: 'true', properties: {} },
          emsVectorLayersCount: { dynamic: 'true', properties: {} },
        },
      },
    },
  },
};
