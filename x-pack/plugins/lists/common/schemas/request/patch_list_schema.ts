/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { descriptionOrUndefined, id, metaOrUndefined, nameOrUndefined } from '../common/schemas';

export const patchListSchema = t.exact(
  t.type({
    description: descriptionOrUndefined,
    id,
    meta: metaOrUndefined,
    name: nameOrUndefined,
  })
);

export type PatchListSchema = t.TypeOf<typeof patchListSchema>;
