/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import {
  created_at,
  created_by,
  description,
  deserializerOrUndefined,
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

export const searchEsListSchema = t.exact(
  t.type({
    created_at,
    created_by,
    description,
    deserializer: deserializerOrUndefined,
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

export type SearchEsListSchema = t.TypeOf<typeof searchEsListSchema>;
