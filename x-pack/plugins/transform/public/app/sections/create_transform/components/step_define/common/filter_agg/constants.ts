/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_FIELD_TYPES } from '@kbn/data-plugin/common';
import { FilterAggType } from './types';

export const FILTERS = {
  CUSTOM: 'custom',
  PHRASES: 'phrases',
  PHRASE: 'phrase',
  EXISTS: 'exists',
  MATCH_ALL: 'match_all',
  MISSING: 'missing',
  QUERY_STRING: 'query_string',
  RANGE: 'range',
  GEO_BOUNDING_BOX: 'geo_bounding_box',
  GEO_POLYGON: 'geo_polygon',
  SPATIAL_FILTER: 'spatial_filter',
  TERM: 'term',
  TERMS: 'terms',
  BOOL: 'bool',
} as const;

export const filterAggsFieldSupport: { [key: string]: FilterAggType[] } = {
  [KBN_FIELD_TYPES.ATTACHMENT]: [],
  [KBN_FIELD_TYPES.BOOLEAN]: [],
  [KBN_FIELD_TYPES.DATE]: [FILTERS.RANGE],
  [KBN_FIELD_TYPES.GEO_POINT]: [FILTERS.GEO_BOUNDING_BOX, FILTERS.GEO_POLYGON],
  [KBN_FIELD_TYPES.GEO_SHAPE]: [FILTERS.GEO_BOUNDING_BOX, FILTERS.GEO_POLYGON],
  [KBN_FIELD_TYPES.IP]: [FILTERS.RANGE],
  [KBN_FIELD_TYPES.MURMUR3]: [],
  [KBN_FIELD_TYPES.NUMBER]: [FILTERS.RANGE],
  [KBN_FIELD_TYPES.STRING]: [FILTERS.TERM],
  [KBN_FIELD_TYPES._SOURCE]: [],
  [KBN_FIELD_TYPES.UNKNOWN]: [],
  [KBN_FIELD_TYPES.CONFLICT]: [],
};

export const commonFilterAggs = [FILTERS.BOOL, FILTERS.EXISTS];
