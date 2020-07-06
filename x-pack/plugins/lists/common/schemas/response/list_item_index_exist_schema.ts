/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const listItemIndexExistSchema = t.exact(
  t.type({
    list_index: t.boolean,
    list_item_index: t.boolean,
  })
);

export type ListItemIndexExistSchema = t.TypeOf<typeof listItemIndexExistSchema>;
