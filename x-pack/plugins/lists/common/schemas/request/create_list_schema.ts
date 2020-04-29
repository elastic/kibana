/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { description, idOrUndefined, metaOrUndefined, name, type } from '../common/schemas';

export const createListSchema = t.exact(
  t.type({
    description,
    id: idOrUndefined,
    meta: metaOrUndefined,
    name,
    type,
  })
);

export type CreateListSchema = t.TypeOf<typeof createListSchema>;
