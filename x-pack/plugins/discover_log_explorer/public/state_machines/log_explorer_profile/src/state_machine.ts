/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { actions, createMachine, interpret, InterpreterFrom } from 'xstate';
import { isDatasetSelection } from '../../../utils/dataset_selection';
import { createAndSetDataView } from './data_view_service';
import { DEFAULT_CONTEXT } from './defaults';
import {
  createCreateDataViewFailedNotifier,
  createDatasetSelectionRestoreFailedNotifier,
} from './notifications';
import type {
  LogExplorerProfileContext,
  LogExplorerProfileEvent,
  LogExplorerProfileTypestate,
} from './types';
import { initializeFromUrl, listenUrlChange } from './url_state_storage_service';

export const createPureLogExplorerProfileStateMachine = (
  initialContext: LogExplorerProfileContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCAFQ1AMwEs8wA6AVwDtrWAXagQz2oC9IAYgDaABgC6iUDlSxqnVMykgsiALQAmAMz0AHAE5dAFi0B2AKwAaEAE9EARi3n6+gGxHjZ8wF9v1tJi4BMRkFDR09Gzy3Lx8bFAAYhQAtgCqhHiCEIoMbABuqADWDAHY+EQk5FS0uRwx-PFJqGkZCPmoAMZcCsxi4n3KMnI9yqoI9qai9KZaokauuhbWdggaGrrT5vqmruauGj5+IKVBFaHVEVGcPA3MiSnpmSQUhPT43ZREyfQn5SFV4Vq0RucTuTRaeDazAKXR6fQGSBAQ2iilG6nsGns0127lEB0WBlErmWiDWGws2xxB18-nQZWClTCNUidRB8QAIt0uAA1ahgADuWRyLIKxR+dNO-yZl1ZsQ5XN5AqhMO61EU8Ikg1kKKUiLGjlM9HMGlcRIxogsWi0JIQ82cpnsunMxn0JtEWnWNOOEr+jIuQOucrunPYPL5gueRDeeA+X3FgV950BLOBQagIbDSvasLVvQkCOk2pGesQzjM9lEGN0WkWWlchl0NvM9n09Hsew0+n0ojmztdXt+DKTzKu9QEEEiEDoglSpHZAEEACoYAD6C8X84AyhhFyvt8gMABhRcASQA8gA5AtIou5tEIetTesY5vmC0mfTW2yILz0Vz2fZXEfdxdHbIwBx9IcARHWV+EgSdp3XLcdz3DAD2Pc8LxXDAACUcLPHDr2RYtQDGBZWzWXFTAsUwPy-FYjDceh3XdTsjCJDwwIghMoOlAMx3gxgcAgVVgwVcMhWYWpRRKSCzmgmVUzgichJEzgxNDRV+WVTpVXVfNNURYi7xLBAHQ2f8rS2UR9A-QwbU7Q0PDtD1tH2bQtG4+l5L4lNA2UphhNE9NxIFQRI1ed52E+QhvkHHz-T8gSVKC9SQs08MdJzfT+kMwthhM0jEEmLFtFEcw7VsrQu0bb9xkMFxu20EwLB7HtPK9ZhUAgOBlHiqV-S1ArUVMzR1jbcyljq7R6HmZyvC8yU-WTFhRxBSAhp1e81EdKYJkdKaVgxDQXAWo5+uWmClNBe5mkeTaSJURBP2Yt9TFAg4bXsCsXBAlrDlpHiEuTNa0wzLSHsKp6EFA6YtH+m06ymOYjA0SZqytK0TUWxMFP49aIEhkaioQGsNnMLQK3htYyUpr7vtmpr4a8Nr3Rx3jEtBgLqCnMAid1EmTFcI1KfdVGaerexEdNeg0crGZ2xA9t2eBq7-PHQK1PlDKBX5+8KzmZjqO2PFzFo6r6J-IC-1cSmjBbDjQIq3xfCAA */
  createMachine<LogExplorerProfileContext, LogExplorerProfileEvent, LogExplorerProfileTypestate>(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'LogExplorerProfile',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: 'initializingFromUrl',
        },
        initializingFromUrl: {
          invoke: {
            src: 'initializeFromUrl',
            onDone: {
              target: 'initializingDataView',
              actions: ['storeDatasetSelection'],
            },
            onError: {
              target: 'initializingDataView',
              actions: ['notifyDatasetSelectionRestoreFailed'],
            },
          },
        },
        initializingDataView: {
          invoke: {
            src: 'createDataView',
            onDone: {
              target: 'initialized',
            },
            onError: {
              target: 'initialized',
              actions: ['notifyCreateDataViewFailed'],
            },
          },
        },
        initialized: {
          initial: 'idle',
          states: {
            idle: {
              invoke: {
                src: 'listenUrlChange',
              },
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
                },
                onError: {
                  target: 'idle',
                  actions: ['notifyCreateDataViewFailed'],
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
      },
    }
  );

export interface LogExplorerProfileStateMachineDependencies {
  initialContext?: LogExplorerProfileContext;
  stateContainer: DiscoverStateContainer;
  toasts: IToasts;
}

export const createLogExplorerProfileStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  stateContainer,
  toasts,
}: LogExplorerProfileStateMachineDependencies) =>
  createPureLogExplorerProfileStateMachine(initialContext).withConfig({
    actions: {
      notifyCreateDataViewFailed: createCreateDataViewFailedNotifier(toasts),
      notifyDatasetSelectionRestoreFailed: createDatasetSelectionRestoreFailedNotifier(toasts),
    },
    services: {
      createDataView: createAndSetDataView({ stateContainer }),
      initializeFromUrl: initializeFromUrl({ stateContainer }),
      listenUrlChange: listenUrlChange({ stateContainer }),
    },
  });

export const initializeLogExplorerProfileStateService = (
  deps: LogExplorerProfileStateMachineDependencies
) => {
  const machine = createLogExplorerProfileStateMachine(deps);

  return interpret(machine).start();
};

export type LogExplorerProfileStateService = InterpreterFrom<
  typeof createLogExplorerProfileStateMachine
>;
