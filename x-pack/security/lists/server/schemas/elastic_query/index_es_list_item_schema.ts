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
  deserializerOrUndefined,
  list_id,
  metaOrUndefined,
  serializerOrUndefined,
  tie_breaker_id,
  timestamp,
  updated_at,
  updated_by,
} from '@kbn/securitysolution-io-ts-list-types';

import { esDataTypeUnion } from '../common/schemas';

export const indexEsListItemSchema = t.intersection([
  t.exact(
    t.type({
      '@timestamp': timestamp,
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

export type IndexEsListItemSchema = t.OutputOf<typeof indexEsListItemSchema>;
