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

export const getEntryMatch = (): EntryMatch => ({
  field: FIELD,
  operator: OPERATOR,
  type: MATCH,
  value: ENTRY_VALUE,
});

export const getEntryMatchAny = (): EntryMatchAny => ({
  field: FIELD,
  operator: OPERATOR,
  type: MATCH_ANY,
  value: [ENTRY_VALUE],
});

export const getEntryList = (): EntryList => ({
  field: FIELD,
  operator: OPERATOR,
  type: LIST,
  value: [ENTRY_VALUE],
});

export const getEntryExists = (): EntryExists => ({
  field: FIELD,
  operator: OPERATOR,
  type: EXISTS,
});

export const getEntryNested = (): EntryNested => ({
  entries: [getEntryMatch(), getEntryExists()],
  field: FIELD,
  type: NESTED,
});

export const getEntriesArray = (): EntriesArray => [
  getEntryMatch(),
  getEntryMatchAny(),
  getEntryList(),
  getEntryExists(),
  getEntryNested(),
];
