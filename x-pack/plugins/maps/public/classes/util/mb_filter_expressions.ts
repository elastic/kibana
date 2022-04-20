/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GEO_JSON_TYPE, KBN_IS_CENTROID_FEATURE } from '../../../common/constants';

import { Timeslice } from '../../../common/descriptor_types';

export interface TimesliceMaskConfig {
  timesliceMaskField: string;
  timeslice: Timeslice;
}

export const EXCLUDE_CENTROID_FEATURES = ['!=', ['get', KBN_IS_CENTROID_FEATURE], true];

function getFilterExpression(
  filters: unknown[],
  joinFilter?: unknown,
  timesliceMaskConfig?: TimesliceMaskConfig
) {
  const allFilters: unknown[] = [...filters];

  if (joinFilter) {
    allFilters.push(joinFilter);
  }

  if (timesliceMaskConfig) {
    allFilters.push(['has', timesliceMaskConfig.timesliceMaskField]);
    allFilters.push([
      '>=',
      ['get', timesliceMaskConfig.timesliceMaskField],
      timesliceMaskConfig.timeslice.from,
    ]);
    allFilters.push([
      '<',
      ['get', timesliceMaskConfig.timesliceMaskField],
      timesliceMaskConfig.timeslice.to,
    ]);
  }

  return ['all', ...allFilters];
}

export function getFillFilterExpression(
  joinFilter?: unknown,
  timesliceMaskConfig?: TimesliceMaskConfig
): unknown[] {
  return getFilterExpression(
    [
      // explicit EXCLUDE_CENTROID_FEATURES filter not needed. Centroids are points and are filtered out by geometry narrowing
      [
        'any',
        ['==', ['geometry-type'], GEO_JSON_TYPE.POLYGON],
        ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POLYGON],
      ],
    ],
    joinFilter,
    timesliceMaskConfig
  );
}

export function getLineFilterExpression(
  joinFilter?: unknown,
  timesliceMaskConfig?: TimesliceMaskConfig
): unknown[] {
  return getFilterExpression(
    [
      // explicit EXCLUDE_CENTROID_FEATURES filter not needed. Centroids are points and are filtered out by geometry narrowing
      [
        'any',
        ['==', ['geometry-type'], GEO_JSON_TYPE.POLYGON],
        ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POLYGON],
        ['==', ['geometry-type'], GEO_JSON_TYPE.LINE_STRING],
        ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_LINE_STRING],
      ],
    ],
    joinFilter,
    timesliceMaskConfig
  );
}

const IS_POINT_FEATURE = [
  'any',
  ['==', ['geometry-type'], GEO_JSON_TYPE.POINT],
  ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POINT],
];

export function getPointFilterExpression(
  joinFilter?: unknown,
  timesliceMaskConfig?: TimesliceMaskConfig
): unknown[] {
  return getFilterExpression(
    [EXCLUDE_CENTROID_FEATURES, IS_POINT_FEATURE],
    joinFilter,
    timesliceMaskConfig
  );
}

export function getLabelFilterExpression(
  isSourceGeoJson: boolean,
  joinFilter?: unknown,
  timesliceMaskConfig?: TimesliceMaskConfig
): unknown[] {
  const filters: unknown[] = [];

  if (isSourceGeoJson) {
    // Centroid feature added to GeoJSON feature collection for LINE_STRING, MULTI_LINE_STRING, POLYGON, MULTI_POLYGON, and GEOMETRY_COLLECTION geometries
    // For GeoJSON sources, show label for centroid features or point/multi-point features only.
    // no explicit isCentroidFeature filter is needed, centroids are points and are included in the geometry filter.
    filters.push(IS_POINT_FEATURE);
  }

  return getFilterExpression(filters, joinFilter, timesliceMaskConfig);
}
