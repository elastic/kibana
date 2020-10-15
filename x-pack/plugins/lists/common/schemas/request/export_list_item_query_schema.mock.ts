/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LIST_ID } from '../../constants.mock';

import { ExportListItemQuerySchema } from './export_list_item_query_schema';

export const getExportListItemQuerySchemaMock = (): ExportListItemQuerySchema => ({
  list_id: LIST_ID,
});
