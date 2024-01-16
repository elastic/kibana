/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable } from 'rxjs';

export interface DatasetQualityController {
  actions: {
    setPage: (page: number) => void;
    setRowsPerPage: (rowsPerPage: number) => void;
  };
  state: DatasetQualityPublicState;
  state$: Observable<DatasetQualityPublicState>;
}

export interface DatasetQualityTableOptions {
  page: number;
  rowsPerPage: number;
}

export interface DatasetQualityPublicState {
  table: DatasetQualityTableOptions;
}

export type DatasetQualityPublicStateUpdate = Partial<DatasetQualityPublicState>;
