/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  _tags,
  commentOrUndefined,
  created_at,
  created_by,
  description,
  exceptionListItemType,
  id,
  item_id,
  list_id,
  metaOrUndefined,
  name,
  tags,
  tie_breaker_id,
  updated_at,
  updated_by,
} from '../common/schemas';
import { entriesArray } from '../types';

// TODO: Should we use a partial here to reflect that this can JSON serialize meta, comment as non existent?
export const exceptionListItemSchema = t.exact(
  t.type({
    _tags,
    comment: commentOrUndefined,
    created_at,
    created_by,
    description,
    entries: entriesArray,
    id,
    item_id,
    list_id,
    meta: metaOrUndefined,
    name,
    tags,
    tie_breaker_id,
    type: exceptionListItemType,
    updated_at,
    updated_by,
  })
);

export type ExceptionListItemSchema = t.TypeOf<typeof exceptionListItemSchema>;
