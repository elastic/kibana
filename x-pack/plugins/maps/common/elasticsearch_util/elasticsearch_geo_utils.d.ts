/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureCollection, GeoJsonProperties } from 'geojson';
import { MapExtent } from '../descriptor_types';
import { ES_GEO_FIELD_TYPE } from '../constants';

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
