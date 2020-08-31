/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export enum ML_JOB_FIELD_TYPES {
  BOOLEAN = 'boolean',
  DATE = 'date',
  GEO_POINT = 'geo_point',
  IP = 'ip',
  KEYWORD = 'keyword',
  NUMBER = 'number',
  TEXT = 'text',
  UNKNOWN = 'unknown',
}

export const MLCATEGORY = 'mlcategory';
export const DOC_COUNT = 'doc_count';

// List of system fields we don't want to display.
export const OMIT_FIELDS: string[] = ['_source', '_type', '_index', '_id', '_version', '_score'];
