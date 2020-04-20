/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  updated_at,
  updated_by,
  esDataTypeUnion,
  list_id,
  created_at,
  created_by,
  tie_breaker_id,
  ipOrUndefined,
  keywordOrUndefined,
  metaOrUndefined,
} from '../common/schemas';

export const searchEsListsItemsSchema = t.intersection([
  t.exact(
    t.type({
      created_at,
      created_by,
      ip: ipOrUndefined,
      keyword: keywordOrUndefined,
      list_id,
      meta: metaOrUndefined,
      tie_breaker_id,
      updated_at,
      updated_by,
    })
  ),
  esDataTypeUnion,
]);

export type SearchEsListsItemsSchema = t.TypeOf<typeof searchEsListsItemsSchema>;
