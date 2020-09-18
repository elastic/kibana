/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LIST_ID, TYPE } from '../../constants.mock';

import { ImportListItemQuerySchema } from './import_list_item_query_schema';

export const getImportListItemQuerySchemaMock = (): ImportListItemQuerySchema => ({
  deserializer: undefined,
  list_id: LIST_ID,
  serializer: undefined,
  type: TYPE,
});
