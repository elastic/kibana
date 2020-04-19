/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
      list_id,
      created_at,
      updated_at,
      updated_by,
      created_by,
      tie_breaker_id,
      meta: metaOrUndefined,
      ip: ipOrUndefined,
      keyword: keywordOrUndefined,
    })
  ),
  esDataTypeUnion,
]);

export type SearchEsListsItemsSchema = t.TypeOf<typeof searchEsListsItemsSchema>;
