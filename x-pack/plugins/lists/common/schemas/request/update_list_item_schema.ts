/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, meta, value } from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';

export const updateListItemSchema = t.intersection([
  t.exact(
    t.type({
      id,
      value,
    })
  ),
  t.exact(
    t.partial({
      meta, // defaults to undefined if not set during decode
    })
  ),
]);

export type UpdateListItemSchemaPartial = Identity<t.TypeOf<typeof updateListItemSchema>>;
export type UpdateListItemSchema = RequiredKeepUndefined<t.TypeOf<typeof updateListItemSchema>>;
