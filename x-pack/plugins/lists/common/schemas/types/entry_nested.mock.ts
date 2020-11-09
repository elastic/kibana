/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD, NESTED } from '../../constants.mock';

import { EntryNested } from './entry_nested';
import { getEntryMatchMock } from './entry_match.mock';
import { getEntryMatchAnyMock } from './entry_match_any.mock';

export const getEntryNestedMock = (): EntryNested => ({
  entries: [getEntryMatchMock(), getEntryMatchAnyMock()],
  field: FIELD,
  type: NESTED,
});
