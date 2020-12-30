/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { _version, id, meta, value } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const patchListItemSchema = t.intersection([
  t.exact(
    t.type({
      id,
    })
  ),
  t.exact(t.partial({ _version, meta, value })),
]);

export type PatchListItemSchema = t.OutputOf<typeof patchListItemSchema>;
export type PatchListItemSchemaDecoded = RequiredKeepUndefined<
  t.TypeOf<typeof patchListItemSchema>
>;
