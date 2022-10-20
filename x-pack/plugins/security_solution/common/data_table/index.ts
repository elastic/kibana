/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TGridModel } from '../../public/common/store/data_table/model';

/** A map of id to data table  */
export interface TableById {
  [id: string]: TGridModel;
}

export const EMPTY_TABLE_BY_ID: TableById = {}; // stable reference

export interface TGridEpicDependencies<State> {
  // kibana$: Observable<CoreStart>;
  storage: Storage;
  tGridByIdSelector: () => (state: State, timelineId: string) => TGridModel;
}

/** The state of all data tables is stored here */
export interface TableState {
  tableById: TableById;
}
