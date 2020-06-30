/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFeatureCollectionBounds } from './get_feature_collection_bounds';
import { FeatureCollection, Feature, Point } from 'geojson';
import { FEATURE_VISIBLE_PROPERTY_NAME } from '../../../common/constants';

const visibleFeature: Feature = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [0, 0],
  } as Point,
  properties: {
    [FEATURE_VISIBLE_PROPERTY_NAME]: true,
  },
};

const nonVisibleFeature: Feature = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [10, 0],
  } as Point,
  properties: {
    [FEATURE_VISIBLE_PROPERTY_NAME]: false,
  },
};

const featureWithoutVisibilityProp: Feature = {
  type: 'Feature',
  geometry: {
    type: 'Point',
    coordinates: [-10, 0],
  } as Point,
  properties: {},
};

const featureCollection: FeatureCollection = {
  type: 'FeatureCollection',
  features: [visibleFeature, nonVisibleFeature, featureWithoutVisibilityProp],
};

test('should return bounding box for visible features with join', () => {
  expect(getFeatureCollectionBounds(featureCollection, true)).toEqual({
    maxLat: 0,
    maxLon: 0,
    minLat: 0,
    minLon: 0,
  });
});

test('should return bounding box for all features without join', () => {
  expect(getFeatureCollectionBounds(featureCollection, false)).toEqual({
    maxLat: 0,
    maxLon: 10,
    minLat: 0,
    minLon: -10,
  });
});

test('should return null when there are no features', () => {
  const featureCollectionWithNoVisibileFeatures: FeatureCollection = {
    type: 'FeatureCollection',
    features: [nonVisibleFeature, featureWithoutVisibilityProp],
  };
  expect(getFeatureCollectionBounds(featureCollectionWithNoVisibileFeatures, true)).toBeNull();
});
