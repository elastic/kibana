/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as t from 'io-ts';

export const entries = t.exact(
  t.type({
    field: t.string,
    match: t.union([t.string, t.undefined]),
    match_any: t.union([t.array(t.string), t.undefined]),
    operator: t.string, // TODO: Use a key of with all possible values
  })
);

export const entriesArray = t.array(entries);
export type EntriesArray = t.TypeOf<typeof entriesArray>;
export type Entries = t.TypeOf<typeof entries>;
export const entriesArrayOrUndefined = t.union([entriesArray, t.undefined]);
export type EntriesArrayOrUndefined = t.TypeOf<typeof entriesArrayOrUndefined>;
