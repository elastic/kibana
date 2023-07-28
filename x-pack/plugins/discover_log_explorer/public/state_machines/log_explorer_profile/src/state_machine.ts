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
import {
  initializeFromUrl,
  listenUrlChange,
  updateStateContainer,
} from './url_state_storage_service';

export const createPureLogExplorerProfileStateMachine = (
  initialContext: LogExplorerProfileContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCAFQ1AMwEs8wA6AVwDtrWAXagQz2oC9IAYgDaABgC6iUDlSxqnVMykgsiAIwAOAMz0NagEwBWUfoCcagOwAWS1Y0AaEAE91m+hf0A2Q57WnToqKmWlr6AL5hjmiYuATEZBQ0dPRs8ty8fGxQAGIUALYAqoR4ghCKDGwAbqgA1gzR2PhEJORUtBUc6fxZuaiFxQhVqADGXArMYuKTyjJy48qqCGqG+vRahqaeWr5qnhaiFo4uCPqiVrqihhpW2xaG1v4WEVHojXEtie0pnTzdzDn5IolEgUQj0fBjShEPL0BqxZoJNrJVKcX6Zf69fp4QbMaqjcaTaZIECzNKKBaIKz7NaebRaSz6KyeS6eI6IU7nDSXa63e5WR7PEBwprxVpJDppNFZAAiYy4ADVqGAAO6lcrfap1WGveGiz7In4ZGVyxUqnF4sbURSEiQzWRkpTExZqdb0UxWfT7Tz6LRBCwGBzOSlBN0e-b6F1qF0aJ6RIU6kUfJES1FG-6y9gKpWqkFEcF4SHQ7UxROI8XfSVpqAZrNmob4q0TCRE6T2+ZOxCGAz0HyMjQx5b3NRWNkILQaTxuzy+QxWKxd5k+LSC4XvMtfFFddFQADKmfYYAAwopM2wSGrmB1NfUE2uxRvDX9d-ujyeuGfCOaRpbrc3bcTSXbUBFl7eh520edLk9UwLFMUcu3OIItAsCxrlQj0rBXW8EXvA1KyfPcxlfZhT0vQhBFzMEIXYKFCBhVccP1FMtyyQiD2PEj3zIr8G1-KZ-1bOZGwpBA+R7ftDEMX0NB9T1DiDUS9HcUQZNMPltiktQsJLO8mIrVN+EgFIIDoQQClIaUAEEABUMAAfSs6zLJ3DBrLslzkAwQ9rIASQAeQAORbEk22Ejsll2NR6CCflti5NC4IUswLDdFZtFMDQNiCM5lzjBi9WTfStyM6gTLAQRHOc1z3IwTzvP8gK7IAJQwHdrL8lq7OySyfOQAoWuCwCwuA1x9FWD1fTuA5MruQxR00URdGCMxvTUUQtlpbS3kYwrNzRIzGBwCBLXTE1swvK9ahvHSdvLPaMgOo6TurM661xb8CT-SQANC8lwssaw1jnfx9H7dbZxHBTJt0JkDlgmDPBuTC8uwgq7sfAQICYJ7OFOzNTRzQhQXzQs6OLba0YffDMex47cZe-Hsx4n8m3477BIdETLD2ehaR9LRgndRH9HmmS1mWzYYMk7ZkZeG7KbwgyacOunWJfDjSPPMpLw1K7yd1JN0epx7Vf+NjiM1z96xZm12ZCoS-pGpZZuiyTNkCUIprUUcmUnQd-BWH1rl2LaDfXRXiqxlXnvNjWuPPSiSZoot8sNqmlZNmP1bfD9mc+tm7Qdx0ncsST3B9UxThjK5QcDY4bEndbRD8WdPHdAJMoiONmFQCA4GUVPw7AQvOfCgBaVkFMMJaQhQ3wAhQ4ItJR+W0+SFh7sMiAR6AlRKRFhSoxSjxvBQ4cu0ZSTQ9LXDmKlDFAWKHfhr3k5UKW64bEy0GL9Hd16DGt4K43gTAC07ivCma875VhrATZ+jtX5mEWlsYIgRm6xRUqOX0i11hWHWrBHwE5fSGGvrpXaGM1ZETjh+eBxdEGVx7M3T0fgVLrEuD7WCYENDuxdBGKMwDSG3XTpHWhIk9AaHcMyb0bd+TcOuH-HQAtZ7TmSpXKkgiFbQK3sZOgojwoTknBYKRXh25yMhscUGqxrjMhuJXH0E0SEQLDrfIq+0o442NIzFUeiS4rEnKEJeMYLCe3WqOSxMNmR3HMKDM4st4yryHq4h67jTbPioTnMiPjEFnEWpcO4UY7AbEmmEsW1icp2K0A4ruYQgA */
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
              target: 'initializingStateContainer',
            },
            onError: {
              target: 'initializingStateContainer',
              actions: ['notifyCreateDataViewFailed'],
            },
          },
        },
        initializingStateContainer: {
          invoke: {
            src: 'updateStateContainer',
            onDone: {
              target: 'initialized',
            },
            onError: {
              target: 'initialized',
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
                  target: 'updatingStateContainer',
                },
                onError: {
                  target: 'updatingStateContainer',
                  actions: ['notifyCreateDataViewFailed'],
                },
              },
            },
            updatingStateContainer: {
              invoke: {
                src: 'updateStateContainer',
                onDone: {
                  target: 'idle',
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
      updateStateContainer: updateStateContainer({ stateContainer }),
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
