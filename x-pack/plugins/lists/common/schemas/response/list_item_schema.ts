/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  _versionOrUndefined,
  created_at,
  created_by,
  deserializerOrUndefined,
  id,
  list_id,
  metaOrUndefined,
  serializerOrUndefined,
  tie_breaker_id,
  type,
  updated_at,
  updated_by,
  value,
} from '../common/schemas';

export const listItemSchema = t.exact(
  t.type({
    _version: _versionOrUndefined,
    created_at,
    created_by,
    deserializer: deserializerOrUndefined,
    id,
    list_id,
    meta: metaOrUndefined,
    serializer: serializerOrUndefined,
    tie_breaker_id,
    type,
    updated_at,
    updated_by,
    value,
  })
);

export type ListItemSchema = t.TypeOf<typeof listItemSchema>;

export const listItemArraySchema = t.array(listItemSchema);
export type ListItemArraySchema = t.TypeOf<typeof listItemArraySchema>;
