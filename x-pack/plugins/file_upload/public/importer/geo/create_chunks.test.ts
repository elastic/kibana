/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature } from 'geojson';
import { createChunks, toEsDoc } from './create_chunks';
import { ES_FIELD_TYPES } from '../../../../../../src/plugins/data/public';

const FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        population: 200,
      },
      geometry: {
        type: 'Point',
        coordinates: [-112.0372, 46.608058],
      },
    } as Feature,
  ],
};

const GEOMETRY_COLLECTION_FEATURE = {
  type: 'Feature',
  properties: {
    population: 200,
  },
  geometry: {
    type: 'GeometryCollection',
    geometries: [
      {
        type: 'Point',
        coordinates: [100.0, 0.0],
      },
      {
        type: 'LineString',
        coordinates: [
          [101.0, 0.0],
          [102.0, 1.0],
        ],
      },
    ],
  },
} as Feature;

describe('toEsDoc', () => {
  test('should convert feature to geo_point ES document', () => {
    const esDoc = toEsDoc(FEATURE_COLLECTION.features[0], ES_FIELD_TYPES.GEO_POINT);
    expect(esDoc).toEqual({
      geometry: [-112.0372, 46.608058],
      population: 200,
    });
  });

  test('should convert feature to geo_shape ES document', () => {
    const esDoc = toEsDoc(FEATURE_COLLECTION.features[0], ES_FIELD_TYPES.GEO_SHAPE);
    expect(esDoc).toEqual({
      geometry: {
        type: 'Point',
        coordinates: [-112.0372, 46.608058],
      },
      population: 200,
    });
  });

  test('should convert GeometryCollection feature to geo_shape ES document', () => {
    const esDoc = toEsDoc(GEOMETRY_COLLECTION_FEATURE, ES_FIELD_TYPES.GEO_SHAPE);
    expect(esDoc).toEqual({
      geometry: {
        type: 'GeometryCollection',
        geometries: [
          {
            type: 'Point',
            coordinates: [100.0, 0.0],
          },
          {
            type: 'LineString',
            coordinates: [
              [101.0, 0.0],
              [102.0, 1.0],
            ],
          },
        ],
      },
      population: 200,
    });
  });
});

describe('createChunks', () => {
  const GEOMETRY_COLLECTION_DOC_CHARS = JSON.stringify(
    toEsDoc(GEOMETRY_COLLECTION_FEATURE, ES_FIELD_TYPES.GEO_SHAPE)
  ).length;

  const features = [
    GEOMETRY_COLLECTION_FEATURE,
    GEOMETRY_COLLECTION_FEATURE,
    GEOMETRY_COLLECTION_FEATURE,
    GEOMETRY_COLLECTION_FEATURE,
    GEOMETRY_COLLECTION_FEATURE,
  ];

  test('should break features into chunks', () => {
    const maxChunkCharCount = GEOMETRY_COLLECTION_DOC_CHARS * 3.5;
    const chunks = createChunks(features, ES_FIELD_TYPES.GEO_SHAPE, maxChunkCharCount);
    expect(chunks.length).toBe(2);
    expect(chunks[0].length).toBe(3);
    expect(chunks[1].length).toBe(2);
  });

  test('should break features into chunks containing only single feature when feature size is greater than maxChunkCharCount', () => {
    const maxChunkCharCount = GEOMETRY_COLLECTION_DOC_CHARS * 0.8;
    const chunks = createChunks(features, ES_FIELD_TYPES.GEO_SHAPE, maxChunkCharCount);
    expect(chunks.length).toBe(5);
    expect(chunks[0].length).toBe(1);
    expect(chunks[1].length).toBe(1);
    expect(chunks[2].length).toBe(1);
    expect(chunks[3].length).toBe(1);
    expect(chunks[4].length).toBe(1);
  });
});
