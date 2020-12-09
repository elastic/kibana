/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NESTED, NESTED_FIELD } from '../../constants.mock';

import { EntryNested } from './entry_nested';
import { getEntryMatchExcludeMock, getEntryMatchMock } from './entry_match.mock';
import { getEntryMatchAnyExcludeMock, getEntryMatchAnyMock } from './entry_match_any.mock';
import { getEntryExistsMock } from './entry_exists.mock';

export const getEntryNestedMock = (): EntryNested => ({
  entries: [getEntryMatchMock(), getEntryMatchAnyMock()],
  field: NESTED_FIELD,
  type: NESTED,
});

export const getEntryNestedExcludeMock = (): EntryNested => ({
  ...getEntryNestedMock(),
  entries: [getEntryMatchExcludeMock(), getEntryMatchAnyExcludeMock()],
});

export const getEntryNestedMixedEntries = (): EntryNested => ({
  ...getEntryNestedMock(),
  entries: [getEntryMatchMock(), getEntryMatchAnyExcludeMock(), getEntryExistsMock()],
});
