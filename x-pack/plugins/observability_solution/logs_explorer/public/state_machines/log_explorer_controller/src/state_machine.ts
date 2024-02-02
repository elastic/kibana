/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { QueryStart } from '@kbn/data-plugin/public';
import { DiscoverStart } from '@kbn/discover-plugin/public';
import { actions, createMachine, interpret, InterpreterFrom, raise } from 'xstate';
import { ControlPanelRT } from '../../../../common/control_panels';
import {
  isDatasetSelection,
  isExplorerDataViewSelection,
} from '../../../../common/dataset_selection';
import { IDatasetsClient } from '../../../services/datasets';
import { DEFAULT_CONTEXT } from './defaults';
import {
  createCreateDataViewFailedNotifier,
  createDatasetSelectionRestoreFailedNotifier,
} from './notifications';
import {
  initializeControlPanels,
  subscribeControlGroup,
  updateControlPanels,
} from './services/control_panels';
import { changeDataView, createAndSetDataView } from './services/data_view_service';
import {
  redirectToDiscover,
  subscribeToDiscoverState,
  updateContextFromDiscoverAppState,
  updateDiscoverAppStateFromContext,
} from './services/discover_service';
import { validateSelection } from './services/selection_service';
import {
  subscribeToTimefilterService,
  updateContextFromTimefilter,
  updateTimefilterFromContext,
} from './services/timefilter_service';
import {
  LogExplorerControllerContext,
  LogExplorerControllerEvent,
  LogExplorerControllerTypeState,
} from './types';

