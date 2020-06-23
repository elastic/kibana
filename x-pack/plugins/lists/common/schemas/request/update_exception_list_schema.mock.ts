/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DESCRIPTION, ID, LIST_ID, META, NAME, NAMESPACE_TYPE, _TAGS } from '../../constants.mock';

import { UpdateExceptionListSchema } from './update_exception_list_schema';

export const getUpdateExceptionListSchemaMock = (): UpdateExceptionListSchema => ({
  _tags: _TAGS,
  description: DESCRIPTION,
  id: ID,
  list_id: LIST_ID,
  meta: META,
  name: NAME,
  namespace_type: NAMESPACE_TYPE,
  tags: ['malware'],
  type: 'endpoint',
});
