/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { QueryStart } from '@kbn/data-plugin/public';
import { actions, createMachine, interpret, InterpreterFrom, raise } from 'xstate';
import { ControlPanelRT } from '../../../../common/control_panels';
import { isDatasetSelection } from '../../../../common/dataset_selection';
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
import { createAndSetDataView } from './services/data_view_service';
import {
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCBhVAOwBdDU88SA6AVwoEt2q2BDPNgL0gBiAEoZSGAJIA1DABEA+gGUAKgEEVGBaQDyAOXWS9GEQG0ADAF1EoHKlhsulGyCyIAtACYAbIwDsAIzmAJwAzH4ArAA0IACeiJ5+AByMwZ6hnokALD6e5kneAL6FMWiYuATEZJQ0dAyEjByOPHz8HFBy3FTc0mxgAO5CEJRgjRQAbqgA1qNl2PhEJOTUtPRMTVy8Au2d3b0DCByTAMZdbJQWlpcudg5OFC5uCAGejObentFxiBHBwYyeLIBX5JfLeX7BCLFUroeaVJY1Vb1MbNLZtCgdLo9PqDEi0Br4LoAMyIAFtGHMKotqis6utOC1thjdtiDkdUKd7pdrkgQLdms5eU9sowAqEkn8IuLIUDvN4YvEEFksqE3hFQaEglkperPNCQJSFlVlrU1g0Noz0VATasAArcChgPCwIYjMaTGYU2FU42Iunmhlo9o2uj2x3Ow4TDlnC5WHm2ewCh5Cjy+YLeJJ+cGfTMS96fBWIJJJAKMULa8wZbzmPyfbxZfWG+E003Ii1BjEhvBhp0uvFERiEqgkwjkpvUrttwOtYN+7sO3uRk4xijcqw3RP3R4JPyqgJZDM14sygJywsIXf-TV+LLBEIFXc5Rveo0I2lmlGbVrCMQSGRaORJCUXRZBEBQ1FtW1lHUTR4z5TdzmTUBhVCdNRX3QEQmSbUknPCJAn8IJawiTxgm1dIoRKA0X2bSd6VRb8IFEcQpFkBQAEUAFUTAATWgjQMDg-ktxTBBMIiRhiyzcUpSzSJz0fRhvACPws0rEsIgietn3KV8WyReivwEH8WP-BQVEkABZDAADFJGQTQwIs6yhIQwVkISVDzDecwQjCdUD01PD0kImtPlI8jQkomFdNoucpwY4ymN-VitGc2z7MchQxBssQlAACQUIxHOkNRkFcu5EO3MSvJ8vyoqSQKAnPLJIlC4iIpIqKdLhCd4sMy1hDUORFDshyTAqpNqsBNJJJUrJzBVDNwSyc8AheVV028YIkk1ZScz1Kjx19d8EqMwQIEYCAsVgMAqCUJ0wGOe5GHGLZrq4DEHoYZ7EKEZAgM0PRzJ0bR8rUPQAHEMCUSaRI8hAyN8W8wkCJIfDSIFzzlLJ0IWiVyyBXbQh6n031bAa0UgK6bru76npet6+A+9p6d+yghE4205AEhQefUJQMBUZQMGQcQLP0OGqtEh9RXBVCIn3Xz0y+RUS1VFbxWBSIPnW0m9LogNEoumnulu+7HvZihXves4vst+4hH5tRBeFwWxdICXgbylQdDEBQbLUezOLEKX3NcRBwVLUI5QCYI1Lla9zzSFJi08dHQhju8kk0-W4tOynGNN7hzbZl62AgBhOe53nnddkWPa9sOkIj54fBSTOMxj8x09rctz3VpSIhVDSdc8PWjpovqC6N87qY+ku6YdxDGkrsAnY0F2hYb8XJH0bKYd9-3A+D0P115YTpYR4FwUYJa73SZUIh71bvgQQfNdHrTx4CPPp4p2eg1LoL1LsvSgLAcAs2ZFifYgxhiOndNMWYU8ToAM-EA4uoCfovWYJAu2mI9g4iXNGLkcZz4JkquHJ4ARiZKSBHkGOAV0jJzQhCdGKsjwHj-qggygCqbANphbbBK9cFQIIayXEhB8SDjwMSMkXpYr-14eg-hmCl7CPAaI-BLJYHEM5IhNc1gL5uRbtQ9MKRn71QCt4IKb8giQjeGkMIB4pQ1lPNw8myj2xF2OHOSGtBcGwBYOwacSUhBGEkBZMqkgABaWhdAGBEDoZAChIZJK5uBW0khm7VTzACQEcdPjKi1rhOx5YJILUlMEQpPciiT0UTw-0KifF+ICTgIJFcq7OwUNISQGAADqCgub83kDk0SLwDwAk1PHcih5whrSlLjXayzEjpwotFaiDTPFNO8UlRgvj3z+NQIE1eVdhm8wSSoJJKTbQQ1FrDch8FKGmMQGKbwfhUiZGrH4MI1TMjNTsb8XGQIDyZlUvkW8GzjrbI-Lsk2BzTRHJOVoz61o5w9mdK6BB7JPTQv0js0J8LWnHPaRAsRXYMWwD0SuQxG5nnVTjn4bylZMgqmsbYxUKkMxDzvFpXc21Ei-3qb1RpsLCXUwRasJFpKUWznfJSoQ-YCSyOHPIvFhtml7MlXQaVQTZWdnRQuCM7J9GxiuI8y+VDXk-KWdqLIoJalpBvGtQIElfLlhzltP4nwPH4rFcbEylkdBsTGo5MZCNASqTeJEGhOdn47R8GtQEyNAhMp2iRfIu5ihUQoKgCAcAXDqv6oQOlU1RLuBvKFVGqtEA-P8HeXyNjVIUSBL6jVrA4WQFLfDVuOQ1rvIBBKP4w6R3pjbcWzVVodE4m7VfVu7hSxP01AWN+ypvLYV+FFbUDVDoxRFTCs6lo5WmkpbOq1CAvDeVauCD4KMR0FAUvuMs807w7XeeWXdmz91+sPfws9LyECaVeOmBh48gX7hrQgVCrxx5hHSKCesORP1FpnpO+egiy5zstQB6sqoY7KXjtWROKk8IEUCHB8wUpULHnHahztAizbqIZivJmFd8GYfDth6qgQ9wQvdStPIfhsa-ABIU9GNiWUFFo2g+jaihHMfAZ0sA-6GXag+enFS6b6yLQzNjeseN8jOKJpnaTXjxUMcXvJq2ZLtEwJncY+l4zTwfOBKhcUPyJT2tCCw3GVZoPAk4XUvdZMf2Fy1cSwJKnRLVm8iBllwIyIQaTfhUUjDfjpeWqZglAbLrarwLq4J9GosI3rCkOLGQEsgsg28lIbySKnjSLUrL-q565Yi6SpTxXW6uf+KRZSt4mV5HTmtQmSlGHjwFU14VIWNWybywV-VaL5VGvgA5st18sIAj+CET4mkSyqX7XeHyHrfhym9ZRYoQA */
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
          'data' in event && isDatasetSelection(event.data)
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
      },
    }
  );

export interface LogExplorerControllerStateMachineDependencies {
  datasetsClient: IDatasetsClient;
  initialContext?: LogExplorerControllerContext;
  query: QueryStart;
  toasts: IToasts;
}

export const createLogExplorerControllerStateMachine = ({
  datasetsClient,
  initialContext = DEFAULT_CONTEXT,
  query,
  toasts,
}: LogExplorerControllerStateMachineDependencies) =>
  createPureLogExplorerControllerStateMachine(initialContext).withConfig({
    actions: {
      notifyCreateDataViewFailed: createCreateDataViewFailedNotifier(toasts),
      notifyDatasetSelectionRestoreFailed: createDatasetSelectionRestoreFailedNotifier(toasts),
      updateTimefilterFromContext: updateTimefilterFromContext(query),
    },
    services: {
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
