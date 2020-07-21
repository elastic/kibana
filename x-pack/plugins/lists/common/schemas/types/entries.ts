/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { NonEmptyString } from '../../siem_common_deps';
import { operator, type } from '../common/schemas';

import { nonEmptyOrNullableStringArray } from './non_empty_or_nullable_string_array';
import { nonEmptyNestedEntriesArray } from './non_empty_nested_entries_array';

export const entriesMatch = t.exact(
  t.type({
    field: NonEmptyString,
    operator,
    type: t.keyof({ match: null }),
    value: NonEmptyString,
  })
);
export type EntryMatch = t.TypeOf<typeof entriesMatch>;

export const entriesMatchAny = t.exact(
  t.type({
    field: NonEmptyString,
    operator,
    type: t.keyof({ match_any: null }),
    value: nonEmptyOrNullableStringArray,
  })
);
export type EntryMatchAny = t.TypeOf<typeof entriesMatchAny>;

export const entriesList = t.exact(
  t.type({
    field: NonEmptyString,
    list: t.exact(t.type({ id: NonEmptyString, type })),
    operator,
    type: t.keyof({ list: null }),
  })
);
export type EntryList = t.TypeOf<typeof entriesList>;

export const entriesExists = t.exact(
  t.type({
    field: NonEmptyString,
    operator,
    type: t.keyof({ exists: null }),
  })
);
export type EntryExists = t.TypeOf<typeof entriesExists>;

export const entriesNested = t.exact(
  t.type({
    entries: nonEmptyNestedEntriesArray,
    field: NonEmptyString,
    type: t.keyof({ nested: null }),
  })
);
export type EntryNested = t.TypeOf<typeof entriesNested>;

export const entry = t.union([entriesMatch, entriesMatchAny, entriesList, entriesExists]);
export type Entry = t.TypeOf<typeof entry>;

export const entriesArray = t.array(
  t.union([entriesMatch, entriesMatchAny, entriesList, entriesExists, entriesNested])
);
export type EntriesArray = t.TypeOf<typeof entriesArray>;

export const nestedEntriesArray = t.array(t.union([entriesMatch, entriesMatchAny, entriesExists]));
export type NestedEntriesArray = t.TypeOf<typeof nestedEntriesArray>;

export const entriesArrayOrUndefined = t.union([entriesArray, t.undefined]);
export type EntriesArrayOrUndefined = t.TypeOf<typeof entriesArrayOrUndefined>;
