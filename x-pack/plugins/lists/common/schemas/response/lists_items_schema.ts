/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

/* eslint-disable @typescript-eslint/camelcase */

import {
  list_id,
  value,
  id,
  metaOrUndefined,
  type,
  created_at,
  updated_at,
  tie_breaker_id,
  updated_by,
  created_by,
} from '../common/schemas';

export const listsItemsSchema = t.exact(
  t.type({
    created_at,
    created_by,
    id,
    list_id,
    meta: metaOrUndefined,
    tie_breaker_id,
    type,
    updated_at,
    updated_by,
    value,
  })
);

export type ListsItemsSchema = t.TypeOf<typeof listsItemsSchema>;

export const listsItemsArraySchema = t.array(listsItemsSchema);
export type ListsItemsArraySchema = t.TypeOf<typeof listsItemsArraySchema>;
