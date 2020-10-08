/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EntriesArray } from './entries';
import { getEntryMatchMock } from './entry_match.mock';
import { getEntryMatchAnyMock } from './entry_match_any.mock';
import { getEntryListMock } from './entry_list.mock';
import { getEntryExistsMock } from './entry_exists.mock';
import { getEntryNestedMock } from './entry_nested.mock';

export const getListAndNonListEntriesArrayMock = (): EntriesArray => [
  getEntryMatchMock(),
  getEntryMatchAnyMock(),
  getEntryListMock(),
  getEntryExistsMock(),
  getEntryNestedMock(),
];

export const getListEntriesArrayMock = (): EntriesArray => [getEntryListMock(), getEntryListMock()];

export const getEntriesArrayMock = (): EntriesArray => [
  getEntryMatchMock(),
  getEntryMatchAnyMock(),
  getEntryExistsMock(),
  getEntryNestedMock(),
];
