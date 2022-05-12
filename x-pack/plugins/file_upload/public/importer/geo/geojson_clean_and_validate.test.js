/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanGeometry, geoJsonCleanAndValidate } from './geojson_clean_and_validate';
import * as jsts from 'jsts';

describe('geo_json_clean_and_validate', () => {
  const reader = new jsts.io.GeoJSONReader();

  it('should not modify valid features', () => {
    const goodFeatureGeoJson = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-104.05, 78.99],
            [-87.22, 78.98],
            [-86.58, 75.94],
            [-104.03, 75.94],
            [-104.05, 78.99],
          ],
        ],
      },
    };

    // Confirm valid geometry
    const geoJson = reader.read(goodFeatureGeoJson);
    const isSimpleOrValid = geoJson.geometry.isSimple() || geoJson.geometry.isValid();
    expect(isSimpleOrValid).toEqual(true);

    // Confirm no change to features
    const cleanedFeature = cleanGeometry(geoJson);
    expect(cleanedFeature).toEqual(goodFeatureGeoJson.geometry);
  });

  it('should modify incorrect features', () => {
    // This feature collection contains polygons which cross over themselves,
    // which is invalid for geojson
    const badFeaturesGeoJson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [0, 0],
                [2, 2],
                [0, 2],
                [2, 0],
                [0, 0],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [2, 2],
                [4, 0],
                [2, 0],
                [4, 2],
                [2, 2],
              ],
            ],
          },
        },
      ],
    };

    // Confirm invalid geometry
    let geoJson = reader.read(badFeaturesGeoJson);
    let isSimpleOrValid;
    geoJson.features.forEach((feature) => {
      isSimpleOrValid = feature.geometry.isSimple() || feature.geometry.isValid();
      expect(isSimpleOrValid).toEqual(false);
    });

    // Confirm changes to object
    const cleanedFeatures = geoJson.features.map((feature) => ({
      ...feature,
      geometry: cleanGeometry(feature),
    }));
    cleanedFeatures.forEach((feature, idx) =>
      expect(feature).not.toEqual(badFeaturesGeoJson.features[idx])
    );

    // Confirm now valid features geometry
    geoJson = reader.read({ ...badFeaturesGeoJson, features: cleanedFeatures });
    geoJson.features.forEach((feature) => {
      isSimpleOrValid = feature.geometry.isSimple() || feature.geometry.isValid();
      expect(isSimpleOrValid).toEqual(true);
    });
  });

  it('should reverse counter-clockwise winding order', () => {
    const counterClockwiseGeoJson = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [100, 0],
            [101, 0],
            [101, 1],
            [100, 1],
            [100, 0],
          ],
          [
            [100.2, 0.2],
            [100.8, 0.2],
            [100.8, 0.8],
            [100.2, 0.8],
            [100.2, 0.2],
          ],
        ],
      },
    };

    // Confirm changes to object
    const clockwiseGeoJson = geoJsonCleanAndValidate(counterClockwiseGeoJson);
    expect(clockwiseGeoJson).not.toEqual(counterClockwiseGeoJson);

    // Run it through again, expect it not to change
    const clockwiseGeoJson2 = geoJsonCleanAndValidate(clockwiseGeoJson);
    expect(clockwiseGeoJson).toEqual(clockwiseGeoJson2);
  });

  it('return same object if not cleanable', () => {
    const invalidGeoJson = {
      type: 'notMyType',
      geometry: 'shmeometry',
    };

    const uncleanableJson = geoJsonCleanAndValidate(invalidGeoJson);
    expect(uncleanableJson).toEqual(invalidGeoJson);
  });
});
