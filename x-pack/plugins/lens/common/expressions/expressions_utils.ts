/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TablesAdapter } from '../../../../../src/plugins/expressions';
import type { Datatable } from '../../../../../src/plugins/expressions';

export const logDataTable = (
  tableAdapter: TablesAdapter,
  datatables: Record<string, Datatable> = {}
) => {
  Object.entries(datatables).forEach(([key, table]) => tableAdapter.logDatatable(key, table));
};
