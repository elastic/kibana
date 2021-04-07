/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Feature, Point } from 'geojson';
import { euiPaletteColorBlind } from '@elastic/eui';
import { DEFAULT_GEO_REGEX } from './geo_point_content';
// import { SOURCE_TYPES } from '../../../../../../maps/common/constants';

// TODO - copied from maps, fix import link, resolve circular dependency
export enum SOURCE_TYPES {
  EMS_TMS = 'EMS_TMS',
  EMS_FILE = 'EMS_FILE',
  ES_GEO_GRID = 'ES_GEO_GRID',
  ES_GEO_LINE = 'ES_GEO_LINE',
  ES_SEARCH = 'ES_SEARCH',
  ES_PEW_PEW = 'ES_PEW_PEW',
  ES_TERM_SOURCE = 'ES_TERM_SOURCE',
  EMS_XYZ = 'EMS_XYZ', // identifies a custom TMS source. Name is a little unfortunate.
  WMS = 'WMS',
  KIBANA_TILEMAP = 'KIBANA_TILEMAP',
  REGIONMAP_FILE = 'REGIONMAP_FILE',
  GEOJSON_FILE = 'GEOJSON_FILE',
  MVT_SINGLE_LAYER = 'MVT_SINGLE_LAYER',
  TABLE_SOURCE = 'TABLE_SOURCE',
}

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
