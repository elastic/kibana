/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DESCRIPTION, LIST_ID, META, NAME, TYPE } from '../../constants.mock';

import { CreateExceptionListSchema } from './create_exception_list_schema';

export const getCreateExceptionListSchemaMock = (): CreateExceptionListSchema => ({
  _tags: [],
  description: DESCRIPTION,
  list_id: LIST_ID,
  meta: META,
  name: NAME,
  tags: [],
  type: TYPE,
});
