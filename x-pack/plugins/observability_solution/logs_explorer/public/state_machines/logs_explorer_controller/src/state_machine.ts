/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Subject } from 'rxjs';
import { IToasts, IUiSettingsClient } from '@kbn/core/public';
import { QueryStart } from '@kbn/data-plugin/public';
import { actions, createMachine, interpret, InterpreterFrom, raise } from 'xstate';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { OBSERVABILITY_LOGS_EXPLORER_ALLOWED_DATA_VIEWS_ID } from '@kbn/management-settings-ids';
import type { LogsExplorerCustomizations, LogsExplorerPublicEvent } from '../../../controller';
import { ControlPanelRT } from '../../../../common/control_panels';
import {
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
import { createDataReceivedEventEmitter } from './public_events';

export const createPureLogsExplorerControllerStateMachine = (
  initialContext: LogsExplorerControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2VYFEAeAHANqgE5hEDCqAdgC5Gr76kB0ArpQJYfXsCG+7AL0gBiAEqYymAJIA1TABEA+gGUAKgEFVmRWQDyAOQ1T9mUQG0ADAF1EoXKljtuVWyGyIAjAA4AzEy8eAEwALF7B3h7BgV4AnAA0IACenhYA7EweAKwWOakeAGz5AL5FCWgYOATEpBQ0dAzMnE68-AKcUMpgjADGzpTCxlKqUurIUgBa2vKa6ooyUpgA6pY2SCD2jn2u7gh5+Rn5PjExXpmRPh4+CckIPl5eTD4+mTFHqTEW95nBJWXoWHhCCRyFRaPRGEQmE1uHxBO1Oj0+gN9EMRmNJopphplJhVCtXBtmi41jtUoF9gUjiczsELlckogAkxgscTpcCp9AoFfiBygCqsDamCGpDoS04ZQOl0wL12FRhFj1DjVCpMMgJMMDIpxGpdOJFAAxdRSZAAVXE+LWhK2JMQZIph2Op3Ol2unlS6RimQu3y9J0CFg8PL5lSBNVB9QhUK44rakoRMqRivmS1V6rImv02swuv1RpN5swlrsDiJlG2dosDqpztproZCEKfnyeS8Fg+vjCxVKvP+oeqILq4MaMdhcag8h41B4MnYYAA7sIIFQwNGAG6oADWq5DgIHQsjI+aY-ak+ns4XCE4G+6U7llBWxfWpZtoB2Hm8gUeAY8qUyjuCTIvDdBBshiZl8i8VJ8gsANUirQNgz7PdBQjYdRVHVpTynGc50XUg6EhAgpwAM2IABbJhdwFcMhxFaNjywyUz1wy9r1QW8+kfawCRfe8KwQD8vC-Hwfz-ACgJAp5Mgyf9Ag7d5YJickkIqFDaOFKMxRPZicNgMBqCXFd1y3HdkJowdNKPGEmInPSDKvSgbzvKhuNWEtNn421QMCECPBid4mC9VIfEgoDfzJVJVP5MNLMPDDGIlOzp30wyCOIJhiOoMiiEo6jYoPdCGJspKWNSxznK46wn2tLy30QfJfIbX9AyC2JOUCD0YkiLxov7VC6K0zCksK-AAAUeEoLpYCMqaTO3KjzIKtD6O02zRomqb8FgCqOJch9qp4q0+OJerG28DJW1bbxlNCPzjmCJhyTJO4oirZ4fD69S4qKtaRpWzbpuEdKiPwUiKMWtSLNGobEvHDbJum3bOPvNzeM8063Aai7f28a7YhCYCGwDKCmDJCwnmgy4qa+6GVthkqhAgMQJGkORMSkZQ9DkURFHUMaxpUDQtBqk7y28rIsgONsP3CDx3r84ILBk9r8hZTJ3nl2JaeWwbrNjERxEkWQpk57nTExGYhc0Isjo8ssBKViwmGVmJ8m8fIThiWkvRA459liHxAwC0Sg69HX93p-Wx0N1mTcUABFU1TAATWtkW7efDHxbOrIKe-AInk6z3-w8PzAiCNraVg+TKU+nt8sjvWEsZ2PjfZ4YAFlMANE0tF5rvbfcrOHYl70ZMCDWwhCUJLmOPyP32b0gnku5AjuT4I4GqyW4N5mjbZ7RB975B++zA0dQACUUYx+5kUZRezgTIkCo5APJeWWQ+VI-Ng520jbJkDWdw1bRC3hpeKxU95MAgDhZQqAWBEG6GABMsoqBQggIwYQpoxpYimFbZQuhzSSDTBqKQBhH6jzOspL8yk-TeEyFyAoP9iaRH-pPGCxdQqHHrn8KGusd5QJjhAGBcCEFIJQdKNBlAMFYJwXgy2GgVBENECQnE6ZMxmA8MPWqmN3zBFSI9HwtI1YUw9GkV4IEuTGKYDBV4uNupeh+A3JaTdBF-SZqI6c8DEHINQX0WRYBsG4Jtoo2YhDiHaHUWQihgQdFi2fgYoxJilY+HMe8ekNx-JnCel-UxLJIKbxcfwtxkCPGQC8TwHxEj-H3iYN0AAFpNKA2Fzx4VmqudiC1G7bzKcNTxsDvHiL8VIgJjTmmtNYvOZG+00bHSfhLVI9wnohTSQGKI8F4isPCLJd2xwPwHO5MUmKpTfr9IqYMqpwzJGIjqeMyUkyLz4SIIRTKYNsoQx6RAs5cMLliN8TcxMdymkPN0m0tiTk9pVSsJQ18WNBJ-nAvcTquMoJRG+FYiwBiyYU0+PLIOnUqzgJ+qtc5IjLnVJGbc9B3QSB3klOoCAl8OIsSeR0+aZkSm9J+a3cl-yamjLuXS7gDKmUspwk8mZ0LYV1Xhb+b0uyHGfxCJkzwpx0jvEgoBN29wji8N7Fy75pLfl8qGQC2pNLhXtEZcy7orL2kgzeeDXKkMTncuNbyyplLAXSPqVa0Vtr7UQsqqjQ68SFm5z-I9FkFcgj5CAoUdefloLJLWUsqCxwlnEphtHVoFTugrQAOJ0BYLgWArAOBkuRKiUYExtB6EMKIXQyBFCFqbTgvmY0pAyr0Z4EmBccjew1r+NWVjghKyYHJcdVYyQhDJNmqOu9hH1KLSWstgSFRWxTIsRQ8ibbyB7TnOV2rbFeiDuOpsat8hWLJA8YIkEoKfyHWEBdzchF5pEQWuixaEHrvYJgoJe6tA6AMKoJtLaxrqBMMgZQh7EkFGZO9PIiL-IUysd6dIgZS51heGEKKxz+pGoZtAr9wof2lvLaWwZ7QEZbRmsuOaXTOVuqI7mwQ+bV2-so7gajkpaNI3YijVyYb0ZULlf20SbZ2yAWQ6O4mQF0hnDksFT2vUCPfRzUuj9K7v1ru47xqA-HtrAxeRlLKOU8quPdcR5dpH6jkfXVR+lhmAaI22lK0NMLM66KPe+CT0RB0yZHcEKxhSgoPvktkbVRSeyUFQBAOArgvkkohKJuFOwAC016GxZZdjkQMk9uoBDSO2V9gi2DlIgGl2VOwoh+SDrY8k-5DGe3jUAtTfCWMpbY+OC1R6fOO0gi7JZVYpPVxCL-dIcbh2xHluvD0ZW+lw0eXharvaEDe3SBXKCysQoGNiJkKSyyLiT3XqkxqjDFs8tjJM1Ka3fOeBZB4HF8lfBXU+Id4mORmRyV1R+MkLx9XJc0++-6dFAbbXuwJZ4z215tjbO8SeytMVViCq8JZCmPQY6ux6veUPvLCX2HQl4DCmEtkVnkR4tJDHUxgtBGIOObPaYpdcvr+OzpoqCpForjCK7k+ai2AO1OK53GEt7I5nXCPda0+x01VzzWCvQf+xg7O5WXADl4RN1IqZ3CsSEZ7+28gBXHZPIHVnWMy4GfyqlQKaUgpaWCqZqudgBlasY0KhjGGHHHUTG4FcogZFElG8X53Gc9b+WagV1KZG0rAM5m14rwXzmd4gV3sOTGe-JMYu6zVTgPA9MYxhzC0l3DD5bjjumuMp4QJz4nPOycsL9x9F2jVaThAB+OsvoPPF2foA5yjlaTXV8-s9pT1PLhB0imOtWLsjjB016FPGXfKs6bI3pwJw-PZ+Ggv+TXmvZZhHQ6cNHXIs8XHjd2SXGnF3d4r2vrjrAePOaM-AeZYmdg0K5-Q04Df0NHAOHJFWI1L4EGCUEUEAA */
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
              actions: ['updateContextFromDiscoverDataState', 'emitDataReceived'],
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
          dataSourceSelection: _context.allSelection,
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
  publicEvents$: Subject<LogsExplorerPublicEvent>;
}

export const createLogsExplorerControllerStateMachine = ({
  datasetsClient,
  dataViews,
  events,
  initialContext = DEFAULT_CONTEXT,
  query,
  toasts,
  uiSettings,
  publicEvents$,
}: LogsExplorerControllerStateMachineDependencies) =>
  createPureLogsExplorerControllerStateMachine(initialContext).withConfig({
    actions: {
      notifyCreateDataViewFailed: createCreateDataViewFailedNotifier(toasts),
      notifyDatasetSelectionRestoreFailed: createDatasetSelectionRestoreFailedNotifier(toasts),
      notifyDataViewSelectionRestoreFailed: createDataViewSelectionRestoreFailedNotifier(toasts),
      redirectToDiscover: redirectToDiscover(events),
      updateTimefilterFromContext: updateTimefilterFromContext(query),
      emitDataReceived: createDataReceivedEventEmitter(publicEvents$),
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
