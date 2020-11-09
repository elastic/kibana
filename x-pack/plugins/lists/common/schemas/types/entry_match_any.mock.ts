/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ENTRY_VALUE, FIELD, MATCH_ANY, OPERATOR } from '../../constants.mock';

import { EntryMatchAny } from './entry_match_any';

export const getEntryMatchAnyMock = (): EntryMatchAny => ({
  field: FIELD,
  operator: OPERATOR,
  type: MATCH_ANY,
  value: [ENTRY_VALUE],
});
