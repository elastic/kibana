/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { listItemArraySchema } from './list_item_schema';

export const searchListItemSchema = t.exact(
  t.type({
    items: listItemArraySchema,
    value: t.unknown,
  })
);

export type SearchListItemSchema = t.TypeOf<typeof searchListItemSchema>;

export const searchListItemArraySchema = t.array(searchListItemSchema);
export type SearchListItemArraySchema = t.TypeOf<typeof searchListItemArraySchema>;
