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
  deserializerOrUndefined,
  esDataTypeUnion,
  list_id,
  metaOrUndefined,
  serializerOrUndefined,
  tie_breaker_id,
  updated_at,
  updated_by,
} from '../common/schemas';

export const indexEsListItemSchema = t.intersection([
  t.exact(
    t.type({
      created_at,
      created_by,
      deserializer: deserializerOrUndefined,
      list_id,
      meta: metaOrUndefined,
      serializer: serializerOrUndefined,
      tie_breaker_id,
      updated_at,
      updated_by,
    })
  ),
  esDataTypeUnion,
]);

export type IndexEsListItemSchema = t.TypeOf<typeof indexEsListItemSchema>;
