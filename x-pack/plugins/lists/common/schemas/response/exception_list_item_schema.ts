/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import {
  _versionOrUndefined,
  created_at,
  created_by,
  description,
  exceptionListItemType,
  id,
  item_id,
  list_id,
  metaOrUndefined,
  name,
  namespace_type,
  osTypeArray,
  tags,
  tie_breaker_id,
  updated_at,
  updated_by,
} from '../common/schemas';
import { commentsArray, entriesArray } from '../types';

export const exceptionListItemSchema = t.exact(
  t.type({
    _version: _versionOrUndefined,
    comments: commentsArray,
    created_at,
    created_by,
    description,
    entries: entriesArray,
    id,
    item_id,
    list_id,
    meta: metaOrUndefined,
    name,
    namespace_type,
    os_types: osTypeArray,
    tags,
    tie_breaker_id,
    type: exceptionListItemType,
    updated_at,
    updated_by,
  })
);

export type ExceptionListItemSchema = t.TypeOf<typeof exceptionListItemSchema>;
