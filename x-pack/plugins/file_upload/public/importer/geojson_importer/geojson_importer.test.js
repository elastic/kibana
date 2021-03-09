/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeoJsonImporter, toEsDocs } from './geojson_importer';
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

describe('toEsDocs', () => {
  test('should convert features to geo_point ES documents', () => {
    const esDocs = toEsDocs(FEATURE_COLLECTION.features, ES_FIELD_TYPES.GEO_POINT);
    expect(esDocs).toEqual([
      {
        coordinates: [-112.0372, 46.608058],
        population: 200,
      },
    ]);
  });

  test('should convert features to geo_shape ES documents', () => {
    const esDocs = toEsDocs(FEATURE_COLLECTION.features, ES_FIELD_TYPES.GEO_SHAPE);
    expect(esDocs).toEqual([
      {
        coordinates: {
          type: 'point',
          coordinates: [-112.0372, 46.608058],
        },
        population: 200,
      },
    ]);
  });
});
