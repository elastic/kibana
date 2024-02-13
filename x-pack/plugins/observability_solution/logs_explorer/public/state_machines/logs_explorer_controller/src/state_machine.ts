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
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2VYFEAeAHANqgE5hEDCqAdgC5Gr76kB0ArpQJYfXsCG+7AL0gBiAEqYymAJIA1TABEA+gGUAKgEFVmRWQDyAOQ1T9mUQG0ADAF1EoXKljtuVWyGyIATBYtMAbB4AOABYAZgsAdnCg8N8AVliAGhAAT0QARjSPJhCQjyC0iO9YgE4PEOKAXwqktAwcAmJSCho6BmZOJ15+AU4oZTBGAGNnSmFjKVUpdWQpAC1teU11RRkpTAB1SxskEHtHEdd3BCCIv2KwtOK4gO9zpNTjnKYLL3P-Eo9i2JCqmvQsPCEEjkKi0eiMIhMDrcPiCXr9IYjMb6CZTGbzRSLDTKTCqLauPadFw7I6+IJMYoBTIfNIhXzFIJle6IE7FJgBYoWL5BAI3cJeOm-EC1AENYHNMFtSHQrpwyh9AZgYbsKjCLHqHGqFSYZASSYGRTiNS6cSKABi6ikyAAquJ8TtCQcSYgALRpAKxJh5XKc4qc2L0oKJFKeXwhJixXl+sPu87fXxCkX1IFNUGtCFQriynry+Q8ag8GTsMAAd2EECoYEzADdUABrKtJwGNEEtcHtLOwnNQPMFoulhCcWuDfMqyhbe12BxEyiHRAhcLhiwnXzBcIBk7xZkIcLeZ5R4ppUK73wWH7VYX-ZMtiXpjudLu9XuF4tl0h0SEEfMAM2IAFsmCbMVUzbKVMwfbon3zF8ByHVARxGCdrAJacnVAUkAnCJhGV8DIqXCL4rmDB5Yg8LIuS5cI0nXfxQnPP46mbcU03baVO0g3NoNgMBqHLSsa3rRsryYkDJQzGVH04gtuOoQdKGHUcqCQ7Yp32Mc5wQF0yKYGILG+KiQndMj8nCbddx8CwOQselOUXXJYkTYTgNbMT7xhDiey4njhHfYgmC-ahfyIACgJTFy7zYiC5U86SeLkhTEOsSddlQ9TnU02NsL5SkTkiTk6W3AIF2eWJqOKKiPF8d4EwvUKbxYsCJI8296AABR4SgBlgPjOoEhtAKcsKWsa9jouG9rOvwWB4vgxTxyS5CHVS4l0MQAyKXKor8g8eJ+VMkMEACMlnmXXlylCXwT0cxjnOG8TRu7caOq6nyiA-fz8B-f8BpuoaGvuqLHoaiaupmhCx2UlC1JWtw1qPPxrkyQybipDxCr07CohyXDDK5Dw0mu0U-tAgH3MEERxEkWQFikZQ9DkURFHUVrWpUDQtGSx00tWhBIx8fIuUM09KvOAJt1pXJsNCWkCnOmIPEJ69mJJtzswpiRpDkRRJgAWUwM0rS0RndcwTnltndLTzZMpMNifI0kui5xfdcNYmsj1FxOB2aoYon6pVyKyaECAxA16ntakPWDeQI3DX1o0AAlFGMI2ZGmM3oYtnn4nDBc7dPAiLG9-aHgKHl2SpYIj0+eIPHCRWRPC1jwKDyAmAgLzqARJURihCBGGEa1WqxBYlk1bVdTIfV9AzmcNMyKqIxKMk9M+Hbom3Bc2SuDIQmiQ9i4b27-tVrs2472Ku8VZUqD7geh5HzEx9xCe9SkAwzDSFSUsz+fDNd2kpEqpfGolVbcbssgEVynXLkcZKi1UGv7Vygc1YQHbp3buN9KB3zAIPYemhR7YhfjiSe08zAeG-lzGGRw0ikTSH4Iq7pSrY1KGjA6kQfCHhuCEEolk6HwN9krUSEUW6oPQZfTBvdBgAAsOpQCgn2V8PUqxwX6nVZWyDRFnzQRfHgMlJFjiYDIuRCiYIljBnNSGS1f7pSRmyf+VJ6RF1KhvA67xsi7nOLuS4QR6QEwQb9JBIimrkx0Rg6+UjZHylMf2N8b0-IBSCiFRBGjgkPXPuExEhjjHRKkmYixiUrCzzQrDBAdjsKrnyG7M8+MghmS8EwXeVIF48g9A5AJftUnNxCcHcReieIGNvoMEgo55TqAgAneCz5YnKL6kJQJXSRqAwyRIiJ2SRncDGRMqZ0FYkFIhgtSh5s-7FQ+DEXIDs6JsIeJyAIEZAjY18d7Q8R9iaaJ6Ss-pV8slDI2b0cZkzBjTKUb5T8n1ArfXUcI7p6SwmrJ+dg4ZYBRlQABTsxRsF5KzUKcU7mpSJZ3MqhEXIVI3YcjFgdAopxeRcn8IXVeQRXlBJhcstBgwGoAHE6AsFwLAVgHBYXIlRNMOY2g9CGFELoZAigOWSqHkzVqUhcXUPSGETh+MjxFXiJdcIFLS5lE9LyS6NxVwmvxkyxZpMxHstAly1APK+XsH7rg9UKw1jrEUA-Ah8hlVZ3xZkNksRdV7R5LuUIer0guOwqRUlQQ415BiBa6FSzW5ss5dy3lOC8GP3FaoSV0rWrqBMMgZQvq-7+AjBcMMkRIwRrKVGoMgRaFxsZNEeil4FnJqtdoox6b7WZp5RfXoT1JrdQrL1VR8zOldtPt0NuNrJR2odawXAQ75QjtBnBcGSlDlQznrY8o4Z-DBACDtKikYCqUpCMECkvIdrBC+Ne-ISam4putX25dg6UUbqmq9d6iTIUpJnSgntC7WhLoHau79wNnpTX2Tuopi1VL7p5rSBkXoriNuoi8E4dSr2VXZIESyR00NRAVkKSgqAIBwFcFC19EI90lKOFpYqPIIg5QiIXS9Dw8jslyJuai5RqKBBfXdZgbAPkQEY3i5jwmspUW8AUHap5MLix4dkSy5V+R0j3uVdtdGxMgY8oMv1VC-VHDIlhdey4chUSuEdXw24670JyMuMM1lSpUiDKJk+RnorAtLNJlVxwXgMNpJROkcbIzgOiM8LwVVsanqDPXDpQj6Ozv853IL5n5zkndMeaI-JLJVOIogfO7JLqVS858K4+mgPpb80DUCIMprZY0te3wfGaJ7xyM065iASO3qPEEL4Z4RsOx8wHLRc6pPWJQ-il44Y9OVR4UXCIp7nZZB3hLKIR5-CXUm+82FfT9FrJhmZ+eEQsgFFXJ8a9646Ql08KUCpGQ15knGz7Dt06GvTdCSdgZZ3sFOsYG12xmQfA3dPaLB7l1twnGu8uINtCdo8IyIdtJrKAffJ7tkqJ8i8mxLB6h5LFIeFPtKKUfI25-C52iKVRcNLOT+MEY3Qzf3em6NOwioxfytmAoCyWYn+LIzki8adCIVVhbbk5J1t2n2iovGZxjllqbe22ozfAObTH0gRHoctsMbsCi6v62UzV2QHPeGc4ydprPj5Tck+rxdmv+WSeFzQzIdztWwLDGGfIIRxb3oq7Z9cdtyj8hV2+0DH7M0g7AO79IZJPSlDs-SwTanT0UjJGdG7lUdqR+7TNp34GXdfs2VAH9WvkM67N5cCki4VtG-W6b2kNwvTeHwpZfkgR4FVCAA */
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
