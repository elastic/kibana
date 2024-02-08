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
import { isDatasetSelection, isDataViewSelection } from '../../../../common/dataset_selection';
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
  LogsExplorerControllerContext,
  LogsExplorerControllerEvent,
  LogsExplorerControllerTypeState,
} from './types';

export const createPureLogsExplorerControllerStateMachine = (
  initialContext: LogsExplorerControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2VYFEAeAHANqgE5hEDCqAdgC5Gr76kB0ArpQJYfXsCG+7AL0gBiAEqYymAJIA1TABEA+gGUAKgEFVmRWQDyAOQ1T9mUQG0ADAF1EoXKljtuVWyGyIAtAFYLTACwAHBYATEEA7ACMAJwRFgBsUQDMADQgAJ6IiRa+YXFxkV6JAXF+Fl5hfgC+laloGDgExKQUNHQMzJxOvPwCnFDyPNQ8MuxgAO7CEFRgTJwAbqgA1jN1WHiEJORUtPSMRLNc3YJ9A0Mj4wjzqADGg+xUllaPrvaOzpSu7gjeAUwWRQEKn4ErEEil0ogvHFfhFihYIn4-GEvAiIsFqrV0GtGpsWjt2vtOtw+MdKP1BsNRhNSHR9gRBgAzYgAWyYqwaG2a2zaewOXRJvTJp0pFyut3ej2eSBAry6LmlX2CFiiTB8cXiQUSXhioVSGQQfgiYSYiWiYWRXktUVCVRqIHZ6yaW1auw6hwFfTxbQACjxKGB8LBJtMDgtlmysRynV7XYT3T1Pdz6L7-YHLpQFuL7pRJdYXg45R8FZ4skwwsE4lrrbFTWFimE9YhinF-BY-FFcrk0cFzRj7ZHHbikwS+cSE2SY-gUwGgzTiEx6dQmURWQ6cVyXSOiUdBVBJ9O02K7g9rFK7AX3p9EMEK0wIlDAYivBXgmivI2ELlEn8onk-MFDTCKILDrPs105Z18V5bcBREcRJFkbR5CkZQ9DkURFHUb1vRUDQtDPGUL2zK9vlCP4AmCJJ4RiAJAXfCEEARSI7wRKFEgrKF-i8MCB3XSCeTdfkejgiRpDkRQAEUAFVTAATVwzRMAI2VL2Lb5EhVa0ezCDTDVo5EPwiRJSiYG8O0tQ18nbHj6kHDcoMEsdBBEhDxNUKQAFlMAAMSkZAtAw9yvOUoj5VAL4PGNKIqOKRFYUfaLDNfFtEgtYCLPbPxuLtcDo2HaD42ciAxFExDFCCny-ICxRxG88RlAACUUYwApkdRkBCt5iLUjxoSYQEe0SRI4liADUoCQyLGKE0LVhJEvECMIbOxCDJwKoSiqYCAKVgMBqGUAMwGud4mDmEltu4MkDsYY7s2EZAUK0fRyt0HQGvUfQAHFMGUTrCxIkpv3CQ0AKiAIEVoj9y18LwgjBCjkSm5aoyHTd1qcoQIC2na9uuo6TrO-gLr6PHbqoYQpO9eRFMUamNGUTBVBUTBkAkdyDD+1TwsQa1jSY9jUviWEDIY9VfH-Hs4gA8osv-ZG7P42NRx3SBsaGXb9sOsnKFO867iurX3gpqmabp9QGaZhnWbIdn9DMCIbGlFTuu5xjCiiyiSj8djCmBej9TF-wb2KaI0SMnT5b4tbHJVrGLp4DXSYJvXLqgJO7spumkM0c3GeZ63bbMYJHfPLqwrca8ERVQoslCcHnwCf3EEDiXcmlioFvRHLeNW-KY9guOcc1m7k6J-W08Nu6zYt-O2akAwap+1RdHERRvPUPypPETmXYrhBkuNc1gICREQKAoyP0CPwmDibUAKMvIYhG7LMVsqO+7jDbMbVhPccnqhZgQEYMbLOtMc4zytnPDmeYnahSLK7Xmd4kSDQ7LRYEUNrQmihKHUoAFb5LW7m-XuaN+7CUHurP+I9syAOAZnU24C86QJtvPO2Dt8xl3gXve8qUmDWl-FEUoz5oQBHBPqICwQsFS2PuUCGcRI7EIcp-DGqt46J3-jrdgQCwAgPofTRhLMoF22Luw-6alXztlVOxQEv4hoVgwRIrUUipoyMCHIwhK08okKUbHH+aiqEAM0cA6e+iC4sMXmoFe2h16b23jA0upjXZGhAjfeEYRlTxS0k3Ritd+oVjSfCMooQojyM8Yo5WA9fGUPxtQ64AALP0UATgUnOBMKY-pQxLBWD3UpAlvEVNUVU7WTA6kNKaWcKk6ZMzHhzKeOJhEOEkTRODVUbZlQ+2VJWURiBQS+ArMBTsCNYgENfh41GZSYJkMqcPapACRlkjGSKakRBaQLnwIyFkEYiE9KVhczaAzrlDLuY0oUzSJlHglLMku8yElcLbN+dszZKw3iAoCSa-x+pUXLAtbIhoIglLOb08plz-npwASwXAxMQXjPGMGdpVxwy5QJT8wq38SXqNYBS8ewoWmTJuNM3MULnbly+Eae8vC6zwiyqlCscQkrZDLMZXISJDRQiyvi+yhLfmsqHqSnW5LKXkmpU8l5i5lyrm6UyrcLKVE6vZfqrloLRQZj5RCp4cyhWcJFU+G++RfwomiMUSGDEIgIhbEZYIz5UrYu1C-fsXzLXox8dcYcn06DktgKwDg1rirGCkO5dqUgABa2g9CGFELoZAihPrlspphb0Ugd7Cp5sqP48VG6agohRQyC1r7-ClvCXSaSbzqsVlar+qtk2blTagdNNDtFm0UDIKQmAADqig6FaHkI2z12z-jXyHZlcGFYjRbMYgEaKZZwYnx0iUSsoF3Eow1cy8dWNJ34mnbOwJ2iN0loMKoctlbvQfRZr9d1cDFkDr+OUGxUJj0VEMo-P4GlYYAXbJRUII7o59MuW+toH7cAZvtanfcfoZy0pmPSrp8an1juUa+lNaaCMcoNSR1MsBeVZhPG6wV4G1KjWNBZMoOk0QjR0oZCoERVQn1-FlJUoRewPoVlholm1cP0Hw4RzlxHhwHlnM8+cpqPmMpo4mipan8AaeY+PVjM4OP8shSYrmsKyI3jk+qKWomGzBpEcaQpw1b60UKMERI1Q7SUFQBAOArhjOjr2I53eEUQ0tgGjpYao1vZ1iSppJI4aogPmAiBTDH9M1asgPFptZ7TLAkomkjS0JXzBA-K+Y07ZTSg2ih138RWvEqd3Nyqk5Wd2kS8KZI5xlXz-CNPWS+-4qsCMrGUO+J83EnMfbF0hpI9w6dI4GQbJEPCIiqwG-8NYptebEUUH8f575ARAgEbr5zs17bUu7G+xkOx1mqx2U9zWb5339d7AWw7FPvx66V8hv8AVOY9SRWGLZoRItKPVoyp6NJ8zvq14LcMQsg4UZq7NVzdW6zHqnXVz3XaVmvgj9iSOKIo4-NqFKIjYjHxCNFWNMXlPg8J+yr95O96REk1kCohTG5JYiB+Ci8KNLBxEVWYHq2lPFe52y-xOsgUPJafzkV0IRtezYiEcoypJomUKPEREIiQJoYe-jl9PO1dWdTv18Y2vrzBe-EF4C94wbtgEYZCIlY-sLQotFNrK242nJMxt7+5mNOu4QLDPX73zTLZq6e1iLZCgjQRkfLuivQePbt7HxjhGs0vvj5WEbKJTTZB0gtMG3b8itslkUARQ688R7W1zgnxeZ1Mb57AhZfHSi7KYrfX2RpDQIZ0qZS0aPI0LVyDb59dHhkMb75plj222MV6Gm99sKevtieDfkb8EbCjmWC4vtx1QgA */
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
                    UPDATE_DATASET_SELECTION: [
                      {
                        cond: 'isUnknownDataViewDescriptor',
                        target: 'idle',
                        actions: ['redirectToDiscover'],
                      },
                      {
                        cond: 'isLogsDataViewDescriptor',
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
        notifyDataViewUpdate: raise('DATA_VIEW_UPDATED'),
        updateContextFromDiscoverAppState,
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
  discover: DiscoverStart;
  initialContext?: LogsExplorerControllerContext;
  query: QueryStart;
  toasts: IToasts;
}

export const createLogsExplorerControllerStateMachine = ({
  datasetsClient,
  discover,
  initialContext = DEFAULT_CONTEXT,
  query,
  toasts,
}: LogsExplorerControllerStateMachineDependencies) =>
  createPureLogsExplorerControllerStateMachine(initialContext).withConfig({
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
