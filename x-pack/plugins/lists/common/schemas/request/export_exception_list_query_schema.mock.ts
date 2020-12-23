/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ID, LIST_ID, NAMESPACE_TYPE } from '../../constants.mock';

import { ExportExceptionListQuerySchema } from './export_exception_list_query_schema';

export const getExportExceptionListQuerySchemaMock = (): ExportExceptionListQuerySchema => ({
  id: ID,
  list_id: LIST_ID,
  namespace_type: NAMESPACE_TYPE,
});