export const createPureLogExplorerControllerStateMachine = (
  initialContext: LogExplorerControllerContext
) =>
  /** @xstate-layout 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-wKx4Tkl8LIxC1m5NVN8Hmr90g-W8kEWhhyRZhJ6RcXsl1aCDNgCwdgJzxZCCMJISyFVJAAC0tC6AMCIHQyAFCXUZdjMC9pJAp3SYgWevgepajReYKI2QZIXlft8AiKEULULkvEHIGLIasLrji9seLUAEpbjAruChpCSAwAAdQUNjDuchuW1VKLkCsgR8gakzCiTCJZCgvXQt5SsBQZIglir7SRITXkksmqq806rNXQLbiavG9KVCMuZfaC6ZNbrTJHtfdmBR76ZgBHsjZEQLwtWhJEX4vUCyoiyKUn1wTOn+rFoG3F+KcCEsGVcpc-ZXQtKmG0iRFaXmB1kUGrYIb62XOGc2lcUYEkAq0Sk5NPKEB8sYAKn6g0YjRDFeQwavgERotBNYgimEbHPMxW8mtaq60Nu+T2dsLbBw+OHKOcck5fWVp7U4vtdAB1nqbb2K9-zNFTKndg2qc6F1CpFSuzwTrLXPTdXyl+FiKiGgoKgCAcAXAHqVUC2ZuCAC0sKIT4SPMUIGt9MwoX-rYwBT6mCsCPRADDNNcFoqdYiAjJRBoPgiMURV68sU2kFEIujo8GP6Mov4dIEqMyyvFRkYIpEwgFjiPeco5aKPdtrvyW0X7R3wCwcC8S3kLxAikpRVEapqzZHUlx6RNGBMpoQFqaEAI9SzxkreAiRFIhSX+DmVFhZi2REsxUgN7DQ6RJVjZmdhYMiOe5nEDjaLCK5NzFJAi3NCj9TLq-ALxzq3BYbucuWqMfmfJwdO2qionrRec3FtzuSZPoX5lhYotDb5kbQ9xmjvTitarAOFi1sQMiKhzPM+sqprEXjwqpP4Xg3VogBjzLLVbN65fkf02p7jlGNK8b18S5WYR8yq65hLLtMK+BXc1bCtDCgHOUyNVTyrTnVNcbUxtwy+OUm23Mp+N5EQ+DLlWe86zVQVgiADB8HmeZloAbdw9QXGCvrwO+j7uDIt7ac7Fw7Bn+ZHjzH8bNAVGE3eFkqnjx7g2nqJdZnTmH3iglUtWKIVYsjNT+OKjOrUxPAjhAWdFhPq5Wdh-D993WkfIXClJUbcIp4YXA2u4VaE9R-185eCVC3n0qtrRqwdL2fkjsjNpnR9GFS0NRzFlzJajseBauWRr1jwgxDzPkeDZQgA */
  createMachine<
    LogExplorerControllerContext,
    LogExplorerControllerEvent,
    LogExplorerControllerTypeState
  >(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'LogExplorerController',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          on: {
            RECEIVED_STATE_CONTAINER: {
              target: 'initializingDataView',
              actions: ['storeDiscoverStateContainer'],
            },
          },
        },
        initializingDataView: {
          invoke: {
            src: 'createDataView',
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
          states: {
            datasetSelection: {
              initial: 'validatingSelection',
              states: {
                validatingSelection: {
                  invoke: {
                    src: 'validateSelection',
                  },
                  on: {
                    LISTEN_TO_CHANGES: {
                      target: 'idle',
                    },
                    UPDATE_DATASET_SELECTION: {
                      target: 'updatingDataView',
                      actions: ['storeDatasetSelection'],
                    },
                    DATASET_SELECTION_RESTORE_FAILURE: {
                      target: 'updatingDataView',
                      actions: ['notifyDatasetSelectionRestoreFailed'],
                    },
                  },
                },
                idle: {
                  on: {
                    UPDATE_DATASET_SELECTION: [
                      {
                        cond: 'isUnknownExplorerDataView',
                        actions: ['redirectToDiscover'],
                      },
                      {
                        cond: 'isLogsExplorerDataView',
                        target: 'changingDataView',
                        actions: ['storeDatasetSelection'],
                      },
                      {
                        target: 'updatingDataView',
                        actions: ['storeDatasetSelection'],
                      },
                    ],
                    DATASET_SELECTION_RESTORE_FAILURE: {
                      target: 'updatingDataView',
                      actions: ['notifyDatasetSelectionRestoreFailed'],
                    },
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
                updatingDataView: {
                  invoke: {
                    src: 'createDataView',
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
        storeDatasetSelection: actions.assign((_context, event) =>
          'data' in event &&
          (isDatasetSelection(event.data) || isExplorerDataViewSelection(event.data))
            ? {
                datasetSelection: event.data,
              }
            : {}
        ),
        storeDiscoverStateContainer: actions.assign((_context, event) =>
          'discoverStateContainer' in event
            ? {
                discoverStateContainer: event.discoverStateContainer,
              }
            : {}
        ),
        storeControlGroupAPI: actions.assign((_context, event) =>
          'controlGroupAPI' in event
            ? {
                controlGroupAPI: event.controlGroupAPI,
              }
            : {}
        ),
        storeControlPanels: actions.assign((_context, event) =>
          'data' in event && ControlPanelRT.is(event.data)
            ? {
                controlPanels: event.data,
              }
            : {}
        ),
        notifyDataViewUpdate: raise('DATA_VIEW_UPDATED'),
        updateContextFromDiscoverAppState,
        updateDiscoverAppStateFromContext,
        updateContextFromTimefilter,
      },
      guards: {
        controlGroupAPIExists: (_context, event) => {
          return 'controlGroupAPI' in event && event.controlGroupAPI != null;
        },
        isLogsExplorerDataView: (context, event) => {
          if (
            event.type === 'UPDATE_DATASET_SELECTION' &&
            isExplorerDataViewSelection(event.data)
          ) {
            return event.data.selection.dataView.isLogDataType();
          }
          return false;
        },
        isUnknownExplorerDataView: (context, event) => {
          if (
            event.type === 'UPDATE_DATASET_SELECTION' &&
            isExplorerDataViewSelection(event.data)
          ) {
            return event.data.selection.dataView.isUnknownDataType();
          }
          return false;
        },
      },
    }
  );

export interface LogExplorerControllerStateMachineDependencies {
  datasetsClient: IDatasetsClient;
  discover: DiscoverStart;
  initialContext?: LogExplorerControllerContext;
  query: QueryStart;
  toasts: IToasts;
}

export const createLogExplorerControllerStateMachine = ({
  datasetsClient,
  discover,
  initialContext = DEFAULT_CONTEXT,
  query,
  toasts,
}: LogExplorerControllerStateMachineDependencies) =>
  createPureLogExplorerControllerStateMachine(initialContext).withConfig({
    actions: {
      notifyCreateDataViewFailed: createCreateDataViewFailedNotifier(toasts),
      notifyDatasetSelectionRestoreFailed: createDatasetSelectionRestoreFailedNotifier(toasts),
      redirectToDiscover: redirectToDiscover(discover),
      updateTimefilterFromContext: updateTimefilterFromContext(query),
    },
    services: {
      changeDataView: changeDataView(),
      createDataView: createAndSetDataView(),
      initializeControlPanels: initializeControlPanels(),
      subscribeControlGroup: subscribeControlGroup(),
      updateControlPanels: updateControlPanels(),
      validateSelection: validateSelection({ datasetsClient }),
      discoverStateService: subscribeToDiscoverState(),
      timefilterService: subscribeToTimefilterService(query),
    },
  });

export const initializeLogExplorerControllerStateService = (
  deps: LogExplorerControllerStateMachineDependencies
) => {
  const machine = createLogExplorerControllerStateMachine(deps);
  return interpret(machine).start();
};

export type LogExplorerControllerStateService = InterpreterFrom<
  typeof createLogExplorerControllerStateMachine
>;

export type LogExplorerControllerStateMachine = ReturnType<
  typeof createLogExplorerControllerStateMachine
>;
