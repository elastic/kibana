/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EXISTS, FIELD, OPERATOR } from '../../constants.mock';

import { EntryExists } from './entry_exists';

export const getEntryExistsMock = (): EntryExists => ({
  field: FIELD,
  operator: OPERATOR,
  type: EXISTS,
});
