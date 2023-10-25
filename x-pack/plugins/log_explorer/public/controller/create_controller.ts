/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import { IToasts } from '@kbn/core-notifications-browser';
import { IStateStorage } from '@kbn/kibana-utils-plugin/public';
import { BehaviorSubject, map, ReplaySubject, combineLatest } from 'rxjs';
import { interpret } from 'xstate';
import { DatasetSelectionPlain, hydrateDatasetSelection } from '../../common';
import { DatasetsService, IDatasetsClient } from '../services/datasets';
import {
  createLogExplorerControllerStateMachine,
  LogExplorerControllerContext,
  LogExplorerControllerStateMachine,
  LogExplorerControllerStateService,
  WithDisplayOptions,
  WithQueryState,
} from '../state_machines/log_explorer_controller';
import { DEFAULT_CONTEXT } from '../state_machines/log_explorer_controller/src/defaults';
import { mapContextFromStateStorageContainer } from '../state_machines/log_explorer_controller/src/services/discover_service';
import { createStateStorageContainer } from './create_state_storage';

interface Dependencies {
  http: HttpSetup;
  toasts: IToasts;
}

export interface LogExplorerController {
  stateMachine: LogExplorerControllerStateMachine;
  service: LogExplorerControllerStateService;
  datasetsClient: IDatasetsClient;
  /**
   * Acts as state storage for the Discover container, rather than the URL.
   */
  stateStorageContainer: IStateStorage;
  logExplorerState$: BehaviorSubject<LogExplorerControllerContext>;
}

type InitialState = Partial<
  WithQueryState &
    WithDisplayOptions & {
      datasetSelection: DatasetSelectionPlain;
    }
>;

export const createLogExplorerControllerFactory =
  (deps: Dependencies) =>
  ({ initialState }: { initialState?: InitialState }): LogExplorerController => {
    const { http, toasts } = deps;

    const datasetsClient = new DatasetsService().start({
      http,
    }).client;

    const initialContext = {
      ...DEFAULT_CONTEXT,
      ...initialState,
      ...(initialState?.datasetSelection
        ? { datasetSelection: hydrateDatasetSelection(initialState.datasetSelection) }
        : {}),
    };

    // State storage container that allows the Log Explorer to act as state storage over the URL
    const stateStorageContainer = createStateStorageContainer({ initialState: initialContext });

    const logExplorerState$ = new BehaviorSubject<LogExplorerControllerContext>({});

    const discoverStateStorageContainer$ = new ReplaySubject(1);

    combineLatest([stateStorageContainer.change$('_a'), stateStorageContainer.change$('_g')])
      .pipe(
        map(([applicationState, globalState]) => {
          return mapContextFromStateStorageContainer(applicationState, globalState);
        })
      )
      .subscribe({ next: (value) => discoverStateStorageContainer$.next(value) });

    const machine = createLogExplorerControllerStateMachine({
      initialContext,
      datasetsClient,
      toasts,
      discoverStateStorageContainer$,
      logExplorerState$,
    });

    const service = interpret(machine).start();

    // Notify consumers of changes to the state machine's context
    service.subscribe((state) => {
      logExplorerState$.next(state.context);
    });

    return {
      stateMachine: machine,
      service,
      datasetsClient,
      /**
       * Acts as state storage for the Discover container, rather than the URL.
       */
      stateStorageContainer,
      logExplorerState$,
    };
  };

export type CreateLogExplorerController = ReturnType<typeof createLogExplorerControllerFactory>;
