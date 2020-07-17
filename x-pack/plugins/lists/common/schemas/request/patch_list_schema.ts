/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { description, id, meta, name } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const patchListSchema = t.intersection([
  t.exact(
    t.type({
      id,
    })
  ),
  t.exact(t.partial({ description, meta, name })),
]);

export type PatchListSchema = t.OutputOf<typeof patchListSchema>;
export type PatchListSchemaDecoded = RequiredKeepUndefined<t.TypeOf<typeof patchListSchema>>;
