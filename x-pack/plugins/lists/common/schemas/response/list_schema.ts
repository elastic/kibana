/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  created_at,
  created_by,
  description,
  id,
  metaOrUndefined,
  name,
  type,
  updated_at,
  updated_by,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  _versionOrUndefined,
  deserializerOrUndefined,
  immutable,
  serializerOrUndefined,
  tie_breaker_id,
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
