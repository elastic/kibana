/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DESCRIPTION, LIST_ID, META, NAME, TYPE } from '../../constants.mock';

import { CreateListSchema } from './create_list_schema';

export const getCreateListSchemaMock = (): CreateListSchema => ({
  description: DESCRIPTION,
  deserializer: undefined,
  id: LIST_ID,
  meta: META,
  name: NAME,
  serializer: undefined,
  type: TYPE,
});
