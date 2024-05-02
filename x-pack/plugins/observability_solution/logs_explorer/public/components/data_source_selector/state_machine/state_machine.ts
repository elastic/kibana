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
  isAllDatasetSelection,
  isDataViewSelection,
  SingleDatasetSelection,
} from '../../../../common/data_source_selection';
import { DATA_VIEWS_TAB_ID, INTEGRATIONS_TAB_ID, UNCATEGORIZED_TAB_ID } from '../constants';
import { defaultSearch, DEFAULT_CONTEXT } from './defaults';
import {
  DataSourceSelectorContext,
  DataSourceSelectorEvent,
  DataSourceSelectorStateMachineDependencies,
  DataSourceSelectorTypestate,
  DefaultDataSourceSelectorContext,
} from './types';

export const createPureDataSourceSelectorStateMachine = (
  initialContext: Partial<DefaultDataSourceSelectorContext> = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgZTABswBjdAewCcA6AB3PoDcwaTDzsIBiAFQHkA4gIAyAUQDaABgC6iUPVgBLdIvIA7OSACeiACwAmXdQDMANmMB2UwYAcu4wEYH+gDQgAHogdmj5yU9MATmMAVmNjfQcAXyi3NExsXAJiMio6BnJmGgYwNS4AYWE+PAkZTQVlVQ0kD0QbCwtqSX1TSXNAh0lJQIsQtx0EUycmyTNRm2abSOMYuIwsHHwiUgoaeiYWahy8-iExKVkaipV1TU8EGxsHE2ddc11dBwtAyP7EEN0Q6lMLfS6Ohy6QK6eqzEDxBZJZapNYZLJbWi5LglMT5HgAfQAgsJhOiigI8OjkJieJiSjwDuUOJVTjVzjYftQLA4JsZgm1eoFTG9BlMTL1wqNAiEGfowRDEksUqt0htsoi1NRFGp0GAoJQMFVYDxUAAjZEAdQAkjx8gAJdH8dEAVQAcvkSaIBHwAEpGgBaomQlsxACFKUdqSdqqBzgBaJ6SajCwLA5n+YxTYw8pzGKNWfT6YwPX4OEIi8XzSXJFZpdaZTbbJUqtUa4PavWGk3my18IkkzHogBqRtEBsJpP9ZUDSmDZ0QkX01AM1m6jjzbI+Ke86dMmezulz+ZshYSixLMNlFfluWrqvVmvUDd11EIilgKjUUCNNYv9YKZsxtoEonRAAUv1EYQA3kIMqnHBBOkCagWn0D4bDMIIJlMGweV6a5hTZIF9CsZoWV3SEpVLWE5QRU9lXPOstR1G87wfZVn1fKir2RfIXT4HFW3RI1bR4J0XRJI0+FtQlfT4Hh+AAWRAkBjnAulEDDTMvhCCxs0cO5QhZQIeVUqcggcYJVLMCIHFMAji2hGVy3hKsKNrS81GvW970fRjKMc2BkVETEXRbX0AE10VtTFJNKQ5QNHeTQ0U+wvjaSI7BCLpLE+XQeWsaC4JQsILAZBpolicEi33KyyzhSsFTPBz6xolz6KfF8PPfPBXQxQL0VdZBRBdGS5NpGKEDDdTqBCQwfhwl4nCXbQ6nzUbmkkZ5TCGHpLAs0rpXK0i7KYzy6rotympqqo8HQSgwFQABbLzzS-H9-0A4Dh0imkQ1qSDuhgtd4MQwJkL6WaEAsfwmiGXpcr+SxzKKiVNuIo9bKq+y32ovV6qOvbgzOi7rq8kpfP8oKQrCvqwIGj6QhZb5ksTTcWgaMbdJCLKFzuYJnnsQINqhLaSOPMjFRR5inIO1yGOO1H1Bxy6buRNr0Q6rqerJqKKfOLNGkkGxY30DpYxQgxmanYEnEnRMGQMHmiMPGzKvIrG0do8XGsd6Xztl-GgNENF21JclVbeiCGRsb5-vqSQRVGbp0qBqxrhQyafoCFprYPayKpPRUAFc1BIDA1SoRQAC9IBoptTQtK0eL4gQBJ4ISRJ9IcItk8n3vDcIpyzFpujgkGQYZFM2iMUJWgZ-6swZNOyv5pHT1z-PzyL0uIHLvBjUrrjiVJbte37ZvA7HBSEEMb41zXXRxkMkIfmTIHnGFaNJ4MYIek3HdYZK3mEbtrPqEXgXKAK8y6NgJn5C0HUSbhSpGrDusUJjfAmGEFamYLBAkBgMbwZ8ngg2BCPNkPwZ580RvbHOecgEgLXmAhWSsXTdV6i9NucCIJhnpt8Kwa5fhqW6MlTBXhvCmFGq0Z4aYFymDCMQ3+mdBYAIocvSgJdQH6hRD7DEO8ySiApEw-q8CLgoTDpcR4QQ9ZDBTPYUO3R-rBB+J8FCMM5h7h-rbGRVYIDzC7IoMAAB3a8FcWzV14vxQSwkBx+iPtFD6ZgTY3x6CzdorJh6qVGn8BCV8PjOEKo4wi6dtoCzcR4rxvj16bwCW2O0Dpa6ug9F6Q+Oj24QUBCYVonwB6RzzMlVCD9DBfDuPUMIdhIgXykS4naVV3GYE8T4vx4CibBVCjAkcQcT5DCjC8EEmSuj5l6CmCI0FEx4RwtrOCmYRkZzGaeCZqApnFJoS6dqQVlaMNbroiCqyTB3BQrGOMLNXAP28NcYxa5Yx5h6HrM5eT56KiuTcmZ3tfYaL3n2CJ6s6jWGjICLoSYr71FjlgrM1xwg-HqFcewvQxRfycTbGU2BpRVGoIwVAd4JkMXTlULgKK9FhmSgncGLw1IvBwk8FM6CjD9LMDYFmeYswhAhTQWlKx6WMuZZqJ8bL1AcocC8hpJ9uV-GoGZLkkcsyCt+CmVk0YeGGDsNK0IcrqAKrIEqpligWVqqsuy8Q+htUsN1WEKMXzBEglNX8rBoomSJkyjasadrKU5Nng6j16gHUMWIN5VEGJsS4nxISDRAd6m+sGk4UOjg8orSpvYUIeURVsmaZ8Eli4hj2sdcGFNT402qIRR2fNPrlmDSUpIIwBtMo4UnMKFMEiTZjUCEtfQlxko4WbUmxUSh21gHTWov2nYezIoLX2j6SlgTTlCFmZobI0HCofh0IR2twhpjUhsuCS66XJqZYQDdXb-ZaM5RBSw0Fb4vEjihUYVhJUTsZMGzWdg7BLQccVKluT5XLuoG+j96iOxIoND+k+lhjDRi5iDE1EwDD3wGIlIRC7lJJTaM+xVyaYVFLQ1iTiOat09tgfu84xaTAin5cyemm5uRA1SUIrSeZcE-EHbRp19HCk+KY3m79e7j79rytQS4kwJVX2zJHFM16mgIUFA+q4T642WRIS2+lDH5OdvQ7vHdWHlORPDIZa4t6Z2gbypEHZwmnhCJ1hp1oHQY2yrBGocgEA4CaDhs41YHGVMHq4WDRKnwUroP4cDPDwRQhX0Hl8l49q-7xec4pVS0EEoslSyBz4E7AXhA+EtbW+WKXZPM9I0ibAOCQGK6iyCZk8NHPQYZUIXcHA8gMKPcwVhbD2DNoV1xCoetcrCG5tclXkrVYy9a6M9XctNZ1gVsz8NRn5KqgAC1cktt5anJ5U2ZGpQwZqgZEuPTlxrIdYzzYuULN2os9RXd1SCPDFXqObbxXoamDwzbOAttYFr8H40kL-rI4W+10YXYfADotzgTDTCSitTcN8eTBFDg0cIeUyeAmZF907DtmpOwxhLX78AlkJfDH8G9nQdbGMlZKuCGV0EGtS3lNk-1Cc06hdVKWf3nYNXcidd2uMbpY4+nrKcowWa-BBBrkUGVLg7Z+BI3CtNuZHdi5Cshcil6F0UavGiKv2cMnU94GxBhVJBHHd06mc6DaLga2pCXlvrO3N1A7xAplviAg6PO7Xa4UyRC+B0DBExLajGkwl15fq1OBp8DrNBoavC316dO2d87mgWHT86lVbl1XvUz-2oEeGVp5klYOqbM0sHlujPmUI2tUtwZi9StIlnk2rqgMQMPQ19V3sTNmdcykcIit6M7hodgCeTgr2bofSGX2KjfZP7MjQzANGaBIwdAG9MGCZJJro5+Vp5Ur7JyZRTJ-DSnHwiIDWWQi892R5wU5iM9Z6Z+kKUYggA */
  createMachine<DataSourceSelectorContext, DataSourceSelectorEvent, DataSourceSelectorTypestate>(
    {
      context: { ...DEFAULT_CONTEXT, ...initialContext },
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'DataSourceSelector',
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
                SELECT_ALL_LOGS: 'closed',
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
                    FILTER_BY_TYPE: {
                      actions: ['storeDataViewFilter', 'filterDataViews'],
                    },
                    SORT_BY_ORDER: {
                      actions: ['storeSearch', 'sortDataViews'],
                    },
                    SELECT_DATA_VIEW: {
                      target: '#closed',
                      actions: ['storeDataViewSelection'],
                    },
                  },
                },
              },
            },
          },
        },
        selection: {
          initial: 'validatingSelection',
          states: {
            validatingSelection: {
              always: [
                { cond: 'isDataViewSelection', target: 'dataView' },
                { cond: 'isAllDatasetSelection', target: 'all' },
                { target: 'single' },
              ],
            },
            single: {
              on: {
                SELECT_ALL_LOGS: {
                  actions: ['storeAllSelection', 'notifySelectionChanged'],
                  target: 'all',
                },
                SELECT_DATASET: {
                  actions: ['storeSingleSelection', 'notifySelectionChanged'],
                },
                SELECT_DATA_VIEW: {
                  actions: ['storeDataViewSelection', 'notifySelectionChanged'],
                  target: 'dataView',
                },
              },
            },
            all: {
              on: {
                SELECT_DATASET: {
                  actions: ['storeSingleSelection', 'notifySelectionChanged'],
                  target: 'single',
                },
                SELECT_DATA_VIEW: {
                  actions: ['storeDataViewSelection', 'notifySelectionChanged'],
                  target: 'dataView',
                },
              },
            },
            dataView: {
              on: {
                SELECT_ALL_LOGS: {
                  actions: ['storeAllSelection', 'notifySelectionChanged'],
                  target: 'all',
                },
                SELECT_DATASET: {
                  actions: ['storeSingleSelection', 'notifySelectionChanged'],
                  target: 'single',
                },
                SELECT_DATA_VIEW: {
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
        storeDataViewFilter: assign((context, event) => {
          if (event.type === 'FILTER_BY_TYPE') {
            return { dataViewsFilter: event.filter };
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
          event.type === 'SELECT_DATA_VIEW'
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
      guards: {
        isDataViewSelection: (context) => isDataViewSelection(context.selection),
        isAllDatasetSelection: (context) => isAllDatasetSelection(context.selection),
      },
    }
  );

export const createDataSourceSelectorStateMachine = ({
  initialContext,
  onDataViewsFilter,
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
}: DataSourceSelectorStateMachineDependencies) =>
  createPureDataSourceSelectorStateMachine(initialContext).withConfig({
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
      filterDataViews: (context, event) => {
        if ('filter' in event) {
          onDataViewsFilter(event.filter);
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
