/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, assign, createMachine, raise } from 'xstate';
import { AllDatasetSelection, SingleDatasetSelection } from '../../../../common/dataset_selection';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgZTABswBjdAewCcA6AB3PoDcwaTDzsIBiAFQHkA4gIAyAUQDaABgC6iUPVgBLdIvIA7OSAAeiAIy6ATAGZqBgBwAWMwHYzdgwE4zD6wBoQAT0RGj16gDYzIwBWKwdJC2CDawMAX1j3NExsXAJiMio6BnJmGgYwNS4AYWE+PAkZTQVlVQ0kbUQbP0kDf0l-IwddSUkXYPcvBH99ah6jNqMzFrMDXSN4xIwsHHwiUgoaeiYWanzC-iExKVl66pV1TR0EO11qI0MLDosLXWsHWYHEUOCAmJ6u3QWBxWawLEBJZapNYZTbZXK7WgFLjlMRFHgAfQAgsJhOjSgI8OjkJieJjyjxjlUODULvUrmZ-H5rLopp0jO1rMEHP5PkMZndOT5JJ1ggy4glwUsUqt0hssts8oi1NRFGp0GAoJQMLVYDxUAAjZEAdQAkjwigAJdH8dEAVQAckUSaIBHwAEomgBaomQ1sxACFKadqec6qArgBaXT+H4GZ4RSS6YIxfwWSRuTx6OaSajWfwGVrRcIRIzixbJFZpdaZLY5HZ7FVqjVa0O6g3Gs2W618IkkzHogBqJtERsJpMDlWDSlDl0QswM1AsrTTDnuSZFFl5+nZufzxmeMSTorBEOlVZh8rrioKjfVmu16jb+uohEUsBUaigJqb99bxQtmL2gIojogACoBojCEG8ghrUs4IN0DimPmoRBP4-hOO0Zi8pytwOMEnRAtEbSzGYJ5SpW0JyrW8INqqd4tjqerPq+76ql+P6MY+yJFG6fA4t26ImvaPAum6JImnw9qEv6fA8PwACy0EgGccF0ogEYFj8yZGBY9yPCELIOLyyYLhhuirjpHSzP45EVlCso1nC9ZKrezYPmoT4vm+H4cQxHmwMioiYm6Xb+gAmui9qYgpFQnDB05qeGGl6T87SkZEYzWJEm6ZkMQKmMEgQEbYjLMnZkIytWsIKgiN70e5rbMd5bGft+-l-ng7oYhF6Lusgohuspqm0slCARrpJhRI8MRvLMSa5YMZjBNpLTptywwuL4FVnlRTm1XRnEBc1rG+e1jW1Hg6CUGAqAALaBZagHAWBEFQZOCU0mGDQIb0yEGKh4wYVMMY4YmozDJyJUGMKeY7ZRjk1VedXKg1v5MQaLVnUdoZXTd92BeUIVhZF0WxcNsGjT9wQsgEwTCpYKbWJyBgmVypjro8q5vHpDjww51WXrRrlo1xnknT57Hnej6h47dD3It16K9f1g0U4lVNXMYzTOO8XQONylis3lK0LsC+jzpMDJLvzVUXjRLn1TjGMsZLbXO7L13y4TkGiGivakuS6tffBXK3GYFncnp7LssCOGTIu4zWC09P6PmtkSqeCOCw717KgArmoJAYBqVCKAAXpAzEduaVo2sJokCOJPCSdJfoTvFKmU99kaOEhpGTIKdhdHmW7tCYJHjFM7TRrMtvntRzl59QhfF3eZeVxA1d4KateCcSpKDsOo7t8HM7qQgcYBOncYMxZRXWEYW6OD8BszEuq4uBYtjz3tSPCzeVeJcoAbyru2ImoUrS9TJnFKkGse4pSmAEKYBF0IFmyvhLcpYLDUFeMnYE7ReaMl-ojIWjsC5F2AaAre4ClYqzdANIaH0u7wPghGb+Zk8z5lmrHem-Q8rbn8NQIq612TrhjPMTOFEBb2yXijFelD16UArmAw0KI-YYgPmSUQFJmEjQQeNOMOC5hxnpq0IqrQtx6SEamF4S5SKOAsCQnOciGwQCWAORQYAADuT4a5dnriJMSEkpJjgDGfJKP1xhm3vn0bknRWRj2TMImGQQ0yhEMLoZxsiDquXcZgTxPi-E707HXHsDonSN3dF6H0p89Hd3goCO4bRIjJ2TjTFakhsICNMYuQIQ8lyzwzuWSqC99rIzcR4rxvjt7BUgcrUmMVYFThDhfYYOZ3hWEyT0FanIsGODuFMecycZhRDLJKeydtF65JvPk1AhSZm0LdD1SKqsmGd30fBdZdxHiBANsCTk7wtxzFuC8NBBskwuEcNk65Ey8lTKKbM1Emi+xHxHBEzWiAR4cycARLky0IiLT0HGBcekZiWFCOyGYMLMjYFlLUagShPzECCsirEAl8SEi0UHeprCL5RlXKMdk5hOhf0mO0LczMmR8OBPhdkjwnFSMuWMmgdL1gMqZVAFl6j-bcp0RigxEYohIQjoEbojgfDhGNoMaM4RcEvALKmEIQQug0tVVRBlqBCCEFZRogO2jdEfIafy6MPx0Lj1TEEdo3Itypj8M4VMDNHjT1BGCNQ5AIBwE0FnGRGw4GrLGhGbhEMMr01hpEeO1BVwhF8HmRMI9ghurIZQfN59C3JiQulFkmVy38JtcMRONabB6RaM8PmSrRl-2bdQNgHBICtsiVcNOJhojpheJZHwHw8pLhweMXwqZzB6Qtk23OKMF2YvGgRW4XaKVZQrXlOMZgq0+AIlC0UpkT2uNcgACx8uegxjIn1OABq8V42CYi8h8EI6OoR0xdL+eOkZu1SGnsOh1F2-62FWBMDentvgcq8heE+543RcLjEkFEVNSHs45LhU7dDj5mq-vfJhi+zNcE03Se0IqcwgS8neBPRMsMxHpjhhO5DLibmow9uLTGp0pYyfgCsttP1NLtFGN0ZwYLlrLQBryRkxjMq2FFYzLJ4maOwoAdJhjsnXatT8hdT2+MHqsbGo4BcwouQxCsJ50U+m7DPsZDGOt9NOifqkwotepdlGb2Yq51T5ghERzZAe5MGFME9NpuYA2HR8KwcfuFujyo7kPKfPFq4pZbjDCBCyZaPn8zPyTFWwE+EpjW2FE2tVZBImfP5cmeN0YI4tGrVarcIi7jxJBN-EFVGLmTtIV10MjL2LEHKxpXSnbIif3uBhaI0YtwgwCDDXw+hy3QvM7m2lHr1DUC9YQNbCEmu+GHZ-Dh+g+16Ajjg47zJjDLU6ZI+IQA */
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
                    SELECT_DATA_VIEW: {
                      target: '#closed',
                      actions: ['selectDataView'],
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
              },
            },
            all: {
              on: {
                SELECT_DATASET: {
                  actions: ['storeSingleSelection', 'notifySelectionChanged'],
                  target: 'single',
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
          'dataset' in event ? { selection: SingleDatasetSelection.create(event.dataset) } : {}
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
  onDataViewSelection,
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
      selectDataView: (_context, event) => {
        if (event.type === 'SELECT_DATA_VIEW' && 'dataView' in event) {
          return onDataViewSelection(event.dataView);
        }
      },
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
