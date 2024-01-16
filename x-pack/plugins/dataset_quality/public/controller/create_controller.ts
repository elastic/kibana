/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import equal from 'fast-deep-equal';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { DatasetQualityController, DatasetQualityPublicStateUpdate } from './types';

type InitialState = DatasetQualityPublicStateUpdate;

const state = {
  table: {
    page: 0,
    rowsPerPage: 10,
  },
};

export const createDatasetQualityControllerFactory =
  () =>
  async ({
    initialState = state,
  }: {
    initialState?: InitialState;
  }): Promise<DatasetQualityController> => {
    const datasetQualityState = new BehaviorSubject({
      ...state,
      ...initialState,
    });

    return {
      actions: {
        setPage: (page: number) => {
          datasetQualityState.next({
            ...datasetQualityState.getValue(),
            table: {
              ...datasetQualityState.getValue().table,
              page,
            },
          });
        },
        setRowsPerPage: (rowsPerPage: number) => {
          datasetQualityState.next({
            ...datasetQualityState.getValue(),
            table: {
              ...datasetQualityState.getValue().table,
              rowsPerPage,
            },
          });
        },
      },
      get state() {
        return datasetQualityState.getValue();
      },
      state$: datasetQualityState.asObservable().pipe(distinctUntilChanged(equal)),
    };
  };

export type CreateDatasetQualityControllerFactory = typeof createDatasetQualityControllerFactory;
export type CreateDatasetQualityController = ReturnType<
  typeof createDatasetQualityControllerFactory
>;
