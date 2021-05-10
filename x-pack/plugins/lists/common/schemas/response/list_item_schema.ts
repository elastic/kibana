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
  id,
  metaOrUndefined,
  type,
  updated_at,
  updated_by,
} from '@kbn/securitysolution-io-ts-utils';

import {
  _versionOrUndefined,
  deserializerOrUndefined,
  list_id,
  serializerOrUndefined,
  tie_breaker_id,
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
