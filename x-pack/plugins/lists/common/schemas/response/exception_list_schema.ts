/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  _tags,
  created_at,
  created_by,
  description,
  exceptionListType,
  id,
  list_id,
  metaOrUndefined,
  name,
  namespace_type,
  tags,
  tie_breaker_id,
  updated_at,
  updated_by,
} from '../common/schemas';

export const exceptionListSchema = t.exact(
  t.type({
    _tags,
    created_at,
    created_by,
    description,
    id,
    list_id,
    meta: metaOrUndefined,
    name,
    namespace_type,
    tags,
    tie_breaker_id,
    type: exceptionListType,
    updated_at,
    updated_by,
  })
);

export type ExceptionListSchema = t.TypeOf<typeof exceptionListSchema>;
