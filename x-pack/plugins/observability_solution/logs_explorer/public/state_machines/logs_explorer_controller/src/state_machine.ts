/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts, IUiSettingsClient } from '@kbn/core/public';
import { QueryStart } from '@kbn/data-plugin/public';
import { actions, createMachine, interpret, InterpreterFrom, raise } from 'xstate';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { OBSERVABILITY_LOGS_EXPLORER_ALLOWED_DATA_VIEWS_ID } from '@kbn/management-settings-ids';
import { LogsExplorerCustomizations } from '../../../controller';
import { ControlPanelRT } from '../../../../common/control_panels';
import {
  AllDatasetSelection,
  isDataSourceSelection,
  isDataViewSelection,
} from '../../../../common/data_source_selection';
import { IDatasetsClient } from '../../../services/datasets';
import { DEFAULT_CONTEXT } from './defaults';
import {
  createCreateDataViewFailedNotifier,
  createDatasetSelectionRestoreFailedNotifier,
  createDataViewSelectionRestoreFailedNotifier,
} from './notifications';
import {
  initializeControlPanels,
  subscribeControlGroup,
  updateControlPanels,
} from './services/control_panels';
import { changeDataView, createAdHocDataView } from './services/data_view_service';
import {
  redirectToDiscover,
  subscribeToDiscoverState,
  updateContextFromDiscoverAppState,
  updateContextFromDiscoverDataState,
  updateDiscoverAppStateFromContext,
} from './services/discover_service';
import { initializeSelection } from './services/selection_service';
import {
  subscribeToTimefilterService,
  updateContextFromTimefilter,
  updateTimefilterFromContext,
} from './services/timefilter_service';
import {
  LogsExplorerControllerContext,
  LogsExplorerControllerEvent,
  LogsExplorerControllerTypeState,
} from './types';

