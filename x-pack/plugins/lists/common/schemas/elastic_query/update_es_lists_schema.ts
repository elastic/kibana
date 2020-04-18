/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { name, description, meta, updated_at, updated_by } from '../common/schemas';

const NullableName = t.union([name, t.null]);
const NullableDescription = t.union([description, t.null]);

export const updateEsListsSchema = t.intersection([
  t.exact(
    t.type({
      updated_at,
      updated_by,
    })
  ),
  t.exact(t.partial({ meta, name: NullableName, description: NullableDescription })),
]);

export type UpdateEsListsSchema = t.TypeOf<typeof updateEsListsSchema>;
