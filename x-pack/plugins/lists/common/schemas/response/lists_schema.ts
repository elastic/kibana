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
  id,
  type,
  created_at,
  updated_at,
  tie_breaker_id,
  updated_by,
  created_by,
  metaOrUndefined,
} from '../common/schemas';

export const listsSchema = t.exact(
  t.type({
    created_at,
    created_by,
    description,
    id,
    meta: metaOrUndefined,
    name,
    tie_breaker_id,
    type,
    updated_at,
    updated_by,
  })
);

export type ListsSchema = t.TypeOf<typeof listsSchema>;
