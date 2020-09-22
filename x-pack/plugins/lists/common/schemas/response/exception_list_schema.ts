/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import {
  _tags,
  _versionOrUndefined,
  created_at,
  created_by,
  description,
  exceptionListType,
  id,
  immutable,
  list_id,
  metaOrUndefined,
  name,
  namespace_type,
  osTypeArrayOrUndefined,
  tags,
  tie_breaker_id,
  updated_at,
  updated_by,
  version,
} from '../common/schemas';

export const exceptionListSchema = t.exact(
  t.type({
    _tags,
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
    os_types: osTypeArrayOrUndefined,
    tags,
    tie_breaker_id,
    type: exceptionListType,
    updated_at,
    updated_by,
    version,
  })
);

export type ExceptionListSchema = t.TypeOf<typeof exceptionListSchema>;
