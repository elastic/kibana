/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface WithTableOptions {
  table: {
    page: number;
    rowsPerPage: number;
  };
}

export type DefaultDatasetQualityControllerState = WithTableOptions;

export interface DatasetQualityControllerTypeState {
  value: 'uninitialized';
  context: DefaultDatasetQualityControllerState;
}

export type DatasetQualityControllerContext = DatasetQualityControllerTypeState['context'];

export type DatasetQualityControllerEvent =
  | {
      type: 'CHANGE_PAGE';
      page: number;
    }
  | {
      type: 'CHANGE_ROWS_PER_PAGE';
      rowsPerPage: number;
    };
