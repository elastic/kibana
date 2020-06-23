/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DESCRIPTION, ENDPOINT_TYPE, META, NAME, NAMESPACE_TYPE } from '../../constants.mock';

import { CreateExceptionListSchema } from './create_exception_list_schema';

export const getCreateExceptionListSchemaMock = (): CreateExceptionListSchema => ({
  _tags: [],
  description: DESCRIPTION,
  list_id: undefined,
  meta: META,
  name: NAME,
  namespace_type: NAMESPACE_TYPE,
  tags: [],
  type: ENDPOINT_TYPE,
});
