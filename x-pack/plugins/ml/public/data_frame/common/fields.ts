/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// TODO consolidate with anomaly detection wizard code
export enum FIELD_TYPE {
  ATTACHMENT = 'attachment',
  BOOLEAN = 'boolean',
  DATE = 'date',
  GEO_POINT = 'geo_point',
  GEO_SHAPE = 'geo_shape',
  IP = 'ip',
  MURMUR3 = 'murmur3',
  NUMBER = 'number',
  STRING = 'string',
  _SOURCE = '_source',
  UNKNOWN = 'unknown',
  CONFLICT = 'conflict',
}

export type FieldType =
  | FIELD_TYPE.ATTACHMENT
  | FIELD_TYPE.BOOLEAN
  | FIELD_TYPE.DATE
  | FIELD_TYPE.GEO_POINT
  | FIELD_TYPE.GEO_SHAPE
  | FIELD_TYPE.IP
  | FIELD_TYPE.MURMUR3
  | FIELD_TYPE.NUMBER
  | FIELD_TYPE.STRING
  | FIELD_TYPE._SOURCE
  | FIELD_TYPE.UNKNOWN
  | FIELD_TYPE.CONFLICT;

export type FieldName = string;
