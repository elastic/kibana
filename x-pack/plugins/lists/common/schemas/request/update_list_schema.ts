/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { description, id, metaOrUndefined, name } from '../common/schemas';
import { Identity, RequiredKeepUndefined } from '../../types';

export const updateListSchema = t.intersection([
  t.exact(
    t.type({
      description,
      id,
      name,
    })
  ),
  t.exact(t.partial({ meta: metaOrUndefined })),
]);

export type UpdateListSchemaPartial = Identity<t.TypeOf<typeof updateListSchema>>;
export type UpdateListSchema = RequiredKeepUndefined<t.TypeOf<typeof updateListSchema>>;
