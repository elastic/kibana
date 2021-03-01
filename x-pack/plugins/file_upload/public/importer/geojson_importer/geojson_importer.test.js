/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GeoJsonImporter } from './geojson_importer';
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

describe('readFile', () => {
  const setFileProgress = jest.fn((a) => a);

  const FILE_WITH_FEATURE_COLLECTION = new File(
    [JSON.stringify(FEATURE_COLLECTION)],
    'testfile.json',
    { type: 'text/json' }
  );

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  test('should throw error if no file provided', async () => {
    const importer = new GeoJsonImporter();
    await importer
      .readFile(null, setFileProgress, () => {
        return true;
      })
      .catch((e) => {
        expect(e.message).toMatch('Error, no file provided');
      });
  });

  test('should abort if file parse is cancelled', async () => {
    const importer = new GeoJsonImporter();

    const results = await importer.readFile(FILE_WITH_FEATURE_COLLECTION, setFileProgress, () => {
      return false;
    });

    expect(results).toBeNull();
  });

  test('should read features from feature collection', async () => {
    const importer = new GeoJsonImporter();
    const results = await importer.readFile(FILE_WITH_FEATURE_COLLECTION, setFileProgress, () => {
      return true;
    });

    expect(setFileProgress).toHaveBeenCalled();
    expect(results).toEqual({
      errors: [],
      geometryTypes: ['Point'],
      parsedGeojson: FEATURE_COLLECTION,
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

    const importer = new GeoJsonImporter();
    const results = await importer.readFile(
      fileWithFeaturesWithoutGeometry,
      setFileProgress,
      () => {
        return true;
      }
    );

    expect(setFileProgress).toHaveBeenCalled();
    expect(results).toEqual({
      errors: ['2 features without geometry omitted'],
      geometryTypes: ['Point'],
      parsedGeojson: FEATURE_COLLECTION,
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

    const importer = new GeoJsonImporter();
    const results = await importer.readFile(fileWithUnwrapedFeature, setFileProgress, () => {
      return true;
    });

    expect(setFileProgress).toHaveBeenCalled();
    expect(results).toEqual({
      errors: [],
      geometryTypes: ['Point'],
      parsedGeojson: FEATURE_COLLECTION,
    });
  });

  test('should throw if no features', async () => {
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

    const importer = new GeoJsonImporter();
    await importer
      .readFile(fileWithNoFeatures, setFileProgress, () => {
        return true;
      })
      .catch((e) => {
        expect(e.message).toMatch('Error, no features detected');
      });
  });

  test('should throw if no features with geometry', async () => {
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

    const importer = new GeoJsonImporter();
    await importer
      .readFile(fileWithFeaturesWithNoGeometry, setFileProgress, () => {
        return true;
      })
      .catch((e) => {
        expect(e.message).toMatch('Error, no features detected');
      });
  });
});

describe('setDocs', () => {
  test('should convert features to geo_point ES documents', () => {
    const importer = new GeoJsonImporter();
    importer.setDocs(FEATURE_COLLECTION, ES_FIELD_TYPES.GEO_POINT);
    expect(importer.getDocs()).toEqual([
      {
        coordinates: [-112.0372, 46.608058],
        population: 200,
      },
    ]);
  });

  test('should convert features to geo_shape ES documents', () => {
    const importer = new GeoJsonImporter();
    importer.setDocs(FEATURE_COLLECTION, ES_FIELD_TYPES.GEO_SHAPE);
    expect(importer.getDocs()).toEqual([
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
