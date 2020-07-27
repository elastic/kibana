/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/camelcase */

import * as t from 'io-ts';

import { entriesMatchAny } from './entry_match_any';
import { entriesMatch } from './entry_match';
import { entriesExists } from './entry_exists';
import { entriesList } from './entry_list';
import { entriesNested } from './entry_nested';

export const entry = t.union([entriesMatch, entriesMatchAny, entriesList, entriesExists]);
export type Entry = t.TypeOf<typeof entry>;

export const nonListEntriesArray = t.array(
  t.union([entriesMatch, entriesMatchAny, entriesExists, entriesNested])
);
export const listEntriesArray = t.array(entriesList);

export const entriesArray = t.union([nonListEntriesArray, listEntriesArray]);

export type EntriesArray = t.TypeOf<typeof entriesArray>;

export const entriesArrayOrUndefined = t.union([entriesArray, t.undefined]);
export type EntriesArrayOrUndefined = t.TypeOf<typeof entriesArrayOrUndefined>;
