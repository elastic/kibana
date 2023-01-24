/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TableIdLiteral } from '../../../../common/types';
import type { DataTableModel } from '../../../common/store/data_table/model';

export interface DataTablesStorage {
  getAllDataTables: () => Record<TableIdLiteral, DataTableModel>;
  getDataTablesById: (id: TableIdLiteral) => DataTableModel | null;
  addDataTable: (id: TableIdLiteral, table: DataTableModel) => void;
}
