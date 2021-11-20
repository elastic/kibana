/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeoJsonImporter, createChunks, toEsDoc } from './geojson_importer';
import { ES_FIELD_TYPES } from '../../../../../../src/plugins/data/public';
import '@loaders.gl/polyfills';

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
    },
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
};

describe('previewFile', () => {
  const FILE_WITH_FEATURE_COLLECTION = new File(
    [JSON.stringify(FEATURE_COLLECTION)],
    'testfile.json',
    { type: 'text/json' }
  );

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  test('should stop reading when importer is destroyed', async () => {
    const importer = new GeoJsonImporter(FILE_WITH_FEATURE_COLLECTION);
    importer.destroy();
    const results = await importer.previewFile();
    expect(results).toEqual({
      features: [],
      previewCoverage: 0,
      hasPoints: false,
      hasShapes: false,
    });
  });

  test('should read features from feature collection', async () => {
    const importer = new GeoJsonImporter(FILE_WITH_FEATURE_COLLECTION);
    const results = await importer.previewFile();
    expect(results).toEqual({
      previewCoverage: 100,
      hasPoints: true,
      hasShapes: false,
      features: FEATURE_COLLECTION.features,
    });
  });

  test('should read GeometryCollection feature', async () => {
    const fileWithGeometryCollectionFeature = new File(
      [
        JSON.stringify({
          type: 'FeatureCollection',
          features: [GEOMETRY_COLLECTION_FEATURE],
        }),
      ],
      'testfile.json',
      { type: 'text/json' }
    );
    const importer = new GeoJsonImporter(fileWithGeometryCollectionFeature);
    const results = await importer.previewFile();
    expect(results).toEqual({
      previewCoverage: 100,
      hasPoints: false,
      hasShapes: true,
      features: [GEOMETRY_COLLECTION_FEATURE],
    });
  });

  test('should remove features without geometry', async () => {
    const fileWithFeaturesWithoutGeometry = new File(
      [
        JSON.stringify({
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
            },
            {},
            { geometry: {} },
          ],
        }),
      ],
      'testfile.json',
      { type: 'text/json' }
    );

    const importer = new GeoJsonImporter(fileWithFeaturesWithoutGeometry);
    const results = await importer.previewFile();

    expect(results).toEqual({
      previewCoverage: 100,
      hasPoints: true,
      hasShapes: false,
      features: FEATURE_COLLECTION.features,
    });
  });

  test('should read unwrapped feature', async () => {
    const fileWithUnwrapedFeature = new File(
      [
        JSON.stringify({
          type: 'Feature',
          properties: {
            population: 200,
          },
          geometry: {
            type: 'Point',
            coordinates: [-112.0372, 46.608058],
          },
        }),
      ],
      'testfile.json',
      { type: 'text/json' }
    );

    const importer = new GeoJsonImporter(fileWithUnwrapedFeature);
    const results = await importer.previewFile();

    expect(results).toEqual({
      previewCoverage: 100,
      hasPoints: true,
      hasShapes: false,
      features: FEATURE_COLLECTION.features,
    });
  });

  test('should return empty feature collection if no features', async () => {
    const fileWithNoFeatures = new File(
      [
        JSON.stringify({
          type: 'FeatureCollection',
          features: [],
        }),
      ],
      'testfile.json',
      { type: 'text/json' }
    );

    const importer = new GeoJsonImporter(fileWithNoFeatures);
    const results = await importer.previewFile();

    expect(results).toEqual({
      previewCoverage: 100,
      hasPoints: false,
      hasShapes: false,
      features: [],
    });
  });

  test('should return empty feature collection if no features with geometry', async () => {
    const fileWithFeaturesWithNoGeometry = new File(
      [
        JSON.stringify({
          type: 'FeatureCollection',
          features: [
            {},
            {
              geometry: {},
            },
          ],
        }),
      ],
      'testfile.json',
      { type: 'text/json' }
    );

    const importer = new GeoJsonImporter(fileWithFeaturesWithNoGeometry);
    const results = await importer.previewFile();

    expect(results).toEqual({
      previewCoverage: 100,
      hasPoints: false,
      hasShapes: false,
      features: [],
    });
  });
});

describe('toEsDoc', () => {
  test('should convert feature to geo_point ES document', () => {
    const esDoc = toEsDoc(FEATURE_COLLECTION.features[0], ES_FIELD_TYPES.GEO_POINT);
    expect(esDoc).toEqual({
      coordinates: [-112.0372, 46.608058],
      population: 200,
    });
  });

  test('should convert feature to geo_shape ES document', () => {
    const esDoc = toEsDoc(FEATURE_COLLECTION.features[0], ES_FIELD_TYPES.GEO_SHAPE);
    expect(esDoc).toEqual({
      coordinates: {
        type: 'Point',
        coordinates: [-112.0372, 46.608058],
      },
      population: 200,
    });
  });

  test('should convert GeometryCollection feature to geo_shape ES document', () => {
    const esDoc = toEsDoc(GEOMETRY_COLLECTION_FEATURE, ES_FIELD_TYPES.GEO_SHAPE);
    expect(esDoc).toEqual({
      coordinates: {
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
