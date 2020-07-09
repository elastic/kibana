/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  created_at,
  created_by,
  description,
  deserializerOrUndefined,
  id,
  metaOrUndefined,
  name,
  serializerOrUndefined,
  tie_breaker_id,
  type,
  updated_at,
  updated_by,
} from '../common/schemas';

export const listSchema = t.exact(
  t.type({
    created_at,
    created_by,
    description,
    deserializer: deserializerOrUndefined,
    id,
    meta: metaOrUndefined,
    name,
    serializer: serializerOrUndefined,
    tie_breaker_id,
    type,
    updated_at,
    updated_by,
  })
);

export type ListSchema = t.TypeOf<typeof listSchema>;

export const listArraySchema = t.array(listSchema);
export type ListArraySchema = t.TypeOf<typeof listArraySchema>;
