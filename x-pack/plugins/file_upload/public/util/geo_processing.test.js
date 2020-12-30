/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { geoJsonToEs } from './geo_processing';
import { ES_GEO_FIELD_TYPE } from '../../common/constants/file_import';

describe('geo_processing', () => {
  describe('getGeoJsonToEs', () => {
    const parsedPointFeature = {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [105.7, 18.9],
      },
      properties: {
        name: 'Dogeville',
      },
    };

    it('should convert point feature to flattened ES compatible feature', () => {
      const esFeatureArr = geoJsonToEs(parsedPointFeature, ES_GEO_FIELD_TYPE.GEO_POINT);
      expect(esFeatureArr).toEqual([
        {
          coordinates: [105.7, 18.9],
          name: 'Dogeville',
        },
      ]);
    });

    it('should convert point feature collection to flattened ES compatible feature', () => {
      const parsedPointFeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [34.1, 15.3],
            },
            properties: {
              name: 'Meowsers City',
            },
          },
        ],
      };

      const esFeatureArr = geoJsonToEs(parsedPointFeatureCollection, ES_GEO_FIELD_TYPE.GEO_POINT);
      expect(esFeatureArr).toEqual([
        {
          coordinates: [34.1, 15.3],
          name: 'Meowsers City',
        },
      ]);
    });

    it('should convert shape feature to flattened ES compatible feature', () => {
      const parsedShapeFeature = {
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
        properties: {
          name: 'Whiskers City',
        },
      };

      const esFeatureArr = geoJsonToEs(parsedShapeFeature, ES_GEO_FIELD_TYPE.GEO_SHAPE);
      expect(esFeatureArr).toEqual([
        {
          coordinates: {
            coordinates: [
              [
                [-104.05, 78.99],
                [-87.22, 78.98],
                [-86.58, 75.94],
                [-104.03, 75.94],
                [-104.05, 78.99],
              ],
            ],
            type: 'polygon',
          },
          name: 'Whiskers City',
        },
      ]);
    });

    it('should convert shape feature collection to flattened ES compatible feature', () => {
      const parsedShapeFeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-104.05, 79.89],
                  [-87.22, 79.88],
                  [-86.58, 74.84],
                  [-104.03, 75.84],
                  [-104.05, 78.89],
                ],
              ],
            },
            properties: {
              name: 'Woof Crossing',
            },
          },
        ],
      };

      const esFeatureArr = geoJsonToEs(parsedShapeFeatureCollection, ES_GEO_FIELD_TYPE.GEO_SHAPE);
      expect(esFeatureArr).toEqual([
        {
          coordinates: {
            coordinates: [
              [
                [-104.05, 79.89],
                [-87.22, 79.88],
                [-86.58, 74.84],
                [-104.03, 75.84],
                [-104.05, 78.89],
              ],
            ],
            type: 'polygon',
          },
          name: 'Woof Crossing',
        },
      ]);
    });

    it('should return an empty for an unhandled datatype', () => {
      const esFeatureArr = geoJsonToEs(parsedPointFeature, 'different datatype');
      expect(esFeatureArr).toEqual([]);
    });
  });
});
