/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { actions, createMachine, interpret, InterpreterFrom, raise } from 'xstate';
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
  updateGridFromDiscoverAppState,
} from './services/discover_service';
import { ControlPanelRT } from '../../../../common/control_panels';
import {
  initializeControlPanels,
  subscribeControlGroup,
  updateControlPanels,
} from './services/control_panels';

export const createPureLogExplorerControllerStateMachine = (
  initialContext: LogExplorerControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCBhVAOwBdDU88SA6AVwoEt2q2BDPNgL0gBiAEoZSGAJIA1DABEA+gGUAKgEEVGBaQDyAOXWS9GEQG0ADAF1EoHKlhsulGyCyIAtACYAbIwDsAIzmAJwAzH4ArAA0IACeiJ5+AByMwZ6hnokALD6e5kneAL6FMWiYuATEZJQ0dAyEjByOPHz8HFBy3FTc0mxgAO5CEJRgjRQAbqgA1qNl2PhEJOTUtPRMTVy8Au2d3b0DCByTAMZdbJQWlpcudg5OFC5uCAGejObentFxiBHBwYyeLIBX5JfLeX7BCLFUroeaVJY1Vb1MbNLZtCgdLo9PqDEi0Br4LoAMyIAFtGHMKotqis6utOC1thjdtiDkdUKd7pdrkgQLdms5eU9sowAqEkn8IuLIUDvN4YvEEFksqE3hFQaEglkperPNCQJSFlVlrU1g0Noz0VATasAArcChgPCwIYjMaTGYU2FU42Iunmhlo9o2uj2x3Ow4TDlnC5WHm2ewCh5Cjy+YLeJJ+cGfTMS96fBWIJJJAKMULa8wZbzmPyfbxZfWG+E003Ii1BjEhvBhp0uvFERiEqgkwjkpvUrttwOtYN+7sO3uRk4xijcqw3RP3R4JPyqgJZDM14sygJywsIXf-TV+LLBEIFXc5Rveo0I2lmlGbVrCOSSJTxvlN3OZNQCeAIAjvUUpSySsxXyF5z0SFI0gybJcjBZ9ylfFskXpVFvwgRgICxWAwCoJQnTAY57kYcYtmIrgMQohhqOAoRkD-TQ9AUFQdG0AAJNQ9AAcQwf9115fktxTBBggPRhbzCQIkh8NIgXPOUslFfd8jCZUAiSUJQkwuEJznKd8IESAiJIsjmKomi6L4Bj2ns1jKCEABVW05A0LRfPUJQMBUZQMGQcQVEkfQAKk4DtwQB9RXBUJIR0kJwXPEtVXBFUSwiSIPnAkyfTfVs8K-KzCIY7hSPIyj3IoWj6LOJj6vuIQArUIKQqC8LSEi-QFDEVQdDEBQADE1EkZBPLEGKgMFUDEHBUtQjlCCs3ebxr3PNIUmLTwVKM7w7ySCIoRKA0X2bSdystazqtqtyaLYCAGC8ny-IUTrutCvqBr0ea7jimSXgzMs1sM6tDtrctMrFRgcvFYECs8IrLvHX13wsirBCq2y6pYl63rADqNC64K-oiqLuOG3ixsm6bZowIGk3i4FwQUta73SZUInMQF4eyiJcpRiJCoCYrsNugNLLxmzuietrgJYHAXOZLF9kGYZHXdaZZmuszsbutEHoJ56VeYNWWsxPYcSXaMuTjCSE2BxbXEQAyjMRoE8jW9UclCXb00YCEVPTfnkgPKWbvMk2CIVmq7OVyhVfV23WVxQh8UHPBiTJL0sNj43Zdxs3FeTonLetxiM61h3OWAtdrEkhaQI9550xSfmQjCAPtoCc8gkhN40j05Ka1PGOjbK0v7sI4452E2grdgFh2GnSqhCMSRIrUDiAC0tF0AwRB0ZAFGEs-vIUNRbUkVnpKWhLIMyIE0hF0WkiH8sIgU3vfgQTyD4aeWNZ6fnnowRe75l6oFXo0EmZN1AKGkJIDAAB1BQ3kAryEfiDZ+Lx5LpA2tqHwGo-BD2gowQyNDEiHXSOdUBpVcJz1NgvJeK8cBr1eu9bBX0T4qDPhfW0QkwriRbq7NmoM1p+FSJkasfgwjBBeGjShckFL7gzH4bR+RbwXRhEXGeLCIFsKgRwuBXC042y7D2Z0rpdbsk9JjZh-oTEJ2gaaWB8CrbpxsQuCM7JG6xiuC7QCbt25gWCH4cwbxUIqn7pqIeWYUjgjvOLXcJ1EiSwxobMBxj2zuPMd4mus53y2L7NnAcQ4RxjlyS4j8BTKpmJgZwtePjrFznKQ3FczcNzhPZoorSSRtRZFBALTJN4knAjeJWUZvw5R-E+MUS6FBUAQDgC4ZxOF-R9Kkc-dwN5-DD3CF8RUij-ASklIo8WEpQj6KuoYvJrjWCNLxrsp+HcchD28LIw6fx-kAr+EUHJjz6k40tDsTWOJ3n4I7u4UsfNNQFm+EqGCFztR921HclSTDtkNM3laPx4Z4Ct36TJLwMSshZnFoCQFwQCjnkCFpa8t57w-PLHqEFpknn4rlpAGF7snjnVeOmP2aNfhAm1OeFUvygEFHFB8M6SRcUyzcU0x6lcHKwtioK5alYyzrSidWOUO0UX5VLIENIUcfDmAMiquOrCE4asJlq1OTlXo2wtu7HVETECBD3Lo8wlYcp5AoSi1JAI5U+FCJWQ6wKDHcrBfHdV5sU6NR4WAAVvrnjal+SWRRZ16zmAPN-cN9ZtIwVufpQyxkuUlTxeC0xzqvWNXabXFkWss3s1PLI4EKVxQFrkoZYOzLo1pGBEeaOdbpYOrVfLDxqwvFcK7TJasMTRWxuBHJfcpzPafF7WtGVgR8gpWVdO4u4DXnWQXXQJdbSN58ogCu5+9ZkIfE3RKndP9wZimzKeNI4z7UlzndeopliM3Po7n2-4nh0z7iiQLAWpbFRimVIjf2aNMmAfPUY1xV72EtIsW0kpnZOn+JJZIj5YEQi-L+CET45181hpQydGJQbyxnXTCdD+yzChAA */
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
            src: 'subscribeToDiscoverState',
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
}

export const createLogExplorerControllerStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  datasetsClient,
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
      subscribeToDiscoverState: subscribeToDiscoverState(),
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
