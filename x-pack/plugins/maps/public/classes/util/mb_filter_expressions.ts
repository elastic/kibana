/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterSpecification } from '@kbn/mapbox-gl';
import {
  GEO_JSON_TYPE,
  FEATURE_VISIBLE_PROPERTY_NAME,
  KBN_IS_CENTROID_FEATURE,
} from '../../../common/constants';

import { Timeslice } from '../../../common/descriptor_types';

export interface TimesliceMaskConfig {
  timesliceMaskField: string;
  timeslice: Timeslice;
}

export const EXCLUDE_CENTROID_FEATURES = [
  '!=',
  ['get', KBN_IS_CENTROID_FEATURE],
  true,
] as FilterSpecification;

function getFilterExpression(
  filters: FilterSpecification[],
  hasJoins: boolean,
  timesliceMaskConfig?: TimesliceMaskConfig
): FilterSpecification {
  const allFilters: FilterSpecification = [...filters];

  if (hasJoins) {
    allFilters.push(['==', ['get', FEATURE_VISIBLE_PROPERTY_NAME], true]);
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
  hasJoins: boolean,
  timesliceMaskConfig?: TimesliceMaskConfig
): FilterSpecification {
  return getFilterExpression(
    [
      // explicit EXCLUDE_CENTROID_FEATURES filter not needed. Centroids are points and are filtered out by geometry narrowing
      [
        'any',
        ['==', ['geometry-type'], GEO_JSON_TYPE.POLYGON],
        ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POLYGON],
      ],
    ],
    hasJoins,
    timesliceMaskConfig
  );
}

export function getLineFilterExpression(
  hasJoins: boolean,
  timesliceMaskConfig?: TimesliceMaskConfig
): FilterSpecification {
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
    hasJoins,
    timesliceMaskConfig
  );
}

const IS_POINT_FEATURE = [
  'any',
  ['==', ['geometry-type'], GEO_JSON_TYPE.POINT],
  ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POINT],
];

export function getPointFilterExpression(
  hasJoins: boolean,
  timesliceMaskConfig?: TimesliceMaskConfig
): FilterSpecification {
  return getFilterExpression(
    [EXCLUDE_CENTROID_FEATURES, IS_POINT_FEATURE],
    hasJoins,
    timesliceMaskConfig
  );
}

export function getLabelFilterExpression(
  hasJoins: boolean,
  isSourceGeoJson: boolean,
  timesliceMaskConfig?: TimesliceMaskConfig
): FilterSpecification {
  const filters: FilterSpecification[] = [];

  if (isSourceGeoJson) {
    // Centroid feature added to GeoJSON feature collection for LINE_STRING, MULTI_LINE_STRING, POLYGON, MULTI_POLYGON, and GEOMETRY_COLLECTION geometries
    // For GeoJSON sources, show label for centroid features or point/multi-point features only.
    // no explicit isCentroidFeature filter is needed, centroids are points and are included in the geometry filter.
    filters.push(IS_POINT_FEATURE);
  }

  return getFilterExpression(filters, hasJoins, timesliceMaskConfig);
}
