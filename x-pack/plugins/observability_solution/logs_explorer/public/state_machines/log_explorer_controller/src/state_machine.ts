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
import {
  isDatasetSelection,
  isExplorerDataViewSelection,
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
  LogExplorerControllerContext,
  LogExplorerControllerEvent,
  LogExplorerControllerTypeState,
} from './types';

export const createPureLogExplorerControllerStateMachine = (
  initialContext: LogExplorerControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBkD2UCiAPADgG1QCcxCBhVAOwBdDU88SA6AVwoEt2q2BDPNgL0gBiAEoZSGAJIA1DABEA+gGUAKgEEVGBaQDyAOXWS9GEQG0ADAF1EoHKlhsulGyCyIAjAA4AzI0-uAJgAWIICAVnN3AHYfb08AGhAATw9Pc0YAgDZMsNyo72ig7xCAXxLEtExcAmIySho6BkJGDkcePn4OKDluKm5pNjAAdyEISjAWigA3VABrCcrsfCIScmpaeiZWrl4BLp6+geGEDhmAY162SgtLG5c7BycKFzcETIBOTL9zIPzvd5+mXM5gCiRSCC8AUYYX+73eYUynh8QSRnjKFXQSxqq3qGyakzau06FG6vX6gxGJFozXwvQAZkQALaMRbVFZ1daNLacdp7EkHcnHU6oC5PG53JAgB5tZyS16ZUHJDxBdzuaEA7LuIq-TLFdEgVnLWprBqbZrbXnEqAmjYABW4FDAeFgo3Gkxm8xZmLZxtxXPNPKJXRtdHtjudJ2mIsu1ysEts9hlzzliG8AV8MQBASzASiMMV4Oi4UYUThYU8QNVnneAQC+sN2I5pvxFqDJJDeDDTpdVKIjFpVAZhGZDfZHZbgY6wb9nYd3cj5xjFHFVnuiaeL1T6ZL1ZBObzabBqXc7wyYSy5kyQTCUWBl-r3qNOM5ZoJOw6wjEEhkWjkkiUuiyCIChqLatrKOomjxlK65XMmoCvO45ZQuEKpavCnwVgkSoIGkniMN45gIu8J5hO4l6ZA+VRPk2eLcoSH4QKI4hSLICgAIoAKomAAmhBGgYNB0obimEI3ukKqhIiuYquWR4IFE7i+J454ImRRThFEdblAaj6NuO9HvgIn4sT+CgqJIACyGAAGKSMgmjARZ1lCbBsoIR4QJQsUQTmAUGmBAWiCZCeBFwkUsRhCEnhBFRWJjjOE4McZTFfqxWjObZ9mOQoYg2WISgABIKEYjnSGoyCuY8cGbmJQRfCil5RIi7y3l42HgueQSMO89XhMhcQBPeOmjr6L5JUZggQIwEBkrAYBUEoTpgGcTyMFMuyzVwJJLQwq1wUIyD-poejmTo2iFWoegAOIYEoVVJrVSmKX4ZG6leFZXp88lKQUjDZFF6G9REnjaRi1H6YlhmWpAM1zQtu0rWtG18FtXSI-tlBCJxtpyAJCh4+oSgYCoygYMg4gWfoD0iR5ELeC9KnuO9KLZEE304aqcQluW8KeFERTeO9cU+s+zbQ0SsNbdw82LctmMUOtm2XDt8tPEIhNqMTpPExTpBU6dBUqDoYgKDZaj2ZxYg0zVonPWqTMs597OZD96ZhBkgReIiLXeOWIs0QZAbJVNcN9LLGNrWwEAMNjuP45r2tk3rBs2+5rgeAzDtvULrNfa7nODYwzMwmmRYUQHkPjRLjFhzLCNq3BLQx2AceE7+GhayTyeU5I1PuNYkrCbbdMnq1BE-PzMVqTWBeFgi6RRIp5ZAr5zVhJXCXV8Hk1S-Dct7VHLca53Se673+i5Xdxum+blvW6uQ9ufBGcQnCUQTyiMTXjks8-TkHtay-ECDFFS+QoibzGuLHeMNprSwjo3Sg-ZuCEAcCSeKtQBRHBGGnF+rwp7-RRCqSeMIKzvB+mhHqeYsgM28ELJCG8Rp6S3tAt8sC64IMPk3HAKC0EQ3ZFgikQhTADzXNVdOiEs6vWZrnZ2HNCw6n+l4a81ZSz81+JAsWdEYGSzgfvSOTczgAAsHRQH2GSbBrpHTujmAsZhUDtFsN0RwhuXCkHGNMeYw4FIFzRjFHGR+CZxF4MQAQj6xCUSkI+P-aIBFrx+WCPkHIeomH8Icf6Jxtd4GuKRoYkxJIvGCkpIQak-Y8D0iZF6NJWiMmtiyfoxBisPEFP5BYnxwpRRwRXIPIJj1RJhKIeRSJcRomc0Uovd4-grxpl1GWTRtFamThSi4g+uSkHMBwGjVp3jhhWImMKT0o0amvjqcs7JqyFYsE2SrUkOyhi+M6bGW4gSYLBNqgEb2jBQiTIYe8f4N4OoeAFqeTIS8fCfARINRh4MMHHImuw85Bj1nXO2rcopQhew0nKYOSpRyFknKWaHRFjSrlbLRdgh5S5uliL6XTD5uRoS3mvG1NIhQKGgoIsowGSJIjvHmUHTJyyzgzmurQDZsAWDsEJcIIwkgLIVUkAALS0LoAwIgdDIAUNddVOMQK2kkLg2qJFfDA2zIpdMmZAVv3PP9QiZYfh-P5vyqGOja7CpfKK1A4rm6x01goaQkgMAAHUFA43bnIQ1dsZGcuCL-EirU4jyVrNzGEeYUQ+B+CeWKqTYX4vhc491ppPXeujrHMN+NVUqHVZq20V1yb3RecPCRHhAjpBBMUH2rVzDmqTT8D+5gYrphmSiOh0LdLVLzTXIVIqxU4AlRsslHYuzOj2TYw59i4VTtDoWjYxa52kpuUuucEYOlUoCT015tLX7Gp6teM1gQGbVitUNce5YpJeAiCCJ1ObRaTtddOj1s750ounC+ZdPYSl9gHEOEcG6-2Cu3TOr1+6F2HpnOByl-jnkXqbSEhAN7TWtQfZapNJ41R+TzERVUmbghlB0hQVAEA4AuDxUHGltNX4AFo56IBrCWIoSkSLkSIqA5129JWnKmuxker9Qi9ozAJ3MORgRALBuO3NArJOFOwdJ5tCB6r4W7f4YIWQcgfR+mkDIAnihqLXiiMTrCtPtnQ8e+AT83miRvD9GI6QIjhG7XEBmLsHOOMk5AXTeH8zQgM3Q4ESJNLyX5mqPMSIBZ9Q+HEELiyQ573DjkhWEXarll8zFwiA7QZec5lRs81Y-ZDQKERLLBKct6Lyxc5GytUVIpfrhp6rbi7mF6lqIofnyGc2ZukajxF0y+W1E1-N9S2vdZ9WAQrdtUTfFZioxS-Mog-U-XEiIWp-j5HPGiH9gcXUIdy-Xdr3DeFdFzYI4Ya3R5Vn+v5k83bmaTO8BQ8iGRwgfMdYNoianWNXbC6127y3mlmO2UU17r8FT4SioiWL5WEuc18l8FS7bIiRH+NkebW6bucLWYrVDqLntDCR68YIsS-JagrCeGbMIKG3i+adlSKo-mqRJ-+xDgHkNud6Rx14xXovo7K-FyrhYKweyUoN5eg2QHZphb+zT0rpo7roHu+dUqWt08QALD+SlcyTJIv4fmPG355gG3mOEFZryBEohdqujnteMF13gfXK3jf03HoNdRxQyLIl7Z8Rgl4B3NToUCAdAvrs66Q96qnoHTTgYDyjqXsQ4sVb2zhIa7MMjFGCPVd+9U6MlCAA */
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
                    UPDATE_DATASET_SELECTION: [
                      {
                        cond: 'isUpdatingExplorerDataView',
                        target: 'parsingExplorerDataView',
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
                parsingExplorerDataView: {
                  always: [
                    {
                      cond: 'isLogsExplorerDataView',
                      target: 'changingDataView',
                    },
                    {
                      target: 'idle',
                      actions: ['redirectToDiscover'],
                    },
                  ],
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
        updateContextFromDiscoverAppState,
        updateDiscoverAppStateFromContext,
        updateContextFromTimefilter,
      },
      guards: {
        controlGroupAPIExists: (_context, event) => {
          return 'controlGroupAPI' in event && event.controlGroupAPI != null;
        },
        isLogsExplorerDataView: (_context, event) => {
          if ('data' in event && isExplorerDataViewSelection(event.data)) {
            return event.data.selection.dataView.dataType === 'logs';
          }
          return false;
        },
        isUpdatingExplorerDataView: (_context, event) => {
          return 'data' in event && isExplorerDataViewSelection(event.data);
        },
      },
    }
  );

export interface LogExplorerControllerStateMachineDependencies {
  datasetsClient: IDatasetsClient;
  discover: DiscoverStart;
  initialContext?: LogExplorerControllerContext;
  query: QueryStart;
  toasts: IToasts;
}

export const createLogExplorerControllerStateMachine = ({
  datasetsClient,
  discover,
  initialContext = DEFAULT_CONTEXT,
  query,
  toasts,
}: LogExplorerControllerStateMachineDependencies) =>
  createPureLogExplorerControllerStateMachine(initialContext).withConfig({
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
