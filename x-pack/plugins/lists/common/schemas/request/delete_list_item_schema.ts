/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, list_id, valueOrUndefined } from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';

export const deleteListItemSchema = t.intersection([
  t.exact(
    t.type({
      value: valueOrUndefined,
    })
  ),
  t.exact(t.partial({ id, list_id })),
]);

export type DeleteListItemSchemaPartial = Identity<t.TypeOf<typeof deleteListItemSchema>>;
export type DeleteListItemSchema = RequiredKeepUndefined<t.TypeOf<typeof deleteListItemSchema>>;
