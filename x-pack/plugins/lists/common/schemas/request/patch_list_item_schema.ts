/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, meta, value } from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';

export const patchListItemSchema = t.intersection([
  t.exact(
    t.type({
      id,
    })
  ),
  t.exact(t.partial({ meta, value })),
]);

export type PatchListItemSchemaPartial = Identity<t.TypeOf<typeof patchListItemSchema>>;
export type PatchListItemSchema = RequiredKeepUndefined<t.TypeOf<typeof patchListItemSchema>>;
