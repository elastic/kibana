/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GEO_JSON_TYPE,
  FEATURE_VISIBLE_PROPERTY_NAME,
  KBN_IS_CENTROID_FEATURE,
  KBN_METADATA_FEATURE,
} from '../../../common/constants';

export const EXCLUDE_TOO_MANY_FEATURES_BOX = ['!=', ['get', KBN_METADATA_FEATURE], true];
const EXCLUDE_CENTROID_FEATURES = ['!=', ['get', KBN_IS_CENTROID_FEATURE], true];

function getFilterExpression(geometryFilter: unknown[], hasJoins: boolean) {
  const filters: unknown[] = [
    EXCLUDE_TOO_MANY_FEATURES_BOX,
    EXCLUDE_CENTROID_FEATURES,
    geometryFilter,
  ];

  if (hasJoins) {
    filters.push(['==', ['get', FEATURE_VISIBLE_PROPERTY_NAME], true]);
  }

  return ['all', ...filters];
}

export function getFillFilterExpression(hasJoins: boolean): unknown[] {
  return getFilterExpression(
    [
      'any',
      ['==', ['geometry-type'], GEO_JSON_TYPE.POLYGON],
      ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POLYGON],
    ],
    hasJoins
  );
}

export function getLineFilterExpression(hasJoins: boolean): unknown[] {
  return getFilterExpression(
    [
      'any',
      ['==', ['geometry-type'], GEO_JSON_TYPE.POLYGON],
      ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POLYGON],
      ['==', ['geometry-type'], GEO_JSON_TYPE.LINE_STRING],
      ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_LINE_STRING],
    ],
    hasJoins
  );
}

export function getPointFilterExpression(hasJoins: boolean): unknown[] {
  return getFilterExpression(
    [
      'any',
      ['==', ['geometry-type'], GEO_JSON_TYPE.POINT],
      ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POINT],
    ],
    hasJoins
  );
}

export function getCentroidFilterExpression(hasJoins: boolean): unknown[] {
  const filters: unknown[] = [
    EXCLUDE_TOO_MANY_FEATURES_BOX,
    ['==', ['get', KBN_IS_CENTROID_FEATURE], true],
  ];

  if (hasJoins) {
    filters.push(['==', ['get', FEATURE_VISIBLE_PROPERTY_NAME], true]);
  }

  return ['all', ...filters];
}
