/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';

export const esFieldTypeMap = {
  keyword: t.string,
  text: t.string,
  date: t.string,
  boolean: t.boolean,
  byte: t.number,
  long: t.number,
  integer: t.number,
  short: t.number,
  double: t.number,
  float: t.number,
  scaled_float: t.number,
  unsigned_long: t.number,
  nested: t.boolean,
  flattened: t.record(t.string, t.array(t.string)),
};