export const createPureLogsExplorerControllerStateMachine = (
  initialContext: LogsExplorerControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2VYFEAeAHANqgE5hEDCqAdgC5Gr76kB0ArpQJYfXsCG+7AL0gBiAEqYymAJIA1TABEA+gGUAKgEFVmRWQDyAOQ1T9mUQG0ADAF1EoXKljtuVWyGyIAzABYvTAOwAjABsFgCcAKxefhYAHLF+ADQgAJ6IoUFMoVHhMeEBwaHBFn4AviVJaBg4BMSkFDR0DMycTrz8ApxQymCMAMbOlMLGUqpS6shSAFra8prqijJSmADqljZIIPaOA67uCEEhTF4xPqEATOER0WdeSakIXh4eTBZnARYW4Wehn0EnXmUKugsHhCCRyFRaPRGEQmC1uHxBJ1un0BkN9CMxhNpopZhplJhVGtXFtWi4Nnsgr5QjEAjdjuEPH5AhYgndEI9nq93p9vr9-oCQJUQTVwfUoU1YfC2kjKF0emB+uwqMI8eoCaoVJhkBJRgZFOI1LpxIoAGLqKTIACq4mJG1JOwpiAAtGdiv4-GcngEvEEPDEgnkPOyEB43Uwvk8sl5Qv74oLhdUwXVIY0YXCuDKOnKUYq0WrFistTqyHr9AbMEaTebLTbMHa7A4yZRdi63mcmDFcjkfcUAh4aeEQwEYn5-NzGXSvY9QgngUnahCGtDmpnEdmoPIeNQeDJ2GAAO7CCBUMAZgBuqAA1mfE6DF+K06vWuvOlud3vDwhOJfetvlZQawNpsTaOqAezhK8LzHB4xRvHEXgjiG0QWC8MQ-EEoQ-H4TwXHOVT3mKqYrlKa7tG+267vuR6kHQsIENuABmxAALZMHeoopsukoZi+5Fyu+VFfj+qB-gMQHWCSoEAa2oZMkwAThH4xy+mcXpqU8IaQTERxBO8HgBLGHyxAC5RCvOhFcRK6bSq+AmUbAYDUMep4Xtet4WZxS7Wc+CL8ZuDlOd+lC-v+VASesjbbDJToIK6HZ+CEjKBAZMRqYhiQpIgKFoRhWHFLh4T4SKybeU+pF8bKAU7o5zm0cQTAMdQzFEGxHGlY+JG8X5VWCbVwWheJ1jAQ6MXgS6I6hEccR+DSXjFLNFgeGyWUIDE8mfAEs2BGcBwXEExULkR3E2WRVWdfgAAKPCUD0sAubdbk3uxnkdcRPG2f5F3Xbd+CwANolhYBw2Sfa0nkuNCCeh2gZBGc6H0q8vohrSGRMjcYQnH4aVZIdlllV1n3ne9P13cI9X0fgTGsS9BFeRdp2VRu303XdANiQBEVSdFENuNlXpMGGXgXD6TKJaEIYYUwfrhHkSmxD8sZ4-T72Mz1QgQGIEjSHIuJSMoehyKIijqJdl0qBoWgjeDLaxTkqGIWEBkhLtWTDrBU2MvDVK7RY-YHMrb0nb5WYiOIkiyDM+uG6YuJzBbmj1qDUXNrJSnhJ2fpZHk5zC8OSnPFhzKspcBysgdZntQ+qsh+uYfa5HigAIpWqYACaCdW8nIE87bkPhH8EYskEOFbQPfzDj41Jul4eQXMUftFZXr3V8HFXq-XEe66MACymCmpaWjG7vSeRT3qexSEU1eqO4v9kyMbDltY7y4EjInJB8OB6vPnr6Hmvhx1toE+B9kBHwrKaQ0AAJRQxgj4yHGNbXuadGSCz8JEEIi1ggj2HBYY4nZaQnB9N8WWZxSjLzpkHX+3V-5MAgIFaguYlRUDhBARgwgrSXTxDMOYGpiy6ikAYJBF9IZ0gOBGUu80vjnEiJle4TIprpHyN4Wa+QDjkKBJQn+5UaF1wgHQhhTCBisPYZw7hcd8SEn4aWQR+gzABDPqNXmex+z9gjP2L4BwIhbQOFpKCs15qemiFhDwlxv7HWoUTDWBiapOSMQBExYAOFcMThY9UViCQljLGYM4jibayUUm8aW60RxBmWucM4yFoiZBHEtS4sQviGXCVZHRUTIAxJ4LVeJLDegAAsbpQAoh+aiD0zwiWelXCJrSzrRPobExhCpmGUCYH0gZQyhIHnZkDLmYNkGxTpAOQW-ZUY-EUj6ORiA4YZyZE7aIhlfSFGaQTD6Mz2lzM6XExZxjVlynWZ+GiRA6KNSps1GmkyWmE1efo95XSvkJJ+YM+ywzhIhUBkNKwwiwJ8wQAcqavoiGQSWm8W4q1PSoWUbSMRxxuxPIZrXdobzDFwp6SQf8cp1AQCgaJQS-zRlPQ8loqZkKmaMvmd05ZvRWXcHZZy7llF-lbPRZisa2L74v3OIlMMwROSVNWj8HSXx1rLV9Ngx5FCSraOFRvaFTLUTwqlZ0DlXLeg8pGRTYF1NWq0wtUKl5IqbViuZRKh1MrnWupRYNTmIM8l7NEU8HSvscLw0UgrGIuD3RdjCHDRavJTKaJ9RCv11qVnvQAOJ0BYLgWArAOBQvRJicYUxtB6EMKIXQyBFClrbZwk2l0pDKucYgfsHxMhvB9OtWWI9sbDi9BnLsI84h-EXW8WlNc-56JLdxctqBK3VvYGwpJaoFhLGWIoMxid5ADr7qqukntsZBOONER4abVpnN8LPZNkQfA3ESquteuiGX6N6GWitVbEnJPMS21QbaO2XXUCYZAygr0FOWh2Rkfs-TMhyC++4b6jiGsUlPH9Hg-2RKhZuiU27d2sFwHMzoLNfr3RPI9cZAqC3PLVrQ4DW7QPVsrXRuUDG2YiQ5uFaN3MRGqoHM8OGJw0pKUUutFauH-TUi7BcE4ERVMBFI9M-1FHGhUbA-xtlUAhN-XJoChqTUWptRXr6zjG7uOUd4zRgTZmSasz+oqqNGLu5OOvS4gcvhvhUkadceaJKVO7U7PDWIAZ+yhGUmcMoZlKCoAgHAVw4KOOkAk1ivYrpDhdllrSQJiXcghmdKhd+o49KizdHEP2umupsDaRAfLKrCtuimu8eGY74boK9BcnFhlR2IV9AEgckEK75qOoWxz-lxWdcHaGQMgtPgao9nEMMIZQtMBuH6dCk6-jZxa0WrMfzqIrcC5c2WRwgl-EDAGC4EtVoYMzp6ZarwwxfDzeZQVC36W9QYTd2S3gFInAfsyRriFZZaV9J93aZXvjpBI+a+buX11fU84xsHsVQmoQiM++aSWBxwxRojshbo-iNdwjEc7i3BCQHx6In7mQk0yz9sUNKKMMhKLpK-fSdJGfA9mbavMKqAsFLggpVkON-ToOWiN74HYTW9iwukbGDOMf4zpdj5nAaPkLLtSw-djBWc3vDO8WnsZRyMhwateaHZ3izzfhcUJ+RRcG-F4G03Er+m-KRRsy3Li3eZFCap84ucAghjhs8FReQcKZtOd7gDhuOmwv9yskNUAnVyuRQeUPQ6cjUhuccYoBwXaS1ZBGPBhQ-iwT5Dp3XKt-3tYM-QIz8BdmSZcX2DnYYufvGxrq3D47BYBlpKcv0I408d+c4Z1zbWoXF9G-DCRV80d+kQsGV9GnM5PCw5EAcnp5-kcX131z5uwBr+1RnDVhkc1bT3yptKmQqRdgMqyXaeFW9UL02LUv3wG7zc1M3Mx7xTgKyHXyEUU50JxH151fTjAOw+FpGiFHDUnQlSxKCAA */
  createMachine<
    LogsExplorerControllerContext,
    LogsExplorerControllerEvent,
    LogsExplorerControllerTypeState
  >(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'LogsExplorerController',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          on: {
            RECEIVED_STATE_CONTAINER: {
              target: 'initializingSelection',
              actions: ['storeDiscoverStateContainer'],
            },
          },
        },
        initializingSelection: {
          invoke: {
            src: 'initializeSelection',
          },
          on: {
            INITIALIZE_DATA_VIEW: {
              target: 'initializingDataView',
              actions: ['storeDataSourceSelection'],
            },
            INITIALIZE_DATASET: {
              target: 'initializingDataset',
              actions: ['storeDataSourceSelection'],
            },
            DATASET_SELECTION_RESTORE_FAILURE: {
              target: 'initializingDataset',
              actions: ['storeDefaultSelection', 'notifyDatasetSelectionRestoreFailed'],
            },
            DATAVIEW_SELECTION_RESTORE_FAILURE: {
              target: 'initializingDataset',
              actions: ['storeDefaultSelection', 'notifyDataViewSelectionRestoreFailed'],
            },
          },
        },
        initializingDataView: {
          invoke: {
            src: 'changeDataView',
            onDone: {
              target: 'initializingControlPanels',
              actions: ['updateDiscoverAppStateFromContext', 'updateTimefilterFromContext'],
            },
            onError: {
              target: 'initializingDataset',
              actions: [
                'storeDefaultSelection',
                'notifyCreateDataViewFailed',
                'updateDiscoverAppStateFromContext',
                'updateTimefilterFromContext',
              ],
            },
          },
        },
        initializingDataset: {
          invoke: {
            src: 'createAdHocDataView',
            onDone: {
              target: 'initializingControlPanels',
              actions: ['updateDiscoverAppStateFromContext', 'updateTimefilterFromContext'],
            },
            onError: {
              target: 'initialized',
              actions: [
                'notifyCreateDataViewFailed',
                'updateDiscoverAppStateFromContext',
                'updateTimefilterFromContext',
              ],
            },
          },
        },
        initializingControlPanels: {
          invoke: {
            src: 'initializeControlPanels',
            onDone: {
              target: 'initialized',
              actions: ['storeControlPanels'],
            },
            onError: {
              target: 'initialized',
            },
          },
        },
        initialized: {
          type: 'parallel',
          invoke: [
            {
              src: 'discoverStateService',
              id: 'discoverStateService',
            },
            {
              src: 'timefilterService',
              id: 'timefilterService',
            },
          ],
          entry: ['resetRows'],
          states: {
            dataSourceSelection: {
              initial: 'idle',
              states: {
                idle: {
                  on: {
                    UPDATE_DATA_SOURCE_SELECTION: [
                      {
                        cond: 'isDataViewNotAllowed',
                        actions: ['redirectToDiscover'],
                      },
                      {
                        cond: 'isDataViewAllowed',
                        target: 'changingDataView',
                        actions: ['storeDataSourceSelection'],
                      },
                      {
                        target: 'creatingAdHocDataView',
                        actions: ['storeDataSourceSelection'],
                      },
                    ],
                  },
                },
                changingDataView: {
                  invoke: {
                    src: 'changeDataView',
                    onDone: {
                      target: 'idle',
                      actions: ['notifyDataViewUpdate'],
                    },
                    onError: {
                      target: 'idle',
                      actions: ['notifyCreateDataViewFailed'],
                    },
                  },
                },
                creatingAdHocDataView: {
                  invoke: {
                    src: 'createAdHocDataView',
                    onDone: {
                      target: 'idle',
                      actions: ['notifyDataViewUpdate'],
                    },
                    onError: {
                      target: 'idle',
                      actions: ['notifyCreateDataViewFailed'],
                    },
                  },
                },
              },
            },
            controlGroups: {
              initial: 'uninitialized',
              states: {
                uninitialized: {
                  on: {
                    INITIALIZE_CONTROL_GROUP_API: {
                      target: 'idle',
                      cond: 'controlGroupAPIExists',
                      actions: ['storeControlGroupAPI'],
                    },
                  },
                },
                idle: {
                  invoke: {
                    src: 'subscribeControlGroup',
                  },
                  on: {
                    DATA_VIEW_UPDATED: {
                      target: 'updatingControlPanels',
                    },
                    UPDATE_CONTROL_PANELS: {
                      target: 'updatingControlPanels',
                    },
                  },
                },
                updatingControlPanels: {
                  invoke: {
                    src: 'updateControlPanels',
                    onDone: {
                      target: 'idle',
                      actions: ['storeControlPanels'],
                    },
                    onError: {
                      target: 'idle',
                    },
                  },
                },
              },
            },
          },
          on: {
            RECEIVE_DISCOVER_APP_STATE: {
              actions: ['updateContextFromDiscoverAppState'],
            },
            RECEIVE_DISCOVER_DATA_STATE: {
              actions: ['updateContextFromDiscoverDataState'],
            },
            RECEIVE_QUERY_STATE: {
              actions: ['updateQueryStateFromQueryServiceState'],
            },
            RECEIVE_TIMEFILTER_TIME: {
              actions: ['updateContextFromTimefilter'],
            },
            RECEIVE_TIMEFILTER_REFRESH_INTERVAL: {
              actions: ['updateContextFromTimefilter'],
            },
          },
        },
      },
    },
    {
      actions: {
        storeDefaultSelection: actions.assign((_context) => ({
          dataSourceSelection: AllDatasetSelection.create(),
        })),
        storeDataSourceSelection: actions.assign((_context, event) =>
          'data' in event && isDataSourceSelection(event.data)
            ? { dataSourceSelection: event.data }
            : {}
        ),
        storeDiscoverStateContainer: actions.assign((_context, event) =>
          'discoverStateContainer' in event
            ? { discoverStateContainer: event.discoverStateContainer }
            : {}
        ),
        storeControlGroupAPI: actions.assign((_context, event) =>
          'controlGroupAPI' in event ? { controlGroupAPI: event.controlGroupAPI } : {}
        ),
        storeControlPanels: actions.assign((_context, event) =>
          'data' in event && ControlPanelRT.is(event.data) ? { controlPanels: event.data } : {}
        ),
        resetRows: actions.assign((_context, event) => ({
          rows: [],
        })),
        notifyDataViewUpdate: raise('DATA_VIEW_UPDATED'),
        updateContextFromDiscoverAppState,
        updateContextFromDiscoverDataState,
        updateDiscoverAppStateFromContext,
        updateContextFromTimefilter,
      },
      guards: {
        controlGroupAPIExists: (_context, event) => {
          return 'controlGroupAPI' in event && event.controlGroupAPI != null;
        },
        // Default guard to allow logs data views, it is over-writable on the final config when creating a machine
        isDataViewAllowed: (_context, event) => {
          if (event.type === 'UPDATE_DATA_SOURCE_SELECTION' && isDataViewSelection(event.data)) {
            return event.data.selection.dataView.isLogsDataType();
          }
          return false;
        },
        // Default guard to not allow unknown data views, it is over-writable on the final config when creating a machine
        isDataViewNotAllowed: (_context, event) => {
          if (event.type === 'UPDATE_DATA_SOURCE_SELECTION' && isDataViewSelection(event.data)) {
            return event.data.selection.dataView.isUnknownDataType();
          }
          return false;
        },
      },
    }
  );

