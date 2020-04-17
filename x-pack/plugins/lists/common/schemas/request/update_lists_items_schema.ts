/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { id, meta, value } from '../common/schemas';

export const updateListsItemsSchema = t.intersection([
  t.exact(
    t.type({
      id,
      value,
    })
  ),
  t.exact(t.partial({ meta })), // TODO: Move this into the required section
]);

export type UpdateListsItemsSchema = t.TypeOf<typeof updateListsItemsSchema>;
