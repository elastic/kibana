/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, metaOrUndefined, value } from '../common/schemas';

export const updateListsItemsSchema = t.exact(
  t.type({
    id,
    value,
    meta: metaOrUndefined,
  })
);

export type UpdateListsItemsSchema = t.TypeOf<typeof updateListsItemsSchema>;
