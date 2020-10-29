/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureCollection, GeoJsonProperties, Polygon } from 'geojson';
import { MapExtent } from '../descriptor_types';
import { ES_GEO_FIELD_TYPE, ES_SPATIAL_RELATIONS } from '../constants';

export function scaleBounds(bounds: MapExtent, scaleFactor: number): MapExtent;

export function turfBboxToBounds(turfBbox: unknown): MapExtent;

export function clampToLatBounds(lat: number): number;

export function clampToLonBounds(lon: number): number;

export function hitsToGeoJson(
  hits: Array<Record<string, unknown>>,
  flattenHit: (elasticSearchHit: Record<string, unknown>) => GeoJsonProperties,
  geoFieldName: string,
  geoFieldType: ES_GEO_FIELD_TYPE,
  epochMillisFields: string[]
): FeatureCollection;

export interface ESBBox {
  top_left: number[];
  bottom_right: number[];
}

export interface ESGeoBoundingBoxFilter {
  geo_bounding_box: {
    [geoFieldName: string]: ESBBox;
  };
}

export interface ESPolygonFilter {
  geo_shape: {
    [geoFieldName: string]: {
      shape: Polygon;
      relation: ES_SPATIAL_RELATIONS.INTERSECTS;
    };
  };
}

export function createExtentFilter(
  mapExtent: MapExtent,
  geoFieldName: string,
  geoFieldType: ES_GEO_FIELD_TYPE
): ESPolygonFilter | ESGeoBoundingBoxFilter;

export function makeESBbox({ maxLat, maxLon, minLat, minLon }: MapExtent): ESBBox;
