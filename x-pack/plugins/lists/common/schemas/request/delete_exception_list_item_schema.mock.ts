/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ID, NAMESPACE_TYPE } from '../../constants.mock';

import { DeleteExceptionListItemSchema } from './delete_exception_list_item_schema';

export const getDeleteExceptionListItemSchemaMock = (): DeleteExceptionListItemSchema => ({
  id: ID,
  namespace_type: NAMESPACE_TYPE,
});
