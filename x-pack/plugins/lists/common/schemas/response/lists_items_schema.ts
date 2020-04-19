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
  meta,
  type,
  created_at,
  updated_at,
  tie_breaker_id,
  updated_by,
  created_by,
} from '../common/schemas';

export const listsItemsSchema = t.intersection([
  t.type({
    id,
    list_id,
    created_at,
    updated_at,
    updated_by,
    created_by,
    type,
    value,
    tie_breaker_id,
  }),
  t.exact(t.partial({ meta })),
]);
export type ListsItemsSchema = t.TypeOf<typeof listsItemsSchema>;

export const listsItemsArraySchema = t.array(listsItemsSchema);
export type ListsItemsArraySchema = t.TypeOf<typeof listsItemsArraySchema>;
