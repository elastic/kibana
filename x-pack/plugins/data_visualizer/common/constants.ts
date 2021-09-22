/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KBN_FIELD_TYPES } from '../../../../src/plugins/data/common';

export const UI_SETTING_MAX_FILE_SIZE = 'fileUpload:maxFileSize';

export const MB = Math.pow(2, 20);
export const MAX_FILE_SIZE = '100MB';
export const MAX_FILE_SIZE_BYTES = 104857600; // 100MB

export const ABSOLUTE_MAX_FILE_SIZE_BYTES = 1073741274; // 1GB
export const FILE_SIZE_DISPLAY_FORMAT = '0,0.[0] b';

// Value to use in the Elasticsearch index mapping meta data to identify the
// index as having been created by the File Data Visualizer.
export const INDEX_META_DATA_CREATED_BY = 'file-data-visualizer';

export const JOB_FIELD_TYPES = {
  BOOLEAN: 'boolean',
  DATE: 'date',
  GEO_POINT: 'geo_point',
  GEO_SHAPE: 'geo_shape',
  IP: 'ip',
  KEYWORD: 'keyword',
  NUMBER: 'number',
  TEXT: 'text',
  HISTOGRAM: 'histogram',
  UNKNOWN: 'unknown',
} as const;

export const JOB_FIELD_TYPES_OPTIONS = {
  [JOB_FIELD_TYPES.BOOLEAN]: { name: 'Boolean', icon: 'tokenBoolean' },
  [JOB_FIELD_TYPES.DATE]: { name: 'Date', icon: 'tokenDate' },
  [JOB_FIELD_TYPES.GEO_POINT]: { name: 'Geo point', icon: 'tokenGeo' },
  [JOB_FIELD_TYPES.GEO_SHAPE]: { name: 'Geo shape', icon: 'tokenGeo' },
  [JOB_FIELD_TYPES.IP]: { name: 'IP address', icon: 'tokenIP' },
  [JOB_FIELD_TYPES.KEYWORD]: { name: 'Keyword', icon: 'tokenKeyword' },
  [JOB_FIELD_TYPES.NUMBER]: { name: 'Number', icon: 'tokenNumber' },
  [JOB_FIELD_TYPES.TEXT]: { name: 'Text', icon: 'tokenString' },
  [JOB_FIELD_TYPES.HISTOGRAM]: { name: 'Histogram', icon: 'tokenNumber' },
  [JOB_FIELD_TYPES.UNKNOWN]: { name: 'Unknown' },
};

export const OMIT_FIELDS: string[] = ['_source', '_type', '_index', '_id', '_version', '_score'];

export const NON_AGGREGATABLE_FIELD_TYPES = new Set<string>([
  KBN_FIELD_TYPES.GEO_SHAPE,
  KBN_FIELD_TYPES.HISTOGRAM,
]);
