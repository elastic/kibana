/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { description, id, meta, name, type } from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';

export const createListSchema = t.intersection([
  t.exact(
    t.type({
      description,
      name,
      type,
    })
  ),
  t.exact(t.partial({ id, meta })),
]);

export type CreateListSchemaPartial = Identity<t.TypeOf<typeof createListSchema>>;
export type CreateListSchema = RequiredKeepUndefined<t.TypeOf<typeof createListSchema>>;
