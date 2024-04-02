/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from '@kbn/core/public';
import { getDevToolsOptions } from '@kbn/xstate-utils';
import equal from 'fast-deep-equal';
import { distinctUntilChanged, EMPTY, from, map, shareReplay } from 'rxjs';
import { interpret } from 'xstate';
import { DatasetsService } from '../services/datasets';
import { createLogExplorerControllerStateMachine } from '../state_machines/log_explorer_controller';
import { LogExplorerStartDeps } from '../types';
import { addFilter, removeFilter } from './actions/filter';
import { LogExplorerCustomizations } from './controller_customizations';
import { createDataServiceProxy } from './custom_data_service';
import { createUiSettingsServiceProxy } from './custom_ui_settings_service';
import {
  createDiscoverMemoryHistory,
  createMemoryUrlStateStorage,
} from './custom_url_state_storage';
import { getContextFromPublicState, getPublicStateFromContext } from './public_state';
import {
  LogExplorerController,
  LogExplorerControllerActions,
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
  async ({
    customizations = {},
    initialState,
  }: {
    customizations?: LogExplorerCustomizations;
    initialState?: InitialState;
  }): Promise<LogExplorerController> => {
    const datasetsClient = new DatasetsService().start({
      http: core.http,
    }).client;

    const customMemoryHistory = createDiscoverMemoryHistory();
    const customMemoryUrlStateStorage = createMemoryUrlStateStorage(customMemoryHistory);
    const customUiSettings = createUiSettingsServiceProxy(core.uiSettings);
    const customData = createDataServiceProxy({
      data,
      http: core.http,
      uiSettings: customUiSettings,
    });
    const discoverServices: LogExplorerDiscoverServices = {
      data: customData,
      history: () => customMemoryHistory,
      uiSettings: customUiSettings,
      filterManager: customData.query.filterManager,
      timefilter: customData.query.timefilter.timefilter,
      urlStateStorage: customMemoryUrlStateStorage,
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
    });

    const logExplorerState$ = from(service).pipe(
      map(({ context }) => getPublicStateFromContext(context)),
      distinctUntilChanged(equal),
      shareReplay(1)
    );

    const actions: LogExplorerControllerActions = {
      addFilter,
      removeFilter,
    };

    return {
      actions,
      customizations,
      datasetsClient,
      discoverServices,
      event$: EMPTY,
      service,
      state$: logExplorerState$,
      stateMachine: machine,
    };
  };

export type CreateLogExplorerControllerFactory = typeof createLogExplorerControllerFactory;
export type CreateLogExplorerController = ReturnType<typeof createLogExplorerControllerFactory>;
