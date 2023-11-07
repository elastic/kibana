/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { actions, createMachine, interpret, InterpreterFrom, raise } from 'xstate';
import { BehaviorSubject, ReplaySubject } from 'rxjs';
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
import { subscribeToStateStorageContainer } from './services/discover_service';
import { ControlPanelRT } from '../../../../common/control_panels';
import {
  initializeControlPanels,
  subscribeControlGroup,
  updateControlPanels,
} from './services/control_panels';

export const createPureLogExplorerControllerStateMachine = (
  initialContext: LogExplorerControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCBhVAOwBdDU88SA6AVwoEt2q2BDPNgL0gBiAEoZSGAJIA1DABEA+gGUAKgEEVGBaQDyAOXWS9GEQG0ADAF1EoHKlhsulGyCyIAtACYAbIwDsAIzmAJwAzH4ArAA0IACeiJ5+AByMwZ6hnokALD6e5kneAL6FMWiYuATEZJQ0dAyEjByOPHz8HFBy3FTc0mxgAO5CEJRgjRQAbqgA1qNl2PhEJOTUtPRMTVy8Au2d3b0DCByTAMZdbJQWlpcudg5OFC5uCAGejObentFxiBHBwYyeLIBX5JfLeX7BCLFUroeaVJY1Vb1MbNLZtCgdLo9PqDEi0Br4LoAMyIAFtGHMKotqis6utOC1thjdtiDkdUKd7pdrkgQLdms5eU9sowAqEkn8IuLIUDvN4YvEEFksqE3hFQaEglkperPNCQJSFlVlrU1g0Noz0VATasAArcChgPCwIYjMaTGYU2FU42Iunmhlo9o2uj2x3Ow4TDlnC5WHm2ewCh5Cjy+YLeJJ+cGfTMS96fBWIJJJAKMULa8wZbzmPyfbxZfWG+E003Ii1BjEhvBhp0uvFERiEqgkwjkpvUrttwOtYN+7sO3uRk4xijcqw3RP3R4JPyqgJZDM14sygJywsIXf-TV+LLBEIFXc5Rveo0I2lmlGbVrCACqtrkGhaLoBgYAAGioCgAGIiDoACyyjqJoCE6CIagAOJAfohjGGY668vyW4ps8AR3qKUpZJWYr5C856JCkaQZNkuRgs+5Svi2SL0qi34QIwEBYrAYBUEoTpgMc9yMOMWz8VwGIiQw4nnBQQjIJIqgYHoCgqDo2gABJqHoGFKPGfKbkp24IMEB6MLeYSBEkPhpEC55ylkor7vkYTKgESShKErFwhOc5TtxAiQHxAlCfJYkSVJfAye00WKZQQh-gBSHpWoSgYBB2XIOIKiSPoJkEeZREPqK4KhJCHkhOC54lqq4IqiWESRB8AQBAFPpvq2XFfmFvEydwgnCaJyUUJJ0lnHJ433EImXZblGD5aQhX6AoYiqChWiQWokjID+YglWZgqgE84KlqEcokVm7zeNe55pCkxaeA5fneHeSQRFCJQGi+zaTv1lrhcNo1JRJbAQAwqX-oBCiLTlygrQVRV6CddxlediAvBmZbXb51ZvbW5YNWKjDNeKwLtZ4nXdexQMBqFghDZFY0KZD0NgAtGhZUjeWoxtW3aWIUH7Ydx14QmmNna4OMROCNnXXe6TKhE5iAmTTURC11MK7TXV-eOvrviFA0sxF3Tg3NSksDgCXMli+yDMMjrutMswA0FpvA2ioNsxDtvMPbM2YnsOJLtGXJxlLpky8m2PPL5TVAnk13qjkoRPemjAQg56bq8kB704DwW+zxlsjVFNuUHbDth6yuKEPig54MSZJemxpc+0z5v+1b1cc0HIeyQ3zuR5ySlrtY+GnQncvPOmKTqyEYQZw9ATnkEkJvGkXlVTWp4l97fW9yDvHHHOaG0MHsAsOw06DUIRiSIVaiqQAWphBgwcgChoTBP8Cg1C2kkBjJMFk8wAkBCRT4yoqZJC3uWCINlV6-FgRrIoRsvYm1Pp+c+jBL7vmvqgW+jQuY83UAoaQkgMAAHUFBpUAnIcBhFE4vGsukW62ofAaj8FvcijBfLCMSG9dIP1j64M4mfP2F8r43xwHfKGMMmFIWAioX+ChbQGRWsZWOpVZZPDFN4PwqRMjVj8GEYILxaYCKsjZfcGY-DOPyLeX6MIu4n2kfg2RhD5GkMUXXUOXYezOldG7dknpja9W8e2CuRDTQkLIcHeuISFwRnZJPWMVx9FzwsrdcwbxGIqnXpqLeWYUjgjvArXcn1EiGw8YFKR-ofHxP8ckkes53yhL7M3AcQ4RxjhwTElpcTBp+OIQou+KTglzh6RPFc08Nzx3yZYtySRtRZFBJgtIN5ynAjeJWLZvw5R-E+MUP6FBUAQDgC4aJHF-TLIgURdwN5-Db3CF8RUlj-B3nMOYbemQbzFkkSMj8rAxksyeWwheOQt4mIBBKP4yKUXplBQ8j8kKdhOxxNCrGC93CljVpqAs3wlQUX8Bs34oQdY6gcuixmrSmTWjmek+As8VkvLyDZLM+tbIooKOeQIblry3nvCY8sepsGeOaZix+UKOXPMTj9V46Y0601+ECbU54VSmNpmESs4p0jNQZWXGRFcwaDxivigx88LqVjLDdYId05SPTJW1UsgRnqQg1mEc50qmlgrNgQy17NrW1zilDUOgdZa2osoEPcrj-npxyDWFyvwASwIcg9Ssb0sGNJ6hi4NvjQ0xsmsosAeLDE421Hqksljvr1nMAeRBZLXLuQohKcsQJk6mp7kyi2paa6TRmaPFkzsq12pxqeUxwJqrigbVZXy2cRU+Gqhqo8xcA2FsZZC8KCTVhJMUZOiy1ZClqtzcCKy+4vk40+LO9Ob0FYHk8MEJIfa8F7rkZMgJ0yH7M0gCeoi9Z6IfEvZqm9SC8bGIiLTOpmCP2xPlfu9pgSK1AfYVKf4r7vD7mdRrDWrbFRimVBTR9p40gIe3QzM1A6UM-o6ak1l4Z2XSyVQvbeeq-ghE+D9et-CyUUcKcm456ZPppF+sUIAA */
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
            },
            onError: {
              target: 'initialized',
              actions: ['notifyCreateDataViewFailed'],
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
          invoke: {
            src: 'subscribeToStateStorageContainer',
          },
          on: {
            UPDATE_CONTEXT_FROM_STATE_STORAGE_CONTAINER: {
              actions: 'updateContextFromStateStorageContainer',
            },
          },
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
        updateContextFromStateStorageContainer: actions.assign((_context, event) => {
          return 'contextUpdates' in event &&
            event.type === 'UPDATE_CONTEXT_FROM_STATE_STORAGE_CONTAINER'
            ? { ...event.contextUpdates }
            : {};
        }),
      },
      guards: {
        controlGroupAPIExists: (_context, event) => {
          return 'controlGroupAPI' in event && event.controlGroupAPI != null;
        },
      },
    }
  );

export interface LogExplorerControllerStateMachineDependencies {
  initialContext?: LogExplorerControllerContext;
  datasetsClient: IDatasetsClient;
  toasts: IToasts;
  discoverStateStorageContainer$: ReplaySubject;
  logExplorerState$: BehaviorSubject<LogExplorerControllerContext>;
}

export const createLogExplorerControllerStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  datasetsClient,
  toasts,
  discoverStateStorageContainer$,
  logExplorerState$,
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
      subscribeToStateStorageContainer: subscribeToStateStorageContainer({
        stateStorageContainer$: discoverStateStorageContainer$,
      }),
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
