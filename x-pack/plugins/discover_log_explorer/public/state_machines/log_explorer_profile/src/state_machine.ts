/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { DiscoverStateContainer } from '@kbn/discover-plugin/public';
import { actions, createMachine, interpret, InterpreterFrom, raise } from 'xstate';
import { isDatasetSelection } from '../../../utils/dataset_selection';
import { createAndSetDataView } from './data_view_service';
import { DEFAULT_CONTEXT } from './defaults';
import {
  createCreateDataViewFailedNotifier,
  createDatasetSelectionRestoreFailedNotifier,
} from './notifications';
import {
  ControlPanelRT,
  LogExplorerProfileContext,
  LogExplorerProfileEvent,
  LogExplorerProfileTypeState,
} from './types';
import {
  initializeControlPanels,
  initializeFromUrl,
  listenUrlChange,
  subscribeControlGroup,
  updateControlPanels,
  updateStateContainer,
} from './url_state_storage_service';

export const createPureLogExplorerProfileStateMachine = (
  initialContext: LogExplorerProfileContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCAFQ1AMwEs8wA6AVwDtrWAXagQz2oC9IAYgDaABgC6iUDlSxqnVMykgsiAIwAOAMz0NorVoDsAVi0a1x0QE4ATADYANCACe6zfVMbjeu-rWi7DQAWAF8QpzRMXAJiMgoaOno2eW5ePjYoADEKAFsAVUI8QQhFBjYAN1QAawZI7HwiEnIqWjKOVP4M7NR8woQK1ABjLgVmMXFx5Rk5UeVVBEsNekMrQK0bYKC7fztHF3VDII8vDTXDNUNtu2MwiPR6mKb41qT2nk7mLNyCopIKQno+BGlCIOXodWijTiLUSyU473Sn26vTw-WYlWGo3GkyQIGmKUUc0Qi2Wq20GyCWx2e1cCHM9CCXmuekMokO2y0txAEIasWaCTaKQRGQAIiMuAA1ahgADuxVKr0qNXB90hfOesLeaVF4qlsrRGJG1EU2IkU1kBKUuPmdhsTlpxjUR00Nis+g0NjUVis3i5PMe0IFryF2s+YvYkulcr+REBeGBoJVUV5Txhgvhoag4cj+oGmONYwkOOkFtm1uJdv2CDUFzsHkOjpshhsWguahsftVKcDLzhHURUAAwop2BQ8KQuMwwHhYPKp4rqrUuwH+b2tR8hyOxxOpzODUMjSai2bcfiy6B5qZjAyjIzDOYbNYm-bEFYDPRrJZNJpvI+NJ3kxXDV037DJh2YUdUHHSdp1nGMASBdgQUIMF-ShVdNRDDdwMg6Dd1gfd8yPCYTxLGYCyJBYtGvIJbw0e92yfQwXwQIJvXoN9jCsIIAiMV1XQAh50OA4MM34SB6AgcVYDAdgAGVpzAQZRiSCA6EEPJSBFABBAAVDAAH0dN07S5IwXSDLM5AMEHXSAEkAHkADlizxUsKPLatrCOZt720LRRFdIIbErWlmzUZZjEMaLNHMbRzkEtVUyDPsEQkqSIxk+TFOUgtVPU4zTPMyyMGs2zHKcgyACUMDk3SHJqgzMm0uzkDyGrXLPDyL3UbzlibDR-MC7iQpY8xDF0LjqNsIx6LURLuwwkC0ogSTpNkhS6FyxQmBwDKdQjPU5RKecBmVND1TTUT+3S9bsq2lTGD2o0w11KNCMPQsSMkU93MJTz21Megm18QJLnbRkaVfNQdFWURggMKKtnvBagKu1K0luzKNpyx7ns4V7DqjQR4LjBMUKTITLpS9cBFWjKuCyzalLx-bCZzGUPqxY8frIy1KPbdxLC0WxaLY8WghY20lmuBtRB41tHw7cJuWXYT0dpiTBi3KCAHEKCe2AmFYTWIEEOynLs+ztOQOyAC1DMHZzdKqhzkAM3XXc0gztNIOzOr+q0eurQGPEZCwBqbIJLhY-xWQ4rRGUpa5PXWVH1ZprC6fobWILHfXUEN-KwA0rS9IwEUjL07SDIlOyMAAdQD8j-uDmHLg4wLG3sN0rCdWPqKWGtKW9Aw+9tdPqbXLOtZ1vAC6L6g1JLzTjMd53Xfd0htKc0q5Ob-mAYMHRtiCYxAlOMwgn7qsazsCb9DsWjH3htRdkn5Lp7E7Pc9whecCNk9Nmm485QR3LBOcbQlRLkAhnL+N1Vq-3zgbABu1gE4W3DBPceZPqml5m5FuQcVBuBsNeYw4djCR0ODHW+noJqUN8GfeGoh9AGA-j2TC39Z6gPnigwB+MwJz3ATOEmhB-hkyQomC6n9OEIJznPf+-D0FCKwQRHB3NvrmkIQLUO5DzCUPvFHGhtIYb+HoLaOwWhdjGG8CYfQYQVbMFQBAOAyhpEcLAFow+wcAC0UMEA+OvN6YJITQmchVu4paxsMbiQgF488xDWKhTcPQow3Fz4rBhi2dhUSYkDmRD8eJ3VEkDV0IcKw4VAotkCCxbiH5r7aECI6YI2hQgRLVlPWRwp2ZHSKa3RJKwrAeD7jWfwidgqrFqUceijpWQ-m-PfHJIk8mCJ4cI+Av1tGeXsDLXwFhyGGGoosSWVZGRDMCByYKVwmxWCWRrGecTNneIGZSegFg7H8SbCYfxZ8T6nBhlct+Ny7B3Mzlw+md1mbbSIV1fp8wVg2DeVFSwnzornxYuQiKbYEUGBbIcUF8CVprWxvdFmeUl50D6UQ+YwRRBIo+bYL56KqwpzeTWUhpg-zUXCXcWBnTlqYwhSSqFrMXpZjerKKlAsthDLfNsUWdgKnXysCxQ5EVtjeFMOPDJbTeVUxkQK2J8ieGKKlZ5BF9KUWMrRf4qw2gGRsU0MyGGXhbntL5Qa66RKkF6z4dE02Zrg4+iWIcRk6xvQsI0G+WOfUbA8W0BcEaFhdWqw9R4r1grjV-z9RSzxTyEnzDfmY9JrZmyWPPtHWOnprzaFMEClOrSCVdMzT63hhdUFALFRgsBqjA2JNpZa4aIUbWxzfkMzQjIPTNjjefZWYQgA */
  createMachine<LogExplorerProfileContext, LogExplorerProfileEvent, LogExplorerProfileTypeState>(
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
              target: 'initializingStateContainer',
              actions: ['storeControlPanels'],
            },
            onError: {
              target: 'initializingStateContainer',
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
          type: 'parallel',
          states: {
            datasetSelection: {
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
      },
      guards: {
        controlGroupAPIExists: (_context, event) => {
          return 'controlGroupAPI' in event && event.controlGroupAPI != null;
        },
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
      initializeControlPanels: initializeControlPanels({ stateContainer }),
      listenUrlChange: listenUrlChange({ stateContainer }),
      subscribeControlGroup: subscribeControlGroup({ stateContainer }),
      updateControlPanels: updateControlPanels({ stateContainer }),
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
