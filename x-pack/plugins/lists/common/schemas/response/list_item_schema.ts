/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */

import {
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
