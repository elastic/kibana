/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { getDevToolsOptions } from '@kbn/xstate-utils';
import { EMPTY, from, map, shareReplay } from 'rxjs';
import { interpret } from 'xstate';
import { DatasetsService } from '../services/datasets';
import { createLogExplorerControllerStateMachine } from '../state_machines/log_explorer_controller';
import { LogExplorerStartDeps } from '../types';
import { createDataServiceProxy } from './custom_data_service';
import { createUiSettingsServiceProxy } from './custom_ui_settings_service';
import { createMemoryUrlStateStorage } from './custom_url_state_storage';
import { getContextFromPublicState, getPublicStateFromContext } from './public_state';
import {
  LogExplorerController,
  LogExplorerDiscoverServices,
  LogExplorerPublicStateUpdate,
} from './types';

interface Dependencies {
  core: CoreStart;
  plugins: LogExplorerStartDeps;
}

type InitialState = LogExplorerPublicStateUpdate;

export const createLogExplorerControllerFactory =
  ({ core, plugins: { data } }: Dependencies) =>
  ({ initialState }: { initialState?: InitialState }): LogExplorerController => {
    const datasetsClient = new DatasetsService().start({
      http: core.http,
    }).client;

    const customUiSettings = createUiSettingsServiceProxy(core.uiSettings);
    const discoverServices: LogExplorerDiscoverServices = {
      data: createDataServiceProxy({
        data,
        http: core.http,
        uiSettings: customUiSettings,
      }),
      uiSettings: customUiSettings,
      urlStateStorage: createMemoryUrlStateStorage(),
    };

    const initialContext = getContextFromPublicState(initialState ?? {});

    const machine = createLogExplorerControllerStateMachine({
      datasetsClient,
      initialContext,
      query: discoverServices.data.query,
      toasts: core.notifications.toasts,
    });

    const service = interpret(machine, {
      devTools: getDevToolsOptions(),
    }).start();

    const logExplorerState$ = from(service).pipe(
      map(({ context }) => getPublicStateFromContext(context)),
      shareReplay(1)
    );

    return {
      actions: {},
      datasetsClient,
      discoverServices,
      event$: EMPTY,
      service,
      state$: logExplorerState$,
      stateMachine: machine,
    };
  };

export type CreateLogExplorerController = ReturnType<typeof createLogExplorerControllerFactory>;

// const createInitialContext = (
//   initialState: InitialState | undefined
// ): LogExplorerControllerContext => {
//   if (initialState != null) {
//     // const { datasetSelection, ...remainingInitialState } = initialState;

//     return {
//       ...DEFAULT_CONTEXT,
//       ...getContextFromPublicState(initialState),
//       // ...remainingInitialState,
//       // datasetSelection:
//       //   datasetSelection != null
//       //     ? hydrateDatasetSelection(datasetSelection)
//       //     : DEFAULT_CONTEXT.datasetSelection,
//     };
//   }

//   return DEFAULT_CONTEXT;
// };
