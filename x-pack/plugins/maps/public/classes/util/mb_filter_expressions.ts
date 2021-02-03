/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  GEO_JSON_TYPE,
  FEATURE_VISIBLE_PROPERTY_NAME,
  KBN_IS_CENTROID_FEATURE,
  KBN_TOO_MANY_FEATURES_PROPERTY,
} from '../../../common/constants';

export const EXCLUDE_TOO_MANY_FEATURES_BOX = ['!=', ['get', KBN_TOO_MANY_FEATURES_PROPERTY], true];
const EXCLUDE_CENTROID_FEATURES = ['!=', ['get', KBN_IS_CENTROID_FEATURE], true];

const VISIBILITY_FILTER_CLAUSE = ['all', ['==', ['get', FEATURE_VISIBLE_PROPERTY_NAME], true]];
// Kibana features are features added by kibana that do not exist in real data
const EXCLUDE_KBN_FEATURES = ['all', EXCLUDE_TOO_MANY_FEATURES_BOX, EXCLUDE_CENTROID_FEATURES];

const CLOSED_SHAPE_MB_FILTER = [
  ...EXCLUDE_KBN_FEATURES,
  [
    'any',
    ['==', ['geometry-type'], GEO_JSON_TYPE.POLYGON],
    ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POLYGON],
  ],
];

const VISIBLE_CLOSED_SHAPE_MB_FILTER = [...VISIBILITY_FILTER_CLAUSE, CLOSED_SHAPE_MB_FILTER];

const ALL_SHAPE_MB_FILTER = [
  ...EXCLUDE_KBN_FEATURES,
  [
    'any',
    ['==', ['geometry-type'], GEO_JSON_TYPE.POLYGON],
    ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POLYGON],
    ['==', ['geometry-type'], GEO_JSON_TYPE.LINE_STRING],
    ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_LINE_STRING],
  ],
];

const VISIBLE_ALL_SHAPE_MB_FILTER = [...VISIBILITY_FILTER_CLAUSE, ALL_SHAPE_MB_FILTER];

const POINT_MB_FILTER = [
  ...EXCLUDE_KBN_FEATURES,
  [
    'any',
    ['==', ['geometry-type'], GEO_JSON_TYPE.POINT],
    ['==', ['geometry-type'], GEO_JSON_TYPE.MULTI_POINT],
  ],
];

const VISIBLE_POINT_MB_FILTER = [...VISIBILITY_FILTER_CLAUSE, POINT_MB_FILTER];

const CENTROID_MB_FILTER = ['all', ['==', ['get', KBN_IS_CENTROID_FEATURE], true]];

const VISIBLE_CENTROID_MB_FILTER = [...VISIBILITY_FILTER_CLAUSE, CENTROID_MB_FILTER];

export function getFillFilterExpression(hasJoins: boolean): unknown[] {
  return hasJoins ? VISIBLE_CLOSED_SHAPE_MB_FILTER : CLOSED_SHAPE_MB_FILTER;
}

export function getLineFilterExpression(hasJoins: boolean): unknown[] {
  return hasJoins ? VISIBLE_ALL_SHAPE_MB_FILTER : ALL_SHAPE_MB_FILTER;
}

export function getPointFilterExpression(hasJoins: boolean): unknown[] {
  return hasJoins ? VISIBLE_POINT_MB_FILTER : POINT_MB_FILTER;
}

export function getCentroidFilterExpression(hasJoins: boolean): unknown[] {
  return hasJoins ? VISIBLE_CENTROID_MB_FILTER : CENTROID_MB_FILTER;
}
