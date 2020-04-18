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
  meta,
  updated_at,
  updated_by,
  type,
  tie_breaker_id,
  created_at,
  created_by,
} from '../common/schemas';

export const indexEsListsSchema = t.intersection([
  t.exact(
    t.type({
      name,
      description,
      type,
      tie_breaker_id,
      updated_at,
      created_at,
      created_by,
      updated_by,
    })
  ),
  t.exact(t.partial({ meta })), // TODO: Make meta required
]);

export type IndexEsListsSchema = t.TypeOf<typeof indexEsListsSchema>;
