/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, list_id, meta, value } from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';

export const createListItemSchema = t.intersection([
  t.exact(
    t.type({
      list_id,
      value,
    })
  ),
  t.exact(t.partial({ id, meta })),
]);

export type CreateListItemSchemaPartial = Identity<t.TypeOf<typeof createListItemSchema>>;
export type CreateListItemSchema = RequiredKeepUndefined<t.TypeOf<typeof createListItemSchema>>;
