/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { _version, description, id, meta, name, version } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const patchListSchema = t.intersection([
  t.exact(
    t.type({
      id,
    })
  ),
  t.exact(
    t.partial({
      _version, // is undefined if not set during decode
      description, // is undefined if not set during decode
      meta, // is undefined if not set during decode
      name, // is undefined if not set during decode
      version, // is undefined if not set during decode
    })
  ),
]);

export type PatchListSchema = t.OutputOf<typeof patchListSchema>;
export type PatchListSchemaDecoded = RequiredKeepUndefined<t.TypeOf<typeof patchListSchema>>;
