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
  deserializerOrUndefined,
  immutable,
  metaOrUndefined,
  name,
  serializerOrUndefined,
  tie_breaker_id,
  timestamp,
  type,
  updated_at,
  updated_by,
} from '@kbn/securitysolution-io-ts-list-types';
import { version } from '@kbn/securitysolution-io-ts-types';

export const indexEsListSchema = t.exact(
  t.type({
    '@timestamp': timestamp,
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
