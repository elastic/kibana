/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { nameOrUndefined, descriptionOrUndefined, id, metaOrUndefined } from '../common/schemas';

export const patchListsSchema = t.exact(
  t.type({
    id,
    name: nameOrUndefined,
    description: descriptionOrUndefined,
    meta: metaOrUndefined,
  })
);

export type PatchListsSchema = t.TypeOf<typeof patchListsSchema>;
