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
  esDataTypeUnion,
  list_id,
  metaOrUndefined,
  tie_breaker_id,
  updated_at,
  updated_by,
} from '../common/schemas';

export const indexEsListItemSchema = t.intersection([
  t.exact(
    t.type({
      created_at,
      created_by,
      list_id,
      meta: metaOrUndefined,
      tie_breaker_id,
      updated_at,
      updated_by,
    })
  ),
  esDataTypeUnion,
]);

export type IndexEsListItemSchema = t.TypeOf<typeof indexEsListItemSchema>;
