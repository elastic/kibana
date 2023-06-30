/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { Position } from 'geojson';
import type { Filter } from '@kbn/es-query';

export type Coordinates = Position | Position[] | Position[][] | Position[][][];

// Elasticsearch stores more then just GeoJSON.
// 1) geometry.type as lower case string
// 2) circle and envelope types
export interface ESGeometry {
  type: string;
  coordinates: Coordinates;
}

// Index signature explicitly states that anything stored in an object using a string conforms to the structure
// problem is that Elasticsearch signature also allows for other string keys to conform to other structures, like 'ignore_unmapped'
// Use intersection type to exclude certain properties from the index signature
// https://basarat.gitbook.io/typescript/type-system/index-signatures#excluding-certain-properties-from-the-index-signature
type GeoShapeQuery = { ignore_unmapped: boolean } & { [geoFieldName: string]: estypes.QueryDslGeoShapeFieldQuery };

export type GeoFilter = Filter & {
  geo_bounding_box?: {
    [geoFieldName: string]: estypes.TopLeftBottomRightGeoBounds;
  };
  geo_distance?: {
    distance: string;
    [geoFieldName: string]: Position | { lat: number; lon: number } | string;
  };
  geo_grid?: {
    [geoFieldName: string]: {
      geohex?: string;
      geotile?: string;
    };
  };
  geo_shape?: GeoShapeQuery;
};
