/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { NonEmptyString } from '../../shared_imports';

import { nonEmptyNestedEntriesArray } from './non_empty_nested_entries_array';

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export const entriesNested = t.exact(
  t.type({
    entries: nonEmptyNestedEntriesArray,
    field: NonEmptyString,
    type: t.keyof({ nested: null }),
  })
);

/**
 * @deprecated Use packages/kbn-securitysolution-io-ts-utils
 */
export type EntryNested = t.TypeOf<typeof entriesNested>;
