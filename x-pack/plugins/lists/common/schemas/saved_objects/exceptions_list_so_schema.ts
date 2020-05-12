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
  list_id,
  metaOrUndefined,
  name,
  tags,
  tie_breaker_id,
  updated_by,
} from '../common/schemas';

export const exceptionListSoSchema = t.exact(
  t.type({
    _tags,
    created_at,
    created_by,
    description,
    list_id,
    meta: metaOrUndefined,
    name,
    tags,
    tie_breaker_id,
    type: exceptionListType,
    updated_by,
  })
);

export type ExceptionListSoSchema = t.TypeOf<typeof exceptionListSoSchema>;
