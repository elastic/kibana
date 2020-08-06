/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import {
  _versionOrUndefined,
  created_at,
  created_by,
  description,
  deserializerOrUndefined,
  id,
  immutable,
  metaOrUndefined,
  name,
  serializerOrUndefined,
  tie_breaker_id,
  type,
  updated_at,
  updated_by,
  version,
} from '../common/schemas';

export const listSchema = t.exact(
  t.type({
    _version: _versionOrUndefined,
    created_at,
    created_by,
    description,
    deserializer: deserializerOrUndefined,
    id,
    immutable,
    meta: metaOrUndefined,
    name,
    serializer: serializerOrUndefined,
    tie_breaker_id,
    type,
    updated_at,
    updated_by,
    version,
  })
);

export type ListSchema = t.TypeOf<typeof listSchema>;

export const listArraySchema = t.array(listSchema);
export type ListArraySchema = t.TypeOf<typeof listArraySchema>;
