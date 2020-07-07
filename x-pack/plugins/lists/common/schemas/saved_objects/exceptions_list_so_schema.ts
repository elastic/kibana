/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { commentsArrayOrUndefined, entriesArrayOrUndefined } from '../types';
import {
  _tags,
  created_at,
  created_by,
  description,
  exceptionListItemType,
  exceptionListType,
  itemIdOrUndefined,
  list_id,
  list_type,
  metaOrUndefined,
  name,
  tags,
  tie_breaker_id,
  updated_by,
} from '../common/schemas';

export const exceptionListSoSchema = t.exact(
  t.type({
    _tags,
    comments: commentsArrayOrUndefined,
    created_at,
    created_by,
    description,
    entries: entriesArrayOrUndefined,
    item_id: itemIdOrUndefined,
    list_id,
    list_type,
    meta: metaOrUndefined,
    name,
    tags,
    tie_breaker_id,
    type: t.union([exceptionListType, exceptionListItemType]),
    updated_by,
  })
);

export type ExceptionListSoSchema = t.TypeOf<typeof exceptionListSoSchema>;
