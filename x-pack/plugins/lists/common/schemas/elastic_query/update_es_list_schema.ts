/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import {
  descriptionOrUndefined,
  metaOrUndefined,
  nameOrUndefined,
  updated_at,
  updated_by,
} from '../common/schemas';

export const updateEsListSchema = t.exact(
  t.type({
    description: descriptionOrUndefined,
    meta: metaOrUndefined,
    name: nameOrUndefined,
    updated_at,
    updated_by,
  })
);

export type UpdateEsListSchema = t.TypeOf<typeof updateEsListSchema>;
