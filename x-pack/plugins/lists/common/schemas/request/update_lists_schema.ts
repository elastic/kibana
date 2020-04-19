/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { name, description, id, metaOrUndefined } from '../common/schemas';

export const updateListsSchema = t.exact(
  t.type({
    id,
    name,
    description,
    meta: metaOrUndefined,
  })
);

export type UpdateListsSchema = t.TypeOf<typeof updateListsSchema>;
