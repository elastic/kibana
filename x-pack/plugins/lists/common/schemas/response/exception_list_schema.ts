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
  exceptionListType,
  id,
  metaOrUndefined,
  name,
  osTypeArray,
  tags,
  updated_at,
  updated_by,
} from '@kbn/securitysolution-io-ts-list-types';

import {
  _versionOrUndefined,
  immutable,
  list_id,
  namespace_type,
  tie_breaker_id,
  version,
} from '../common/schemas';

export const exceptionListSchema = t.exact(
  t.type({
    _version: _versionOrUndefined,
    created_at,
    created_by,
    description,
    id,
    immutable,
    list_id,
    meta: metaOrUndefined,
    name,
    namespace_type,
    os_types: osTypeArray,
    tags,
    tie_breaker_id,
    type: exceptionListType,
    updated_at,
    updated_by,
    version,
  })
);

export type ExceptionListSchema = t.TypeOf<typeof exceptionListSchema>;
