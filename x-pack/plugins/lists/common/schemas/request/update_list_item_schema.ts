/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, metaOrUndefined, value } from '../common/schemas';

export const updateListItemSchema = t.exact(
  t.type({
    id,
    meta: metaOrUndefined,
    value,
  })
);

export type UpdateListItemSchema = t.TypeOf<typeof updateListItemSchema>;
