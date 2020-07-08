/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  binaryOrUndefined,
  booleanOrUndefined,
  byteOrUndefined,
  created_at,
  created_by,
  dateNanosOrUndefined,
  dateOrUndefined,
  dateRangeOrUndefined,
  deserializerOrUndefined,
  doubleOrUndefined,
  doubleRangeOrUndefined,
  floatOrUndefined,
  floatRangeOrUndefined,
  geoPointOrUndefined,
  geoShapeOrUndefined,
  halfFloatOrUndefined,
  integerOrUndefined,
  integerRangeOrUndefined,
  ipOrUndefined,
  ipRangeOrUndefined,
  keywordOrUndefined,
  list_id,
  longOrUndefined,
  longRangeOrUndefined,
  metaOrUndefined,
  serializerOrUndefined,
  shapeOrUndefined,
  shortOrUndefined,
  textOrUndefined,
  tie_breaker_id,
  updated_at,
  updated_by,
} from '../common/schemas';

export const searchEsListItemSchema = t.exact(
  t.type({
    binary: binaryOrUndefined,
    boolean: booleanOrUndefined,
    byte: byteOrUndefined,
    created_at,
    created_by,
    date: dateOrUndefined,
    date_nanos: dateNanosOrUndefined,
    date_range: dateRangeOrUndefined,
    deserializer: deserializerOrUndefined,
    double: doubleOrUndefined,
    double_range: doubleRangeOrUndefined,
    float: floatOrUndefined,
    float_range: floatRangeOrUndefined,
    geo_point: geoPointOrUndefined,
    geo_shape: geoShapeOrUndefined,
    half_float: halfFloatOrUndefined,
    integer: integerOrUndefined,
    integer_range: integerRangeOrUndefined,
    ip: ipOrUndefined,
    ip_range: ipRangeOrUndefined,
    keyword: keywordOrUndefined,
    list_id,
    long: longOrUndefined,
    long_range: longRangeOrUndefined,
    meta: metaOrUndefined,
    serializer: serializerOrUndefined,
    shape: shapeOrUndefined,
    short: shortOrUndefined,
    text: textOrUndefined,
    tie_breaker_id,
    updated_at,
    updated_by,
  })
);

export type SearchEsListItemSchema = t.TypeOf<typeof searchEsListItemSchema>;
