/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ENTRY_VALUE, FIELD, MATCH, OPERATOR } from '../../constants.mock';

import { EntryMatch } from './entry_match';

export const getEntryMatchMock = (): EntryMatch => ({
  field: FIELD,
  operator: OPERATOR,
  type: MATCH,
  value: ENTRY_VALUE,
});
