/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { entriesMatchAny } from './entry_match_any';
import { entriesMatch } from './entry_match';
import { entriesExists } from './entry_exists';
import { entriesList } from './entry_list';
import { entriesNested } from './entry_nested';
import { entriesMatchWildcard } from './entry_match_wildcard';

// NOTE: Type nested is not included here to denote it's non-recursive nature.
// So a nested entry is really just a collection of `Entry` types.
export const entry = t.union([
  entriesMatch,
  entriesMatchAny,
  entriesList,
  entriesExists,
  entriesMatchWildcard,
]);
export type Entry = t.TypeOf<typeof entry>;

export const entriesArray = t.array(
  t.union([
    entriesMatch,
    entriesMatchAny,
    entriesList,
    entriesExists,
    entriesNested,
    entriesMatchWildcard,
  ])
);
export type EntriesArray = t.TypeOf<typeof entriesArray>;

export const entriesArrayOrUndefined = t.union([entriesArray, t.undefined]);
export type EntriesArrayOrUndefined = t.TypeOf<typeof entriesArrayOrUndefined>;