export interface LogsExplorerControllerStateMachineDependencies {
  datasetsClient: IDatasetsClient;
  dataViews: DataViewsPublicPluginStart;
  events?: LogsExplorerCustomizations['events'];
  initialContext?: LogsExplorerControllerContext;
  query: QueryStart;
  toasts: IToasts;
  uiSettings: IUiSettingsClient;
}

export const createLogsExplorerControllerStateMachine = ({
  datasetsClient,
  dataViews,
  events,
  initialContext = DEFAULT_CONTEXT,
  query,
  toasts,
  uiSettings,
}: LogsExplorerControllerStateMachineDependencies) =>
  createPureLogsExplorerControllerStateMachine(initialContext).withConfig({
    actions: {
      notifyCreateDataViewFailed: createCreateDataViewFailedNotifier(toasts),
      notifyDatasetSelectionRestoreFailed: createDatasetSelectionRestoreFailedNotifier(toasts),
      notifyDataViewSelectionRestoreFailed: createDataViewSelectionRestoreFailedNotifier(toasts),
      redirectToDiscover: redirectToDiscover(events),
      updateTimefilterFromContext: updateTimefilterFromContext(query),
    },
    services: {
      changeDataView: changeDataView({ dataViews }),
      createAdHocDataView: createAdHocDataView(),
      initializeControlPanels: initializeControlPanels(),
      initializeSelection: initializeSelection({ datasetsClient, dataViews, events, uiSettings }),
      subscribeControlGroup: subscribeControlGroup(),
      updateControlPanels: updateControlPanels(),
      discoverStateService: subscribeToDiscoverState(),
      timefilterService: subscribeToTimefilterService(query),
    },
    guards: {
      isDataViewAllowed: (_context, event) => {
        if (event.type === 'UPDATE_DATA_SOURCE_SELECTION' && isDataViewSelection(event.data)) {
          return event.data.selection.dataView.testAgainstAllowedList(
            uiSettings.get(OBSERVABILITY_LOGS_EXPLORER_ALLOWED_DATA_VIEWS_ID)
          );
        }
        return false;
      },
      isDataViewNotAllowed: (_context, event) => {
        if (event.type === 'UPDATE_DATA_SOURCE_SELECTION' && isDataViewSelection(event.data)) {
          return !event.data.selection.dataView.testAgainstAllowedList(
            uiSettings.get(OBSERVABILITY_LOGS_EXPLORER_ALLOWED_DATA_VIEWS_ID)
          );
        }
        return false;
      },
    },
  });

export const initializeLogsExplorerControllerStateService = (
  deps: LogsExplorerControllerStateMachineDependencies
) => {
  const machine = createLogsExplorerControllerStateMachine(deps);
  return interpret(machine).start();
};

export type LogsExplorerControllerStateService = InterpreterFrom<
  typeof createLogsExplorerControllerStateMachine
>;

export type LogsExplorerControllerStateMachine = ReturnType<
  typeof createLogsExplorerControllerStateMachine
>;
