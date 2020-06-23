/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { esDataTypeUnion, metaOrUndefined, updated_at, updated_by } from '../common/schemas';

export const updateEsListItemSchema = t.intersection([
  t.exact(
    t.type({
      meta: metaOrUndefined,
      updated_at,
      updated_by,
    })
  ),
  esDataTypeUnion,
]);

export type UpdateEsListItemSchema = t.TypeOf<typeof updateEsListItemSchema>;
