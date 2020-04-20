/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { metaOrUndefined, updated_at, updated_by, esDataTypeUnion } from '../common/schemas';

export const updateEsListsItemsSchema = t.intersection([
  t.exact(
    t.type({
      meta: metaOrUndefined,
      updated_at,
      updated_by,
    })
  ),
  esDataTypeUnion,
]);

export type UpdateEsListsItemsSchema = t.TypeOf<typeof updateEsListsItemsSchema>;
