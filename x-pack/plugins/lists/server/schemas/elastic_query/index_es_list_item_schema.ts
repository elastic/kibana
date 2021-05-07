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
  metaOrUndefined,
  updated_at,
  updated_by,
} from '@kbn/securitysolution-io-ts-utils';

import { esDataTypeUnion } from '../common/schemas';
import {
  deserializerOrUndefined,
  list_id,
  serializerOrUndefined,
  tie_breaker_id,
} from '../../../common/schemas';

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

export type IndexEsListItemSchema = t.OutputOf<typeof indexEsListItemSchema>;
