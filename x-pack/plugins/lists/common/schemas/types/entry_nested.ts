/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

import { NonEmptyString } from '../../shared_imports';

import { nonEmptyNestedEntriesArray } from './non_empty_nested_entries_array';

export const entriesNested = t.exact(
  t.type({
    entries: nonEmptyNestedEntriesArray,
    field: NonEmptyString,
    type: t.keyof({ nested: null }),
  })
);
export type EntryNested = t.TypeOf<typeof entriesNested>;
