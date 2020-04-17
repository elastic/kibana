/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { name, description, id, meta, type } from '../common/schemas';

export const createListsSchema = t.intersection([
  t.exact(
    t.type({
      name,
      description,
      type,
    })
  ),
  t.exact(t.partial({ id, meta })),
]);

export type CreateListsSchema = t.TypeOf<typeof createListsSchema>;
