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
  exceptionListItemType,
  id,
  item_id,
  list_id,
  metaOrUndefined,
  name,
  namespace_type,
  tags,
  tie_breaker_id,
  updated_at,
  updated_by,
} from '../common/schemas';
import { commentsArray, entriesArray } from '../types';

// TODO: Should we use a partial here to reflect that this can JSON serialize meta, comment as non existent?
export const exceptionListItemSchema = t.intersection([
  t.exact(
    t.type({
      created_at,
      created_by,
      entries: entriesArray,
      id,
      item_id,
      list_id,
      meta: metaOrUndefined,
      name,
      namespace_type,
      tie_breaker_id,
      type: exceptionListItemType,
      updated_at,
      updated_by,
    })
  ),
  t.exact(
    t.partial({
      _tags,
      comments: commentsArray,
      description,
      tags,
    })
  ),
]);

export type ExceptionListItemSchema = t.TypeOf<typeof exceptionListItemSchema>;
