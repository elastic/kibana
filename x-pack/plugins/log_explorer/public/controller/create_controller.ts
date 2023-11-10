/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { getDevToolsOptions } from '@kbn/xstate-utils';
import { BehaviorSubject } from 'rxjs';
import { interpret } from 'xstate';
import { DatasetSelectionPlain, hydrateDatasetSelection } from '../../common';
import { DatasetsService } from '../services/datasets';
import {
  createLogExplorerControllerStateMachine,
  LogExplorerControllerContext,
  WithDisplayOptions,
  WithQueryState,
} from '../state_machines/log_explorer_controller';
import { DEFAULT_CONTEXT } from '../state_machines/log_explorer_controller/src/defaults';
import { LogExplorerStartDeps } from '../types';
import { createDataServiceProxy } from './custom_data_service';
import { createUiSettingsServiceProxy } from './custom_ui_settings_service';
import { createMemoryUrlStateStorage } from './custom_url_state_storage';
import { LogExplorerController, LogExplorerDiscoverServices } from './types';
// import { mapContextFromStateStorageContainer } from '../state_machines/log_explorer_controller/src/services/discover_service';
// import { createStateStorageContainer } from './create_state_storage';

interface Dependencies {
  core: CoreStart;
  plugins: LogExplorerStartDeps;
}

type InitialState = Partial<
  WithQueryState &
    WithDisplayOptions & {
      datasetSelection: DatasetSelectionPlain;
    }
>;

export const createLogExplorerControllerFactory =
  ({ core, plugins: { data } }: Dependencies) =>
  ({ initialState }: { initialState?: InitialState }): LogExplorerController => {
    const datasetsClient = new DatasetsService().start({
      http: core.http,
    }).client;

    const discoverServices: LogExplorerDiscoverServices = {
      data: createDataServiceProxy(data),
      uiSettings: createUiSettingsServiceProxy(core.uiSettings),
      urlStateStorage: createMemoryUrlStateStorage(),
    };

    const initialContext = createInitialContext(initialState);

    const logExplorerContext$ = new BehaviorSubject<LogExplorerControllerContext>(initialContext);

    const machine = createLogExplorerControllerStateMachine({
      initialContext,
      datasetsClient,
      toasts: core.notifications.toasts,
    });

    const service = interpret(machine, {
      devTools: getDevToolsOptions(),
    }).start();

    // Notify consumers of changes to the state machine's context
    service.subscribe((state) => {
      logExplorerContext$.next(state.context);
    });

    return {
      datasetsClient,
      discoverServices,
      service,
      state$: logExplorerContext$.asObservable(),
      stateMachine: machine,
    };
  };

export type CreateLogExplorerController = ReturnType<typeof createLogExplorerControllerFactory>;

const createInitialContext = (
  initialState: InitialState | undefined
): LogExplorerControllerContext => {
  if (initialState != null) {
    const { datasetSelection, ...remainingInitialState } = initialState;

    return {
      ...DEFAULT_CONTEXT,
      ...remainingInitialState,
      datasetSelection:
        datasetSelection != null
          ? hydrateDatasetSelection(datasetSelection)
          : DEFAULT_CONTEXT.datasetSelection,
    };
  }

  return DEFAULT_CONTEXT;
};
