/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { actions, createMachine, interpret, InterpreterFrom, raise } from 'xstate';
import { QueryStart } from '@kbn/data-plugin/public';
import { IDatasetsClient } from '../../../services/datasets';
import { isDatasetSelection } from '../../../../common/dataset_selection';
import { createAndSetDataView } from './services/data_view_service';
import { validateSelection } from './services/selection_service';
import { DEFAULT_CONTEXT } from './defaults';
import {
  createCreateDataViewFailedNotifier,
  createDatasetSelectionRestoreFailedNotifier,
} from './notifications';
import {
  LogExplorerControllerContext,
  LogExplorerControllerEvent,
  LogExplorerControllerTypeState,
} from './types';
import {
  subscribeToDiscoverState,
  updateChartFromDiscoverAppState,
  updateDiscoverAppStateFromContext,
  updateGridFromDiscoverAppState,
} from './services/discover_service';
import { subscribeToQueryState } from './services/query_service';
import { ControlPanelRT } from '../../../../common/control_panels';
import {
  initializeControlPanels,
  subscribeControlGroup,
  updateControlPanels,
} from './services/control_panels';

export const createPureLogExplorerControllerStateMachine = (
  initialContext: LogExplorerControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCBhVAOwBdDU88SA6AVwoEt2q2BDPNgL0gBiAEoZSGAJIA1DABEA+gGUAKgEEVGBaQDyAOXWS9GEQG0ADAF1EoHKlhsulGyCyIAtACYAbIwDsAIzmAJwAzH4ArAA0IACeiJ5+AByMwZ6hnokALD6e5kneAL6FMWiYuATEZJQ0dAyEjByOPHz8HFBy3FTc0mxgAO5CEJRgjRQAbqgA1qNl2PhEJOTUtPRMTVy8Au2d3b0DCByTAMZdbJQWlpcudg5OFC5uCAGejObentFxiBHBwYyeLIBX5JfLeX7BCLFUroeaVJY1Vb1MbNLZtCgdLo9PqDEi0Br4LoAMyIAFtGHMKotqis6utOC1thjdtiDkdUKd7pdrkgQLdms5eU9sowAqEkn8IuLIUDvN4YvEEFksqE3hFQaEglkperPNCQJSFlVlrU1g0Noz0VATasAArcChgPCwIYjMaTGYU2FU42Iunmhlo9o2uj2x3Ow4TDlnC5WHm2ewCh5Cjy+YLeJJ+cGfTMS96fBWIJJJAKMULa8wZbzmPyfbxZfWG+E003Ii1BjEhvBhp0uvFERiEqgkwjkpvUrttwOtYN+7sO3uRk4xijcqw3RP3R4JPyqgJZDM14sygJywsIXf-TV+LLBEIFXc5Rveo0I2lmlGbVrCMQSGRaORJCUXRZBEBQ1FtW1lHUTR4z5TdzmTUBFRVPwAQCNIkh8UJK08AoYmFUI7zecwQjCdUD01Z9ylfFskXpVFvwgRgICxWAwCoJQnTAY57kYcYtlYrgMS4hheMQoRkCAzQ9AUFQdG0AAJNQ9AAcQwJQ4P5LcUwQYID0YW8wkCLDvDSIFzzlLJRX3fIwmVAIklCUJqLhCc5ynRiBEgFi2I40SeL4gS+CE9oAvEyghAAVVtOQNAAjQ1CUDAVGUDBkHEFRJH0LSEMFUAngfUVwSIiJbJCcFzxLVVwRVEsIkiD4AgCVyfTfVsGK-bzmKE7h2M47iIoofjBLOETBvuIQ4vUZLUuSjLSCy-QFDEVQdDEBQADE1EkZAorEXK7kQ7cEHBUtQjlDCs3ebxr3PTDGGLPD0guu8kgiKESgNF9m0nTrLR83r+vCvi2AgBhoti+KFGmpKUrShalr0Q6kxOl4MzLC6nOrPDa3LKqxUYWrxWBRrPGa1raL+gMvMEHq-IGsTQfBsApsS2aEcy7LZNW+SNu23b9owFGdIKxBgXBQzXvMdJlQiGWsgJmqIjq0mIialqvvHX1308rq6d87pgYmxCWBwULmSxfZBmGR13WmWYfvc3X-rRQGGZB03mHNsbMT2HEl2jLk43XXltOO3THOcomgTyC6KPSe700YCEsPTeXkgPSnfo812mMNvr-JNygzYtv3WVxQh8UHPBiTJL0aJzl2af192jaLpmvZ94Ty+twPOUQtdrDDvKkNccX0xSeWyNCCjboCc8gkhN40nskqa1PbPnY6luAeY4451U2hvdgFh2GnbqhCMSQsrUKSAC0tF0AwRB0ZAFFU1+YvA21JBFiOxYIDzACQEGFPjKhJkkRe5YIiGTIr8MBMsihaydjrHen496MAPu+I+qAT6NBZmzdQChpCSAwAAdQUDFaa8h-75XHs8QEvh0hXW1D4DUfhF5Smsk5XhiRnqz0+jCRu296K7zdvvQ+x8cCnzBhDah0Nn4qFfu-W0Kl0qaVDgmI69Cnhim8GhNIPgaxhGCC8cmXD9KGX3BmPwdj8i3iEd9ERaCxEYIkVgqReCZGl19l2HszpXR23ZJ6bW7U3Htnztg00uD8HezLv4hcEZ2QD1jFcLR8EdFjz0cEPw5g3gZEBLPJIlEF7fGeFmFI4I7zq13GZRImthFuVcf6dxUSvFxO7rOd8AS+xVwHEOEcY5UHhNaZE7qnicHSNPvEvxc5en9xXEPDcWS0Z+CsSUlWoIkFpBvIvQIsDSLlneumMyaRPpfQoKgCAcAXBhLov6FZqNdLuBvP4Je4QviKnWf4CUwRMwyw+vLF4W8WkflYOMumTzRYMJyIvAxAI-l-GRSi5BTS2oPI-JCnYVscTQoAQw9wpY5aagLOU5U+TM6-FntqYpeoUEuNGVii+VpEnhngCPVZLy8iGSzOrQEKK-j4XKYEay15bz3gMeWel6Kqa53EUxfFuifgRFeOmOO5NfhAm1OeIEpZyZmJJsTIioKmV60wUDDugUCXh2VadSsZZLq5OrHKO65SGqlkCGYrMnyXh-FNZi81HjLWM2tSXYKYNfae3oba7JiBAh7gcUc2qeROHlOqehTC2FcIFADdTNpEyQ3RuGnIsASq43PG1GhPCAR1nvXrOYA8UD031hslkOy5YgRORcgy5pZq86Fo9sXYasye4smtuWtGp40LAiIuKOt+knJJzFdhNIwIjxZ17Ri-NkKfLRNWLEmRk7dLVnyeq3CwJ9L7i+eLT4M6LrVgwv8jIqq83yoLQbfddBD0zPPrTSAx7AH1hSOejIl7tU3ueFjUU8dyb1KQW+5uH690dJ8aWwDDDZ3-E8OmfcuSZYy2bYqMUyoiawdPGkBDW65VId3ZIqZ3iZldM7PMpJHLtHPMAUvatfwQifA+iWOx8LiJHKyCcuUfxPjFGKEAA */
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
              actions: ['updateDiscoverAppStateFromContext'],
            },
            onError: {
              target: 'initialized',
              actions: ['notifyCreateDataViewFailed', 'updateDiscoverAppStateFromContext'],
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
              src: 'queryStateService',
              id: 'queryStateService',
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
              actions: ['updateGridFromDiscoverAppState', 'updateChartFromDiscoverAppState'],
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
        updateGridFromDiscoverAppState,
        updateChartFromDiscoverAppState,
        updateDiscoverAppStateFromContext,
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
    },
    services: {
      createDataView: createAndSetDataView(),
      initializeControlPanels: initializeControlPanels(),
      subscribeControlGroup: subscribeControlGroup(),
      updateControlPanels: updateControlPanels(),
      validateSelection: validateSelection({ datasetsClient }),
      discoverStateService: subscribeToDiscoverState(),
      queryStateService: subscribeToQueryState({ query }),
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
