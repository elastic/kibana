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
  updateContextFromDiscoverDataState,
  updateDiscoverAppStateFromContext,
} from './services/discover_service';
import { validateSelection } from './services/selection_service';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCBhVAOwBdDU88SA6AVwoEt2q2BDPNgL0gBiAEoZSGAJIA1DABEA+gGUAKgEEVGBaQDyAOXWS9GEQG0ADAF1EoHKlhsulGyCyIAtACYAbIwDsAIzmAJwAzH4ArAA0IACeiJ5+AByMwZ6hnokALD6e5kneAL6FMWiYuATEZJQ0dAyEjByOPHz8HFBy3FTc0mxgAO5CEJRgjRQAbqgA1qNl2PhEJOTUtPRMTVy8Au2d3b0DCByTAMZdbJQWlpcudg5OFC5uCAGejObentFxiBHBwYyeLIBX5JfLeX7BCLFUroeaVJY1Vb1MbNLZtCgdLo9PqDEi0Br4LoAMyIAFtGHMKotqis6utOC1thjdtiDkdUKd7pdrkgQLdms5eU9sowAqEkn8IuLIUDvN4YvEEFksqE3hFQaEglkperPNCQJSFlVlrU1g0Noz0VATasAArcChgPCwIYjMaTGYU2FU42Iunmhlo9o2uj2x3Ow4TDlnC5WHm2ewCh5Cjy+YLeJJ+cGfTMS96fBWIJJJAKMULa8wZbzmPyfbxZfWG+E003Ii1BjEhvBhp0uvFERiEqgkwjkpvUrttwOtYN+7sO3uRk4xijcqw3RP3R4JPyqgJZDM14sygJywsIXf-TV+LLBEIFXc5Rveo0I2lmlGbVrCMQSGRaORJCUXRZBEBQ1FtW1lHUTR4z5TdzmTUBhVCdNRX3QEQmSbUknPCJAn8IJawiTxgm1dIoRKA0X2bSd6VRb8IFEcQpFkBQAEUAFUTAATWgjQMDg-ktxTBBMIiRhiyzcUpSzSJz0fRhvACPws0rEsIgietn3KV8WyReivwESBGAgLFYDAKglCdMBjnuRhxi2MyuAxayGDsxChGQIDND0BQVB0bQAAk1D0ABxDAlCEhDBWQxAyN8W8wkCJIfDSIFzzlLJ0KyfIwmVAIklCUIdLhCc5ynBjjIgUzzMstzbPsxy+Gc9oGo8yghE4205AEhRevUJQMBUZQMGQcQVEkfRoruRDtwQB9RXBVCIn3cwQnBc8S1VcEVQ0yIPgCAJSp9N9W0My0TOc7gLKsmyOooBynLOVz7vuIQBrUIaRqG8bSEm-QFDEVQdDEBQADE1EkZBOLEGak3m8FS1COUAmCNS5Wvc80hSYtPFS4rvDvJJNJOvS6IDKrBBq67bva+y2AgBgup6vrPu+0a-oBvR4ZEuLnh8FJCaK6t8drcstrFJSIj24EDs8I6ydoiqLrRK66ru9yGaZsAPo0L7hs5iapr84GArByHodhwT115YS5tE4FwUYFUifMdJlQid2sklnaZfFOWtIV46qPHX130qozqdq7o6bexCWBwVrmSxfZBmGR13WmWYaPKiPVcYmObvq+PKET5PMT2HEl2jLk41thNZti1xEEK4qlKBPIUfVHJQmxtCIVS9MvewopQ9z8PzspqP1djkutYT5gk5eyvWVxQh8UHPBiTJL1dOV-Pp8ummNfpxfl5c1e05rzlELXaw7ZipCW+edMUi9kIwh77xNXPIJITeGkfKy0ayniVnnKen5j6MGOHOMKtAl6wBYOwac1UhBGEkJNNQ3kABaWhdAGBEDoZACgwpEO6uBW0kheYO35nmAEgI0afGVAHXC3xnjlgkrlSUwQmHuzHjCfeECDJHzVjVWB754GoEQY0HWet1AKGkJIDAAB1BQ3UBryBoc3J4LwDwAk1Ojcih5wh-ylNlIqljEj4wopRQRZVJ4iKgWImBcCEE4CQYzZmGi+oEJUEQkhtpQpjSig3eCTdn66JRn4VImRqx+DCLwzIAQzFkRdvuDMqk-D5FvHY6iQjHH+mcYXCRpopEyKXhXLsPZnSukzuyT0YczpOPbCUtx0iPHlxXtUhcEZ2S31jFcMJ9sdGt3RuYN4GRAShG-r-dhKkMzSzvFpXcRNEgh3sadfSRTWnVVcZI9xSDKndLnDUvsG8BxDhHGOCezSdmoOjqU1Y5TOnHMvj08MsAb4rnvhuCJ80VJpKSNqLIoJ+FpBvH-QIEl1rlhJumImaRKJUQoKgCAcAXBNO2WaP5CNRLuBvIREI4QviKgSf4CUwQSYkQPOkMi4DCkflYLs6muK+YvxyH-bwMT8Z-D5fyv4Aj8kOLuR+FlOxU44jZbQl+7hSye01AWdhyoJnYV+DM7UMzUoMtFZHS0s53xnOlaMhAXgJlZCzEHJK-KCgKX3GWFSt57zcvLHqceBTdUF2qsayJPwSKpA+JWBWvwgTanPKhV4CteEkTlCEHIwQdXYr1S42m89GoypGb6hA1ZVQo2UujasmMVJ4QIoENIGZgS5MSImimxS9mps1umsuzVGYrzPs3TN81Ah7hybC3aeQ-CZV+ACJhqUf5BoKDWlWojC4NvbY9LxYAfUAu1DyksCSSb1nMAeNhioso5TyuWIERUSrupFUmr10c52l0em8iVVcBjLsdqeGJwJULig3WRIq-dspVgjcCI8B4p2HzrY89piCn382rBM9MXdg1kX3KS1unxX0oyBO+9U6M8lYtrSykyTy6AvKOSgqmkBIMv3rCkWDQbgQIbDfMlGKQxTZlPGkfhwHIF4fEeBzpi7yO6KlP8UiylbzZLyPjP+R6lLdwVms9jZ6tm4YefhnjRyL4GtNEax+-zHZYQBH8EInxNLrsHfMt2bxKygt+HKP4nxijFCAA */
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
          entry: ['resetRows'],
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
      },
    }
  );

export interface LogsExplorerControllerStateMachineDependencies {
  datasetsClient: IDatasetsClient;
  initialContext?: LogsExplorerControllerContext;
  query: QueryStart;
  toasts: IToasts;
}

export const createLogsExplorerControllerStateMachine = ({
  datasetsClient,
  initialContext = DEFAULT_CONTEXT,
  query,
  toasts,
}: LogsExplorerControllerStateMachineDependencies) =>
  createPureLogsExplorerControllerStateMachine(initialContext).withConfig({
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
