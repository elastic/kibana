/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const listsItemsIndexExistSchema = t.type({
  lists_index: t.boolean,
  lists_items_index: t.boolean,
});

export type ListsItemsIndexExistSchema = t.TypeOf<typeof listsItemsIndexExistSchema>;
