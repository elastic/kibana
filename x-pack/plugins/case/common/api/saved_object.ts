/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as rt from 'io-ts';

export const SavedObjectFindOptionsRt = rt.partial({
  defaultSearchOperator: rt.union([rt.literal('AND'), rt.literal('OR')]),
  fields: rt.array(rt.string),
  filter: rt.string,
  page: rt.number,
  perPage: rt.number,
  search: rt.string,
  searchFields: rt.array(rt.string),
  sortField: rt.string,
  sortOrder: rt.union([rt.literal('desc'), rt.literal('asc')]),
});

export type SavedObjectFindOptions = rt.TypeOf<typeof SavedObjectFindOptionsRt>;
