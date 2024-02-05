/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, assign, createMachine, raise } from 'xstate';
import {
  AllDatasetSelection,
  DataViewSelection,
  SingleDatasetSelection,
} from '../../../../common/dataset_selection';
import { DATA_VIEWS_TAB_ID, INTEGRATIONS_TAB_ID, UNCATEGORIZED_TAB_ID } from '../constants';
import { defaultSearch, DEFAULT_CONTEXT } from './defaults';
import {
  DatasetsSelectorContext,
  DatasetsSelectorEvent,
  DatasetsSelectorStateMachineDependencies,
  DatasetsSelectorTypestate,
  DefaultDatasetsSelectorContext,
} from './types';

export const createPureDatasetsSelectorStateMachine = (
  initialContext: Partial<DefaultDatasetsSelectorContext> = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgZTABswBjdAewCcA6AB3PoDcwaTDzsIBiAFQHkA4gIAyAUQDaABgC6iUPVgBLdIvIA7OSAAeiABwB2AIzUATCYCch-ZMm6DkgKwAWADQgAnogDMX-dQBsul5O5k4ODv5e-k4AvjFuaJjYuATEZFR0DOTMNAxgalwAwsJ8eBIymgrKqhpI2nr6fpIm-pKRljbm+g5ungj+hsY2UZJeus26JoZecQkYWDj4RKQUNPRMLNR5BfxCYlKydVUq6po6CHbGXoYmTpFOTlbmU72Izg4B+iadgyFOBrMQIkFilluk1lkcltaPkuGUxIUeAB9ACCwmESJKAjwSOQKJ4KLKPAOlQ41VOdXOun8fiM4y85i8bW65n8r36k2ovgcPlG5gc1JMgOBySWaVWmQ2uRhamoijU6DAUEoGBqsB4qAARnCAOoASR4hQAEkj+EiAKoAOUK+NEAj4ACU9QAtUTIU0ogBCJKOZJOtVA5wAtIZ-B9bk5JJHDA4vtFJPp2YMmdR9P4zOn9OYbE4vEL4kD5qLUisMutspttnKFUqVf71VrdQbjaa+Lj8SikQA1PWiHU4gneiq+pT+s6IKYmahOFqRxmDHn81weRDJySp9MmYJOL4xgXCouLEvgyUV6X5auK5Wq9QNzXUQiKWAqNRQPU16-1opGlGWgSiJEAAVf1EYQfXkP0anHBBDEkcxTHTZwgn8fxzHGQJ2W6Yx+QZEITDTZpDF0A8kiPMEJXLKEq3lK86zVDV70fZ95TfD86NvOFCgdPh0VbJE9UtHg7QdfE9T4S0cU9PgeH4ABZcCQGOKDKUQIMzA+WNgmuO4vAcIjzHZWMp1QwxGU0yIpn8EiQTFUsISlaELxo2sbzUO8HyfF9WNo1zYDhUQUQdFtPQATSRS0UVk8pDgg0dlMDVTcw+Nopl0MJhn0MJlz6aJ4JMCJdB5fRqUaQxrOLciy0hSsZUvFz6wYjzmNfd8fK-PBHWRUKkUdZBRAdBSlIpBKECDLTqAcW4aXw54F2yvRwgm5oE1ZAYul8cqyPFKqHOotjfMapivNa+qajwdBKDAVAAFs-ONX9-yAkCwOHWLyQDeoYLghD8v+KJUPQnoVwQawhgGboiu+XwrILEUtrs08qNq5zP3orUmuO-b-XOy6br8spAuCsKIqiwbIOGz69N0AIHFGNK40aSbDIcPKY2CVDfFCBlNtBbb7LPRzZRR9i3MOzyWJO1H1Bxq7brhTqkW63r+rJuKKfOLcml0cxnksHXAhnZmp1CQZJzGakZx52yT0omqnKxtHGPFlqHeli7Zfx0DRERdsCSJVX3ug6lqYB+wBVGOD5pBgYAkmLNEMGdMYbmUjeYR23z1lABXNQSAwJUqEUAAvSAGKbQ0TTNAShIEESeDEiSPSHGLFPJj7gwsVmggMHk7EsNMkzaLwAmaKJxjaUMpit48KOqzPqBzvOr0LkuIDLvB9Qrvi8QJbte37JuA7HFSEFuAIk9uOnTIifQvCTCwPh1yYZ0ZLod2I2HDzTm258Fhfc-zlAFepdGwEyCiabqJNoqkjVu3RK4xY6OH+mYTK-Ikx5icNQKw1hQhtFzKyfQ09Kr8yRheRegDgFr1AQrJWDo+oDVeq3WB0Egw7mMmmTM+EmT8kcEmaY-gJqtCzEyNmYYZif1TtbWeu1arkOXpQYuIDtTwm9siHehJRDEkYUNOBo0IxYIwbTFoEQWhJlzAI6IjwZypQsLECRNkZ47QFlWCA8wuyKDAAAdzvOXFsVdBLCVEuJAcXoj7xU+lEY218ugs3aPSQesYJrfCCJGZwNwyr2IqnzRGdtZSuMwO4rxPiN7Nkrm2K0Noa6OhdG6Q+2i27QUMJgkYYRrDWD0uEWw98wjTkCN0MYM5J7J0LJIxxJDcnUHyagQp3j14BXAYrYmkVoEjkDifAY65nj-HSTYcI3R0EWC5OMSc1hJiTXzCnBxxCcnzymTM4pNCwrKwYS3HR0ENlcjuIEHWoQWQmD4dcacoZ0w6xjF0CwRDskZz-ncjxszQFex9qIAAGoBEoDp+q+07D2PsYT1YLWpppHc-TLC6CsPfQFPhAhjH5M4BM4jLlZIRtgcUNRqBKFfMQfyCJkRogxFiHE6j-b1OYSfEMsFUwGBuHBYqKD-hJhQvBO4rIwjX26NSSFzLyJso5VALlKifZCs0Xi3RQZJp5UCLGMlQRvihiTHYYeqFR40kZDYaYmqTwspWDqli+rEXIhRWix0mL1F71xSKtZI0QyFWnGmCMTTHiKqjlMGc1ALYoV+lGXSDKRlXOyV6sgbLUCEEINy1RWLhWvIaSfbcnwbDpjJVuQqugkyNGHhPKYEQTJNMIZk+GnrtXqGoMW0tBqA2ovRSGjsYadQmugtcR+4RLDXB7nYaI7JbUCLJS67oaYYy9sZf2iUBb-TUDAFoWg7BLqUGBDMstPs+WYkEIKjslaYGRoiYC7o-wu2xj-cmmMmCBiRmCERVocEPXHsHbKc9l6qAsFvXC+9ajX3GojcfKNPaJozjDKMe4pkmkbskKGNNoYDDJOzM4C5uamUDtZUO2DV6ENuKQ2OpEgbJ0OixTOudYqiIfB3OmYIQRdnv3tWmLBuy9w+F0g4OIBY1DkAgHATQcNv6rHfRhz6QZMzUBSkRdKoxMpAz6LfagjJtx6X6QKTKkGnE5E0+E4MsZ4L6bSrTIzYQFXGFzMERoxG0LNB3HZ8ZrB2CcEc-imCoZh74QTI8MyPgXjAxnM0yIaYZxpWuDcELNzBaRdNTyMGqVDO+C88DW41MLO0zXal9MuXoVVgABaeQK+84q5mzlWCsBgr47IqXTh8HS053zzANd-ntNqjs2tir+np9MBmPNlecOyR41MHiDFgs8SakYD00aPfZiZwsDroxa8+GbI1GhYL0qktoERpghHZM8R1xGjMiITGmcbMj7ZTdvGLZq3lTq3gu9p74AjXva0Tc2yaJnEA0kwU02mxUGRoR3Bkw96nDvz2Ow1dGR0JauzUDLPGIONbPD07pcF-xRjhBbcDQIVWohpljK0Wm3M+2Y9C3-ORBcFGrwYqT1SJhqSkYZFEGcLOdaw5gqlUw2tWQMnCLtnNampFY5hSxopAvVlafOHmYwwHSWFWp+me+MZzNNP5OMC2oxcsnvCW8sVsY-AtEKsVIieZiNsmBjGMl5nUJxt8EYCDHO1c0Ht0O3VxBBejSZNTWCO4f2WTSihJMlgpzhCZ-GNo1I5Oh7Gey6Dw6S0x-TOuCIOG9YWFwvanW13jE0mzXBYZquC8R5gxepjN7NeeJj4MdcYuHj69JZGOnfQCMZ6KtrYRtgfDyZiEAA */
  createMachine<DatasetsSelectorContext, DatasetsSelectorEvent, DatasetsSelectorTypestate>(
    {
      context: { ...DEFAULT_CONTEXT, ...initialContext },
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'DatasetsSelector',
      type: 'parallel',
      states: {
        popover: {
          initial: 'closed',
          states: {
            closed: {
              id: 'closed',
              on: {
                TOGGLE: 'open.hist',
              },
            },
            open: {
              initial: 'integrationsTab',
              on: {
                CLOSE: 'closed',
                TOGGLE: 'closed',
                SELECT_ALL_LOGS_DATASET: 'closed',
              },
              states: {
                hist: {
                  type: 'history',
                  history: 'deep',
                },
                integrationsTab: {
                  initial: 'listingIntegrations',
                  entry: ['storeIntegrationsTabId'],
                  on: {
                    SWITCH_TO_UNCATEGORIZED_TAB: 'uncategorizedTab',
                    SWITCH_TO_DATA_VIEWS_TAB: 'dataViewsTab',
                  },
                  states: {
                    hist: {
                      type: 'history',
                    },
                    listingIntegrations: {
                      entry: [
                        'storePanelId',
                        'retrieveSearchFromCache',
                        'maybeRestoreSearchResult',
                      ],
                      on: {
                        CHANGE_PANEL: 'listingIntegrationStreams',
                        SCROLL_TO_INTEGRATIONS_BOTTOM: {
                          actions: 'loadMoreIntegrations',
                        },
                        SEARCH_BY_NAME: {
                          actions: ['storeSearch', 'searchIntegrations'],
                        },
                        SORT_BY_ORDER: {
                          actions: ['storeSearch', 'sortIntegrations'],
                        },
                      },
                    },
                    listingIntegrationStreams: {
                      entry: [
                        'storePanelId',
                        'retrieveSearchFromCache',
                        'maybeRestoreSearchResult',
                      ],
                      on: {
                        CHANGE_PANEL: 'listingIntegrations',
                        SEARCH_BY_NAME: {
                          actions: ['storeSearch', 'searchIntegrationsStreams'],
                        },
                        SORT_BY_ORDER: {
                          actions: ['storeSearch', 'sortIntegrationsStreams'],
                        },
                        SELECT_DATASET: '#closed',
                      },
                    },
                  },
                },
                uncategorizedTab: {
                  entry: [
                    'storeUncategorizedTabId',
                    'retrieveSearchFromCache',
                    'maybeRestoreSearchResult',
                  ],
                  on: {
                    SWITCH_TO_INTEGRATIONS_TAB: 'integrationsTab.hist',
                    SWITCH_TO_DATA_VIEWS_TAB: 'dataViewsTab',
                    SEARCH_BY_NAME: {
                      actions: ['storeSearch', 'searchUncategorized'],
                    },
                    SORT_BY_ORDER: {
                      actions: ['storeSearch', 'sortUncategorized'],
                    },
                    SELECT_DATASET: '#closed',
                  },
                },
                dataViewsTab: {
                  entry: [
                    'storeDataViewsTabId',
                    'retrieveSearchFromCache',
                    'maybeRestoreSearchResult',
                  ],
                  on: {
                    SWITCH_TO_INTEGRATIONS_TAB: 'integrationsTab.hist',
                    SWITCH_TO_UNCATEGORIZED_TAB: 'uncategorizedTab',
                    SEARCH_BY_NAME: {
                      actions: ['storeSearch', 'searchDataViews'],
                    },
                    SORT_BY_ORDER: {
                      actions: ['storeSearch', 'sortDataViews'],
                    },
                    SELECT_EXPLORER_DATA_VIEW: {
                      target: '#closed',
                      actions: ['storeDataViewSelection', 'notifySelectionChanged'],
                    },
                  },
                },
              },
            },
          },
        },
        selection: {
          initial: 'single',
          states: {
            single: {
              on: {
                SELECT_ALL_LOGS_DATASET: {
                  actions: ['storeAllSelection', 'notifySelectionChanged'],
                  target: 'all',
                },
                SELECT_DATASET: {
                  actions: ['storeSingleSelection', 'notifySelectionChanged'],
                },
                SELECT_EXPLORER_DATA_VIEW: {
                  actions: ['storeDataViewSelection', 'notifySelectionChanged'],
                  target: 'dataViewDescriptor',
                },
              },
            },
            all: {
              on: {
                SELECT_DATASET: {
                  actions: ['storeSingleSelection', 'notifySelectionChanged'],
                  target: 'single',
                },
                SELECT_EXPLORER_DATA_VIEW: {
                  actions: ['storeDataViewSelection', 'notifySelectionChanged'],
                  target: 'dataViewDescriptor',
                },
              },
            },
            dataViewDescriptor: {
              on: {
                SELECT_ALL_LOGS_DATASET: {
                  actions: ['storeAllSelection', 'notifySelectionChanged'],
                  target: 'all',
                },
                SELECT_DATASET: {
                  actions: ['storeSingleSelection', 'notifySelectionChanged'],
                  target: 'single',
                },
                SELECT_EXPLORER_DATA_VIEW: {
                  actions: ['storeDataViewSelection', 'notifySelectionChanged'],
                },
              },
            },
          },
        },
      },
    },
    {
      actions: {
        storeIntegrationsTabId: assign((_context) => ({ tabId: INTEGRATIONS_TAB_ID })),
        storeUncategorizedTabId: assign((_context) => ({ tabId: UNCATEGORIZED_TAB_ID })),
        storeDataViewsTabId: assign((_context) => ({ tabId: DATA_VIEWS_TAB_ID })),
        storePanelId: assign((_context, event) =>
          'panelId' in event ? { panelId: event.panelId } : {}
        ),
        storeSearch: assign((context, event) => {
          if ('search' in event) {
            const id = context.tabId === INTEGRATIONS_TAB_ID ? context.panelId : context.tabId;
            context.searchCache.set(id, event.search);

            return {
              search: event.search,
            };
          }
          return {};
        }),
        storeAllSelection: assign((_context) => ({
          selection: AllDatasetSelection.create(),
        })),
        storeSingleSelection: assign((_context, event) =>
          event.type === 'SELECT_DATASET'
            ? { selection: SingleDatasetSelection.create(event.selection) }
            : {}
        ),
        storeDataViewSelection: assign((_context, event) =>
          event.type === 'SELECT_EXPLORER_DATA_VIEW'
            ? { selection: DataViewSelection.create(event.selection) }
            : {}
        ),
        retrieveSearchFromCache: assign((context, event) => {
          if (event.type === 'CHANGE_PANEL' && 'panelId' in event) {
            return { search: context.searchCache.get(event.panelId) ?? defaultSearch };
          }
          if (event.type === 'SWITCH_TO_INTEGRATIONS_TAB' && 'panelId' in context) {
            return { search: context.searchCache.get(context.panelId) ?? defaultSearch };
          }
          if (event.type === 'SWITCH_TO_UNCATEGORIZED_TAB' && 'tabId' in context) {
            return { search: context.searchCache.get(context.tabId) ?? defaultSearch };
          }
          if (event.type === 'SWITCH_TO_DATA_VIEWS_TAB' && 'tabId' in context) {
            return { search: context.searchCache.get(context.tabId) ?? defaultSearch };
          }
          return {};
        }),
        maybeRestoreSearchResult: actions.pure((context, event) => {
          const hasSearchOnChangePanel =
            event.type === 'CHANGE_PANEL' && context.searchCache.has(event.panelId);
          const hasSearchOnIntegrationsTab =
            event.type === 'SWITCH_TO_INTEGRATIONS_TAB' && context.searchCache.has(context.panelId);
          const hasSearchOnUncategorizedTab =
            event.type === 'SWITCH_TO_UNCATEGORIZED_TAB' && context.searchCache.has(context.tabId);
          const hasSearchOnDataViewsTab =
            event.type === 'SWITCH_TO_DATA_VIEWS_TAB' && context.searchCache.has(context.tabId);

          if (
            hasSearchOnChangePanel ||
            hasSearchOnIntegrationsTab ||
            hasSearchOnUncategorizedTab ||
            hasSearchOnDataViewsTab
          ) {
            return raise({ type: 'SORT_BY_ORDER', search: context.search });
          }
        }),
      },
    }
  );

export const createDatasetsSelectorStateMachine = ({
  initialContext,
  onDataViewsSearch,
  onDataViewsSort,
  onIntegrationsLoadMore,
  onIntegrationsReload,
  onIntegrationsSearch,
  onIntegrationsSort,
  onIntegrationsStreamsSearch,
  onIntegrationsStreamsSort,
  onUncategorizedSearch,
  onUncategorizedSort,
  onSelectionChange,
  onUncategorizedReload,
}: DatasetsSelectorStateMachineDependencies) =>
  createPureDatasetsSelectorStateMachine(initialContext).withConfig({
    actions: {
      notifySelectionChanged: (context) => {
        return onSelectionChange(context.selection);
      },
      loadMoreIntegrations: onIntegrationsLoadMore,
      relaodIntegrations: onIntegrationsReload,
      reloadUncategorized: onUncategorizedReload,
      // Search actions
      searchIntegrations: (_context, event) => {
        if ('search' in event) {
          onIntegrationsSearch(event.search);
        }
      },
      sortIntegrations: (_context, event) => {
        if ('search' in event) {
          onIntegrationsSort(event.search);
        }
      },
      searchDataViews: (context, event) => {
        if ('search' in event) {
          onDataViewsSearch(event.search);
        }
      },
      sortDataViews: (context, event) => {
        if ('search' in event) {
          onDataViewsSort(event.search);
        }
      },
      searchIntegrationsStreams: (context, event) => {
        if ('search' in event) {
          onIntegrationsStreamsSearch({ ...event.search, integrationId: context.panelId });
        }
      },
      sortIntegrationsStreams: (context, event) => {
        if ('search' in event) {
          onIntegrationsStreamsSort({ ...event.search, integrationId: context.panelId });
        }
      },
      searchUncategorized: (_context, event) => {
        if ('search' in event) {
          onUncategorizedSearch(event.search);
        }
      },
      sortUncategorized: (_context, event) => {
        if ('search' in event) {
          onUncategorizedSort(event.search);
        }
      },
    },
  });
