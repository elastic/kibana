/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assignFeatureIds, GEOJSON_FEATURE_ID_PROPERTY_NAME } from './assign_feature_ids';
import { FeatureCollection, Feature, Point } from 'geojson';

const featureId = 'myFeature1';

const geometry: Point = {
  type: 'Point',
  coordinates: [0, 0],
};

const defaultFeature: Feature = {
  type: 'Feature',
  geometry,
  properties: {},
};

test('should provide unique id when feature.id is not provided', () => {
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [{ ...defaultFeature }, { ...defaultFeature }],
  };

  const updatedFeatureCollection = assignFeatureIds(featureCollection);
  const feature1 = updatedFeatureCollection.features[0];
  const feature2 = updatedFeatureCollection.features[1];
  expect(typeof feature1.id).toBe('number');
  expect(typeof feature2.id).toBe('number');
  // @ts-ignore
  expect(feature1.id).toBe(feature1.properties[GEOJSON_FEATURE_ID_PROPERTY_NAME]);
  expect(feature1.id).not.toBe(feature2.id);
});

test('should preserve feature id when provided', () => {
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        ...defaultFeature,
        id: featureId,
      },
    ],
  };

  const updatedFeatureCollection = assignFeatureIds(featureCollection);
  const feature1 = updatedFeatureCollection.features[0];
  expect(typeof feature1.id).toBe('number');
  // @ts-ignore
  expect(feature1.id).not.toBe(feature1.properties[GEOJSON_FEATURE_ID_PROPERTY_NAME]);
  // @ts-ignore
  expect(feature1.properties[GEOJSON_FEATURE_ID_PROPERTY_NAME]).toBe(featureId);
});

test('should preserve feature id for falsy value', () => {
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        ...defaultFeature,
        id: 0,
      },
    ],
  };

  const updatedFeatureCollection = assignFeatureIds(featureCollection);
  const feature1 = updatedFeatureCollection.features[0];
  expect(typeof feature1.id).toBe('number');
  // @ts-ignore
  expect(feature1.id).not.toBe(feature1.properties[GEOJSON_FEATURE_ID_PROPERTY_NAME]);
  // @ts-ignore
  expect(feature1.properties[GEOJSON_FEATURE_ID_PROPERTY_NAME]).toBe(0);
});

test('should not modify original feature properties', () => {
  const featureProperties = {};
  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        ...defaultFeature,
        id: featureId,
        properties: featureProperties,
      },
    ],
  };

  const updatedFeatureCollection = assignFeatureIds(featureCollection);
  const feature1 = updatedFeatureCollection.features[0];
  // @ts-ignore
  expect(feature1.properties[GEOJSON_FEATURE_ID_PROPERTY_NAME]).toBe(featureId);
  expect(featureProperties).not.toHaveProperty(GEOJSON_FEATURE_ID_PROPERTY_NAME);
});
