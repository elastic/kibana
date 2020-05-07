/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { idOrUndefined, list_id, metaOrUndefined, value } from '../common/schemas';

export const createListItemSchema = t.exact(
  t.type({
    id: idOrUndefined,
    list_id,
    meta: metaOrUndefined,
    value,
  })
);

export type CreateListItemSchema = t.TypeOf<typeof createListItemSchema>;
