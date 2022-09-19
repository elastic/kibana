/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import type { TableById, TableState } from '@kbn/timelines-plugin/public/types';

export interface TableEpicDependencies<State> {
  tableByIdSelector: (state: State) => TableById;
  storage: Storage;
}

/** The state of all timelines is stored here */
export interface DataTableState {
  dataTable: TableState;
}
