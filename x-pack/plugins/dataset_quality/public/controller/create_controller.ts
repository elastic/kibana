/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { getDevToolsOptions } from '@kbn/xstate-utils';
import equal from 'fast-deep-equal';
import { distinctUntilChanged, from, map, shareReplay } from 'rxjs';
import { interpret } from 'xstate';
import { createDatasetQualityControllerStateMachine } from '../state_machines/dataset_quality_controller';
import { DatasetQualityStartDeps } from '../types';
import { getContextFromPublicState, getPublicStateFromContext } from './public_state';
import { DatasetQualityController, DatasetQualityPublicStateUpdate } from './types';

type InitialState = DatasetQualityPublicStateUpdate;

const state = {
  table: {
    page: 0,
    rowsPerPage: 10,
  },
};

interface Dependencies {
  core: CoreStart;
  plugins: DatasetQualityStartDeps;
}

export const createDatasetQualityControllerFactory =
  ({ core }: Dependencies) =>
  async ({
    initialState = state,
  }: {
    initialState?: InitialState;
  }): Promise<DatasetQualityController> => {
    const initialContext = getContextFromPublicState(initialState ?? {});

    const machine = createDatasetQualityControllerStateMachine({
      initialContext,
      toasts: core.notifications.toasts,
    });

    const service = interpret(machine, {
      devTools: getDevToolsOptions(),
    });

    /* service.onTransition((t) => {
      console.log('New transition', t);
    }); */

    const state$ = from(service).pipe(
      map(({ context }) => getPublicStateFromContext(context)),
      // distinctUntilChanged(equal),
      shareReplay(1)
    );

    return {
      state$,
      service,
      stateMachine: machine,
    };

    /* const datasetQualityState = new BehaviorSubject({
      ...state,
      ...initialState,
    }); */

    /* return {
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
      },x
      get state() {
        return datasetQualityState.getValue();
      },
      state$: datasetQualityState.asObservable().pipe(distinctUntilChanged(equal)),
    }; */
  };

export type CreateDatasetQualityControllerFactory = typeof createDatasetQualityControllerFactory;
export type CreateDatasetQualityController = ReturnType<
  typeof createDatasetQualityControllerFactory
>;
