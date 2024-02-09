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
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2VYFEAeAHANqgE5hEDCqAdgC5Gr76kB0ArpQJYfXsCG+7AL0gBiAEqYymAJIA1TABEA+gGUAKgEFVmRWQDyAOQ1T9mUQG0ADAF1EoXKljtuVWyGyIATBYtMAbB4AOABYAZgsAdnCg8N8AVliAGhAAT0QARjSPJhCQjyC0iO9YgE4PEOKAXwqktAwcAmJSCho6BmZOJ15+AU4oZTBGAGNnSmFjKVUpdWQpAC1teU11RRkpTAB1SxskEHtHEdd3BCCIv2KwtOK4gO9zpNTjnKYLL3P-Eo9i2JCqmvQsPCEEjkKi0eiMIhMDrcPiCXr9IYjMb6CZTGbzRSLDTKTCqLauPadFw7I6+IJMYoBTIfNIhXzFIJle6IE7FJgBYoWL5BAI3cJeOm-EC1AENYHNMFtSHQrpwyh9AZgYbsKjCLHqHGqFSYZASSYGRTiNS6cSKABi6ikyAAquJ8TtCQcSYgALRpAKxJh5XKc4qc2L0oKJFKeXwhJixXl+sPu87fXxCkX1IFNUGtCFQriynry+Q8ag8GTsMAAd2EECoYEzADdUABrKtJwGNEEtcHtLOwnNQPMFoulhCcWuDfMqyhbe12BxEyiHRAhcLhiwnXzBcIBk7xZkIcLeZ5R4ppUK73wWH7VYX-ZMtiXpjudLu9XuF4tl0h0SEEfMAM2IAFsmCbMVUzbKVMwfbon3zF8ByHVARxGCdrAJacnVAUkAnCJhGV8DIqXCL4rmDB5Yg8LIuS5cI0nXfxQnPP46mbcU03baVO0g3NoNgMBqHLSsa3rRsryYkDJQzGVH04gtuOoQdKGHUcqCQ7Yp32Mc5wQF0yKYGILG+KiQndMj8nCbddx8CwOQselOUXXJYkTYTgNbMT7xhDiey4njhHfYgmC-ahfyIACgJTFy7zYiC5U86SeLkhTEOsSddlQ9TnU02NsL5SkTkiTk6W3AIF2eWJqOKKiPF8d4EwvUKbxYsCJI8296AABR4SgBlgPjOoEhtAKcsKWsa9jouG9rOvwWB4vgxTxyS5CHVS4l0MQAyKXKor8g8eJ+VMkMEACMlnmXXlylCXwT0cxjnOG8TRu7caOq6nyiA-fz8B-f8BpuoaGvuqLHoaiaupmhCx2UlC1JWtw1qPPxrkyQybipDxCr07CohyXDDK5Dw0mu0U-tAgH3MEERxEkWQFikZQ9DkURFHUVrWpUDQtGSx00tWhBIzZI8rOXAy7O3I80l8dlxYsS5A0+QzCevZiSbc7MKYkaQ5EUABFa1TAATTZzRME55bZ3S2JImyCjTwt2Jl0s0XAiwjIGXCG4qsuhkFZE8LWPAsmhAgMR1epxRJgAWUwM0rS0RmI+NxbVJnDTTzZMpMNyPSbhCaJRfFgImCPSrba+Ir4m927-pVrs1apzX4+j5BY8NKOjQACUUYxY5kaYTehs2eficMF1iIJTwI6Wqv2h4Ch5dkqWCIuvlI8IK+J1zIoDyAmAgLzqARJURihCBGGEa1WqxBYlk1bVdTIfV9D75P0syTlskjMpaVCAXim3cpw1IkERkhk-TRDJGveqytN6qwgDvPeB9lRUGPqfc+l9MTX1xLfPUUgDBmDSCpFK-cNLunyBGF49IwiWXyGkP+5wIx5GAZcV24DaqDUgRvf2MC4GxX3oqRBlBkFgDPhfI26DsSYJxHfB+ZgPAEK5jDI4eQ0ielwkdPI2cdqRFoQAhhn9QExCCBApWHCmrk1gbvHhCCj6DAABYdSgFBPsr4epVjgv1OqxiIqcJruY+BfDrF2PlI4mCJYwZzUhktIhL9dxYTPG7WkuQ6SHgCNuEoPgvgRHdMo-G+NV6sN+uwrxpjA7cJ4DJKxY4mC2PscE-sb43p+QCkFEKbDPF+2KdvCxZSeIVKQdUoJUkQlhMSlYJ+aFYYICPCUZ4YZDy5UZDQg68ZsjKK5IZfwh48kMSJoU9pD1Ol+MRJUwYJBRzynUBANu8Fnx1JcX1ISBS2kjUBgcyx-jjmnO4Ocy51zoJ1OGRDBacjTbEN5D4EyR4c7mWsmZKq7J4zBAXB6fwBN8k7KeaTLhXTynvL6Z83oFyrmDBuc43yn5PqBW+h40SRT9m+LeUcvFYAzlQEJb8pxsF5KzRGWM7mEzxZeGwjkEIdsGROzRgdE8XpoiHleJkFcRiaV7JebAwYDUADidAWC4FgKwDgdLkSommHMbQehDCiF0MgRQ6qLXnyZq1KQvKFHpCDBLS6URpaXEyIGUWLwsixiqiUfwcsAiKt9s8reqqNVap1YItUSwVhrHWIoVBRt5BOoHvy3cBdlxjxiOVRk65p7pFxs8K4ubTzei2ZeR5SqI1cLVaBTVqBtW6vYCfIRqatA6AMKoC1VrWrqBMMgZQGbiFVXJOuIeGR1yfBSQdDI7o-CMgCDtMk-IFzVupeGzFPiqnRpbbG7VFjehPUmt1CsvU3EPPRXW3d3Rt6NslM21trBcAnvlGe0GcFwZKSBVDZ+PMplusiCcF23qGR53pIXHCXxM6ZEqmGu61cH1RqbTG3Vx6WVfqmq9d6TSqWtLvShsx+70OHsw++7DwNnpTQBX+0ZidCGAf5a6vwoHPWyp9QuyqWQSgWwIvEMkpRzwXkoKgCAcBXDbuQ0QAD4yjhaWKjyCIOUIgTwKgdPI7Jcj5EuvSaWRVQ1osVsRyEbAOkQHk3yxT1Esg8iot4Aoa7LLFsmSKq2HJIhlDDEEcq9Ea23p3SR7svTM3yMzYojwWEdonDolRK4R1fDbmi2kbIYQx5hDiFkoMSGq7QMkjFEJ1nnXHBeH4KkYR-NkiDPOki0RnheCqtjVdQYt1EeCwVjyz4ZIlci-OckJCFzRH5FQ5RxFECjwlkdfkq4l5XACzJ-L3jmo0fPX1jSIQjo6ZojnHIVJMiFVwhSKkQCMk50PDVbZpnOsrbMRtl+mTnhbfyFto8btHYS0AThHaqXXh5agXdkp2Kem4vCyCl+LtnuLze9EOr85rKNaAZ8SqE88gA5MXS0pOLGUCPbYwB7QHxaxJe7SU7H2Dp6bIVyBk9JFxeEMSZn2smgevO6bw3HVTAkOMGXUwn-LKSelKEA1d-gIgBl-ks6ZUQ-Mck5As8qGPaUqux6DznJzmVfNZT84lfzXz88UdEcMZIRUFFstFr4qTpdnbl8ufGiumeV0B5Zsjz6MMG-SEjL0bsC3Zr9DEbc5xySriuKN84bsHKO-XsryNrvWgvqPfqlVHvJmBDZEdPzC48h6VwhKmey4VFVTKHkSkelMhK+VbHp98eMOCJT5cRkhcjyJejNRSMUGsK4VKPjGrfIK-1r3dX+gCfKMfqgDh+AkSWNHBnWl6LXnoiWX98lhdmQfAEWi6PcW-gbgeCqFUIAA */
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
            INITIALIZE_DATA_VIEW: 'initializingDataView',
            INITIALIZE_DATASET: {
              target: 'initializingDataset',
              actions: ['storeDatasetSelection'],
            },
            DATASET_SELECTION_RESTORE_FAILURE: {
              target: 'initializingDataset',
              actions: ['storeDefaultSelection', 'notifyDatasetSelectionRestoreFailed'],
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
  plugins: LogsExplorerStartDeps;
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
      redirectToDiscover: redirectToDiscoverAction(discover),
      updateTimefilterFromContext: updateTimefilterFromContext(query),
    },
    services: {
      changeDataView: changeDataView({ dataViews }),
      createAdHocDataView: createAdHocDataView(),
      initializeControlPanels: initializeControlPanels(),
      initializeSelection: initializeSelection({ datasetsClient, discover }),
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
