/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  name,
  description,
  metaOrUndefined,
  type,
  created_at,
  updated_at,
  tie_breaker_id,
  updated_by,
  created_by,
} from '../common/schemas';

export const searchEsListsSchema = t.exact(
  t.type({
    name,
    type,
    description,
    created_at,
    updated_at,
    tie_breaker_id,
    updated_by,
    created_by,
    meta: metaOrUndefined,
  })
);

export type SearchEsListsSchema = t.TypeOf<typeof searchEsListsSchema>;
