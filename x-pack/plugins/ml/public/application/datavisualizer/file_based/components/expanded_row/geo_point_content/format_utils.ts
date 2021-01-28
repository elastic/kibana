/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, Point } from 'geojson';
import { euiPaletteColorBlind } from '@elastic/eui';
import { DEFAULT_GEO_REGEX } from './geo_point_content';
import { SOURCE_TYPES } from '../../../../../../../../maps/common/constants';

export const convertWKTGeoToLonLat = (
  value: string | number
): { lat: number; lon: number } | undefined => {
  if (typeof value === 'string') {
    const trimmedValue = value.trim().replace('POINT (', '').replace(')', '');
    const regExpSerializer = DEFAULT_GEO_REGEX;
    const parsed = regExpSerializer.exec(trimmedValue.trim());

    if (parsed?.groups?.lat != null && parsed?.groups?.lon != null) {
      return {
        lat: parseFloat(parsed.groups.lat.trim()),
        lon: parseFloat(parsed.groups.lon.trim()),
      };
    }
  }
};

export const DEFAULT_POINT_COLOR = euiPaletteColorBlind()[0];
export const getGeoPointsLayer = (
  features: Array<Feature<Point>>,
  pointColor: string = DEFAULT_POINT_COLOR
) => {
  return {
    id: 'geo_points',
    label: 'Geo points',
    sourceDescriptor: {
      type: SOURCE_TYPES.GEOJSON_FILE,
      __featureCollection: {
        features,
        type: 'FeatureCollection',
      },
    },
    visible: true,
    style: {
      type: 'VECTOR',
      properties: {
        fillColor: {
          type: 'STATIC',
          options: {
            color: pointColor,
          },
        },
        lineColor: {
          type: 'STATIC',
          options: {
            color: '#fff',
          },
        },
        lineWidth: {
          type: 'STATIC',
          options: {
            size: 2,
          },
        },
        iconSize: {
          type: 'STATIC',
          options: {
            size: 6,
          },
        },
      },
    },
    type: 'VECTOR',
  };
};
