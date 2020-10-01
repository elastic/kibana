/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { _version, description, id, meta, name, version } from '../common/schemas';
import { RequiredKeepUndefined } from '../../types';

export const updateListSchema = t.intersection([
  t.exact(
    t.type({
      description,
      id,
      name,
    })
  ),
  t.exact(
    t.partial({
      _version, // defaults to undefined if not set during decode
      meta, // defaults to undefined if not set during decode
      version, // defaults to undefined if not set during decode
    })
  ),
]);

export type UpdateListSchema = t.OutputOf<typeof updateListSchema>;
export type UpdateListSchemaDecoded = RequiredKeepUndefined<t.TypeOf<typeof updateListSchema>>;
