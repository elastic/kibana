/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FIELD, LIST, LIST_ID, OPERATOR, TYPE } from '../../constants.mock';

import { EntryList } from './entry_list';

export const getEntryListMock = (): EntryList => ({
  field: FIELD,
  list: { id: LIST_ID, type: TYPE },
  operator: OPERATOR,
  type: LIST,
});
