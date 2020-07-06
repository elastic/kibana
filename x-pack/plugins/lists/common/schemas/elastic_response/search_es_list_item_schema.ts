/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  created_at,
  created_by,
  ipOrUndefined,
  keywordOrUndefined,
  list_id,
  metaOrUndefined,
  tie_breaker_id,
  updated_at,
  updated_by,
} from '../common/schemas';

export const searchEsListItemSchema = t.exact(
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
);

export type SearchEsListItemSchema = t.TypeOf<typeof searchEsListItemSchema>;
