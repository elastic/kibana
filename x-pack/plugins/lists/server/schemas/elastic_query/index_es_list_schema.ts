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
  metaOrUndefined,
  name,
  type,
  updated_at,
  updated_by,
} from '@kbn/securitysolution-io-ts-utils';

import {
  deserializerOrUndefined,
  immutable,
  serializerOrUndefined,
  tie_breaker_id,
  version,
} from '../../../common/schemas';

export const indexEsListSchema = t.exact(
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

export type IndexEsListSchema = t.OutputOf<typeof indexEsListSchema>;
