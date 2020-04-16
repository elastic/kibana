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
  meta,
  type,
  created_at,
  updated_at,
  tie_breaker_id,
  updated_by,
  created_by,
} from '../common/schemas';

export const listsSchema = t.intersection([
  t.exact(
    t.type({
      id,
      name,
      type,
      description,
      created_at,
      updated_at,
      tie_breaker_id,
      updated_by,
      created_by,
    })
  ),
  t.exact(t.partial({ meta })),
]);

export type ListsSchema = t.TypeOf<typeof listsSchema>;
