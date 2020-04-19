/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { idOrUndefined, list_id, metaOrUndefined, value } from '../common/schemas';

export const createListsItemsSchema = t.exact(
  t.type({
    list_id,
    value,
    id: idOrUndefined,
    meta: metaOrUndefined,
  })
);

export type CreateListsItemsSchema = t.TypeOf<typeof createListsItemsSchema>;
