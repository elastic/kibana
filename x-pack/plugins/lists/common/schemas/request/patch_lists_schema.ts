/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { name, description, id, meta } from '../common/schemas';

export const patchListsSchema = t.intersection([
  t.exact(
    t.type({
      id,
    })
  ),
  t.exact(t.partial({ meta, name, description })),
]);

export type PatchListsSchema = t.TypeOf<typeof patchListsSchema>;
