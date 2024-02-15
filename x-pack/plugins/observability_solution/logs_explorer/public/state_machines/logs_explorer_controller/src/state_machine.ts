/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { QueryStart } from '@kbn/data-plugin/public';
import { actions, createMachine, interpret, InterpreterFrom, raise } from 'xstate';
import { LogsExplorerStartDeps } from '../../../types';
import { ControlPanelRT } from '../../../../common/control_panels';
import {
  AllDatasetSelection,
  isDatasetSelection,
  isDataViewSelection,
} from '../../../../common/dataset_selection';
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
  redirectToDiscoverAction,
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2VYFEAeAHANqgE5hEDCqAdgC5Gr76kB0ArpQJYfXsCG+7AL0gBiAEqYymAJIA1TABEA+gGUAKgEFVmRWQDyAOQ1T9mUQG0ADAF1EoXKljtuVWyGyIATBYAcTbxYAWAGZvDwBGADYLIICAdjCAGhAAT0QATgimNLiogFYPb1iPWO8ggF8ypLQMHAJiUgoaOgZmTidefgFOKGUwRgBjZ0phYylVKXVkKQAtbXlNdUUZKUwAdUsbJBB7RyHXdwQgtIsmXNjc7yjvSP8g86TUhGCgpgsvNKCIj1y0jzTc8qVEDVLB4QgkchUWj0RhEJhtbh8QTdXoDIYjfRjCZTWaKeYaZSYVQbVw7douLYHCIBLLXDwBALeAGxeIWCIPRDPV7hCwWfLHXIRbwMipVdCguoQxrQlpwhEdZGUHp9MCDdhUYT49SE1QqTDICTjAyKcRqXTiRQAMXUUmQAFVxCStmS9pTEABaLyxJgsjxBIJhAIREIRXJhIIcw5eU5+o4Mj7+Qqi4Hi2rghpQ5qw+FcBVdJWo1XorXLNZ6g1kI36E2YM0W622h2YJ12Bzkyj7D3hDx+JkXQMWeJHJmRsKFH1vMIAsIeP3BNLJkFp+qQpow1q5pH5qDyHjUHgydhgADuwggVDAOYAbqgANaXpdglfSrMb9pb7q7-eHk8ITg3-o93VSgNhbbY21dUADjuF5AjZYVzmpPlckjWJeVebxvDSNJAzuNlokXVMnylTN1zlTdOk-PcDyPU9SDoOECD3AAzYgAFsmEfSUMzXWUc3fSilS-Gjf3-VBAKGUDrFJCDgM7BAhW9AIPAiMIxzCWJ-gyFCUkQfIewsY40niRD6X9QiamIniZWzeUPyE6jYDAagzwva87wfIjuNXGy30RQSd0c5y-0oACgKoKTNlbXY5LdBBPR7WI8jucMx1nAINNQ9CfGOCJsMHf1vgsiV0x819yIExVAv3JyXPo4gmCY6hWKIDiuNKl8yP4-yquE2qQrCyTrDAl1Yqgj0xzSJhGUHNJhUHTTonZXSEFKb0+Q04yZwiL5BWK5cSN42yKKqzr8AABR4Sg+lgVzrvc+9OK8jrSL4uyArOy7rvwWABvE8KQOG6TnVkilxoQIcsmM0oMu+M5ikjS4aV5RlSmyT40IifarLKrr3tO16vpu4R6sY-AWPYp7LO8s7jsq7dPqum6-ok4DIpkmKwbcRB4hpHb+z9McfBnRG+Wm2JnlUgNDPCbGadeumeqECAxAkaQ5DxKRlD0ORREUdRzvOlQNC0EbQY7OKLhODLDIDKIVOyUcgkM04ggKakVIscMdrll6jr8vMRHESRZDmLWddMPEFmNzRm2B6L23ks5cj8YNsjDX5lNHM4Xmwlk2R+Ha2SxoF2ufBWA63IO1dDxQAEU7VMABNGPTfj8DOYt8HBV8M4wjZWIA0QoVRwZGlfkCMNvkHL3cl98v-YqpXq5DjXxgAWUwS1bS0PWN7jqKO8TuKoimv1CiSnD-QltJRw070zkHKcQgCXI3m8efDt8pfA5V4P1e0PvbeyBd41ktKaAAEooYwu8ZCTDNp3JOAImB3FyEGWaXsdqxFHIEXwmExwZWUv8fIsRP7WXKt1X+TAIBBWoIWNUVB4QQEYMIO0518RzAWDqcshopAGAQcfcG21Mi5ELgEPkfxvhxEjHcKaGQ1IxE0mpLBZDcZvROsrahtD6FDCYSwthHCo4EiJDwysfD9BmDCIfUaXMDipReGGII+Qdr-A0jtSMb9ErZEHMUQyHwfiqNppXTokAtE1Wcjo4CeiwCsPYbHIx2oTGEgrFWMwHhrHm3klOcITAhQBiZOGT4vwPCoTQlkIWTjjhMnCAuUuz0F7f0oVXCAYSeC1UiYw-oAALK6UAqLflondS8YlHply-hQ-GmiaHhLoSqBhlAmDdN6f0kSx4WYA3ZiDRBcUZxHBQeGa4eVZ6BmwStXaKC0IfDQmEbIeUwiBIrj-ZprT2lzN0UspUKyfx0SIAxRq5NmqUzGeQvGGjQnTLaREt5USPl9IcgM0SoV-pDSsAIyC3MEC7KmkGYUU5eRu0DKhaMCjrjbVRqIh5i8mkhJaRC15aIYUkCAkqdQEAIHiWEt8oZD1PLUz9o0yZ4LtHQs6Uy7gLK2Ucuot89ZKK0VjQxYUh+vwkoEupIVSMVSYylE+EGSIdzKUCrBbS4VDLRVgGZVAVl7L+icsGaTf5FNWpUxKg0iZxqXlQrNQs-oYrujWqlQitZYlWYRSBhk7ZQj-S+E9oPAoeKsLeBwYOXshkviLQkQEQ17r6ahP6K9AA4nQFguBYCsA4MajEWJJgzG0HoQwohdDIEUAWxtbD9bnSkPK2xiBwzoV+GpRkTjBQsiTStXZKdMIRBKPBfwXx7l1L5W60FuaWn5t4kW1AJay3sGYTErUSwVirEUAY2O8hu1d0VTOKaZxCjFEZGhYIY7HhTkDNNfI1w0EMnpElbNK7l5rsLcW0t0TYmGPraoRtzbzrqBMMgZQF6smfB7ACTBdxziYWzm+1+8av3KTiICMUS7xn-qoeumUm7t2sFwNM7ojNvq3XPPdEZvLXUkfUauxZQGt0gZLbRpU9HmYho2eGjmgjFVHBeF8YUoQ+4XE+E7YUtJZPCn+C-BdRG2Mgo4wBrjG7gNlr45awTP0Sa-Iak1FqbV6nscVmR7jVGjPiqgCZ36wm5XtxsZeuxcYmB-GpPkDSbxxEBCdipPwBQfCXHDMZZSFQgSUFQBAOArhgVqNhGJ9FBxPRRF7KI644ihxzR0o8d0JwARYQDGGL4AZX21M0wdbT2Y2CCogJlhV2X3hMH7gUcIM5Cj5DuHfOR9JAzTvRv8Nkf6dN5hRCKy9Xn5KzimnGP06q-SGUjPerIO0pxzVCKp84027P2Wqqs9rPanhvFydcZ2xldWv2fXpOI3Ji7+iFPSM4x3gm9VoRd7ziAYjdeFHcOIRQfAZVER4oMqcihCkDH8DIhGUzEaaz9hmhMmY-X+-JEMfhUHBmeKSkpK1ou0kDAESbMQcIlwazjIJTyaU452W8XOcbgxv37iUEnjxLg7f7nklSGH-jfcZ4IIVMyOkLcySzoo3X4J-BCOcDGW3fjTVUpEZSgZCgIVF9S8XJrJfzeiczoRM4TgC9CAmZX07IziJ7P3V+8R8gAjDBplHWn0vo4l5C2Z3rFk9M+fC87WzxN2Kd1kJxL9fiZ0SGcv0KC4hhkHphQyXs9etc9X7osjKLXOYDba6VtFTeKouOPPCM0kpFx5+kNkpxAg09KG8Y47u0sM-15o8jzRKOlpL3Yp+WR2dOK9oOUId9GQoMuNcL2akWR3Azx6rv9Ae+GYrauvvvb+unEFH44MhPwyjm+Hg4M6HRHziKAvzjS-8Ar5N6HrLvaAtZGKDcjNGkIzjpCD2DIqNpZfF2pfrptfrfk5nRpjgxhvpimpHIkPpzqPjXpiiECcF4MLGhHegULUhUEAA */
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
              actions: ['storeDatasetSelection'],
            },
            INITIALIZE_DATASET: {
              target: 'initializingDataset',
              actions: ['storeDatasetSelection'],
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
              target: 'initialized',
              actions: [
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
            datasetSelection: {
              initial: 'idle',
              states: {
                idle: {
                  on: {
                    UPDATE_DATASET_SELECTION: [
                      {
                        cond: 'isUnknownDataViewDescriptor',
                        actions: ['redirectToDiscover'],
                      },
                      {
                        cond: 'isLogsDataViewDescriptor',
                        target: 'changingDataView',
                        actions: ['storeDatasetSelection'],
                      },
                      {
                        target: 'creatingAdHocDataView',
                        actions: ['storeDatasetSelection'],
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
          datasetSelection: AllDatasetSelection.create(),
        })),
        storeDatasetSelection: actions.assign((_context, event) =>
          'data' in event && (isDatasetSelection(event.data) || isDataViewSelection(event.data))
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
        isLogsDataViewDescriptor: (_context, event) => {
          if (event.type === 'UPDATE_DATASET_SELECTION' && isDataViewSelection(event.data)) {
            return event.data.selection.dataView.isLogsDataType();
          }
          return false;
        },
        isUnknownDataViewDescriptor: (_context, event) => {
          if (event.type === 'UPDATE_DATASET_SELECTION' && isDataViewSelection(event.data)) {
            return event.data.selection.dataView.isUnknownDataType();
          }
          return false;
        },
      },
    }
  );

export interface LogsExplorerControllerStateMachineDependencies {
  datasetsClient: IDatasetsClient;
  plugins: Pick<LogsExplorerStartDeps, 'dataViews' | 'discover'>;
  initialContext?: LogsExplorerControllerContext;
  query: QueryStart;
  toasts: IToasts;
}

export const createLogsExplorerControllerStateMachine = ({
  datasetsClient,
  plugins: { dataViews, discover },
  initialContext = DEFAULT_CONTEXT,
  query,
  toasts,
}: LogsExplorerControllerStateMachineDependencies) =>
  createPureLogsExplorerControllerStateMachine(initialContext).withConfig({
    actions: {
      notifyCreateDataViewFailed: createCreateDataViewFailedNotifier(toasts),
      notifyDatasetSelectionRestoreFailed: createDatasetSelectionRestoreFailedNotifier(toasts),
      notifyDataViewSelectionRestoreFailed: createDataViewSelectionRestoreFailedNotifier(toasts),
      redirectToDiscover: redirectToDiscoverAction(discover),
      updateTimefilterFromContext: updateTimefilterFromContext(query),
    },
    services: {
      changeDataView: changeDataView({ dataViews }),
      createAdHocDataView: createAdHocDataView(),
      initializeControlPanels: initializeControlPanels(),
      initializeSelection: initializeSelection({ datasetsClient, dataViews, discover }),
      subscribeControlGroup: subscribeControlGroup(),
      updateControlPanels: updateControlPanels(),
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
