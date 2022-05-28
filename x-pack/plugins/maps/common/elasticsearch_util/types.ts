/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Polygon, Position } from 'geojson';
import type { Filter } from '@kbn/es-query';
import { ES_SPATIAL_RELATIONS } from '../constants';

export type Coordinates = Position | Position[] | Position[][] | Position[][][];

// Elasticsearch stores more then just GeoJSON.
// 1) geometry.type as lower case string
// 2) circle and envelope types
export interface ESGeometry {
  type: string;
  coordinates: Coordinates;
}

export interface ESBBox {
  top_left: number[];
  bottom_right: number[];
}

export interface GeoShapeQueryBody {
  shape?: Polygon;
  relation?: ES_SPATIAL_RELATIONS;
  indexed_shape?: PreIndexedShape;
}

// Index signature explicitly states that anything stored in an object using a string conforms to the structure
// problem is that Elasticsearch signature also allows for other string keys to conform to other structures, like 'ignore_unmapped'
// Use intersection type to exclude certain properties from the index signature
// https://basarat.gitbook.io/typescript/type-system/index-signatures#excluding-certain-properties-from-the-index-signature
type GeoShapeQuery = { ignore_unmapped: boolean } & { [geoFieldName: string]: GeoShapeQueryBody };

export type GeoFilter = Filter & {
  geo_bounding_box?: {
    [geoFieldName: string]: ESBBox;
  };
  geo_distance?: {
    distance: string;
    [geoFieldName: string]: Position | { lat: number; lon: number } | string;
  };
  geo_shape?: GeoShapeQuery;
};

export interface PreIndexedShape {
  index: string;
  id: string | number;
  path: string;
}
