/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ENTRY_VALUE,
  EXISTS,
  FIELD,
  LIST,
  MATCH,
  MATCH_ANY,
  NESTED,
  OPERATOR,
} from '../../constants.mock';

import {
  EntriesArray,
  EntryExists,
  EntryList,
  EntryMatch,
  EntryMatchAny,
  EntryNested,
} from './entries';

export const getEntryMatchMock = (): EntryMatch => ({
  field: FIELD,
  operator: OPERATOR,
  type: MATCH,
  value: ENTRY_VALUE,
});

export const getEntryMatchAnyMock = (): EntryMatchAny => ({
  field: FIELD,
  operator: OPERATOR,
  type: MATCH_ANY,
  value: [ENTRY_VALUE],
});

export const getEntryListMock = (): EntryList => ({
  field: FIELD,
  operator: OPERATOR,
  type: LIST,
  value: [ENTRY_VALUE],
});

export const getEntryExistsMock = (): EntryExists => ({
  field: FIELD,
  operator: OPERATOR,
  type: EXISTS,
});

export const getEntryNestedMock = (): EntryNested => ({
  entries: [getEntryMatchMock(), getEntryExistsMock()],
  field: FIELD,
  type: NESTED,
});

export const getEntriesArrayMock = (): EntriesArray => [
  getEntryMatchMock(),
  getEntryMatchAnyMock(),
  getEntryListMock(),
  getEntryExistsMock(),
  getEntryNestedMock(),
];
