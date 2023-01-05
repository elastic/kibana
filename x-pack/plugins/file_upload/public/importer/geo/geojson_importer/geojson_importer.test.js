/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeoJsonImporter } from './geojson_importer';
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
      invalidFeatures: [],
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
      invalidFeatures: [],
    });
  });

  test('should read single feature from feature collection', async () => {
    const file = new File(
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
          ],
        }),
      ],
      'testfile.json',
      { type: 'text/json' }
    );

    const importer = new GeoJsonImporter(file);
    const results = await importer.previewFile();

    expect(results.features.length).toBe(1);
    expect(results.invalidFeatures.length).toBe(0);
  });

  test('should read feature when file contains single feature not wrapped in feature collection', async () => {
    const fileWithSingleFeature = new File(
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

    const importer = new GeoJsonImporter(fileWithSingleFeature);
    const results = await importer.previewFile();

    expect(results).toEqual({
      previewCoverage: 100,
      hasPoints: true,
      hasShapes: false,
      features: FEATURE_COLLECTION.features,
      invalidFeatures: [],
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
      invalidFeatures: [],
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

    expect(results.previewCoverage).toBe(100);
    expect(results.hasPoints).toBe(true);
    expect(results.hasShapes).toBe(false);
    expect(results.features).toEqual(FEATURE_COLLECTION.features);
    expect(results.invalidFeatures.length).toBe(2);
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
      invalidFeatures: [],
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

    expect(results.previewCoverage).toBe(100);
    expect(results.hasPoints).toBe(false);
    expect(results.hasShapes).toBe(false);
    expect(results.features).toEqual([]);
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

    expect(results.previewCoverage).toBe(100);
    expect(results.hasPoints).toBe(false);
    expect(results.hasShapes).toBe(false);
    expect(results.features).toEqual([]);
    expect(results.invalidFeatures.length).toBe(2);
  });

  describe('crs', () => {
    test('should read features with supported CRS', async () => {
      const file = new File(
        [
          JSON.stringify({
            ...FEATURE_COLLECTION,
            crs: {
              type: 'name',
              properties: {
                name: 'urn:ogc:def:crs:OGC:1.3:CRS84',
              },
            },
          }),
        ],
        'testfile.json',
        { type: 'text/json' }
      );

      const importer = new GeoJsonImporter(file);
      const results = await importer.previewFile();

      expect(results).toEqual({
        previewCoverage: 100,
        hasPoints: true,
        hasShapes: false,
        features: FEATURE_COLLECTION.features,
        invalidFeatures: [],
      });
    });

    test('should reject "link" CRS', async () => {
      const file = new File(
        [
          JSON.stringify({
            ...FEATURE_COLLECTION,
            crs: {
              type: 'link',
            },
          }),
        ],
        'testfile.json',
        { type: 'text/json' }
      );

      const importer = new GeoJsonImporter(file);
      await expect(importer.previewFile()).rejects.toThrow();
    });

    test('should reject unsupported CRS', async () => {
      const file = new File(
        [
          JSON.stringify({
            ...FEATURE_COLLECTION,
            crs: {
              type: 'name',
              properties: {
                name: 'urn:ogc:def:crs:EPSG::25833',
              },
            },
          }),
        ],
        'testfile.json',
        { type: 'text/json' }
      );

      const importer = new GeoJsonImporter(file);
      await expect(importer.previewFile()).rejects.toThrow();
    });
  });
});
