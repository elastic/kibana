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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgZTABswBjdAewCcA6AB3PoDcwaTDzsIBiAFQHkA4gIAyAUQDaABgC6iUPVgBLdIvIA7OSAAeiAJwBmXdUkAWSZIAcAJgBs+gIy6A7PpsAaEAE9E+q-eoW+k5OVuY24ZJONgC+0R5omNi4BMRkVHQM5Mw0DGBqXADCwnx4EjKaCsqqGkjaen7UAKySjVYONoEmFk66Ht4IjU4m1B36Y4G6k7omVrHxGFg4+ESkFDT0TCzUufn8QmJSsrWVKuqaOgi69o3UTpZWznaSuoONfYitN5K29k6tNj1nvY5iAEotkis0utMtltrQ8lxSmICjwAPoAQWEwlRxQEeFRyHRPHRpR4hwqHCqZ1qFws3Wo+kkNkaFnsJhs90a+neCBs7OoVgeJl0NnsdmuJhBYKSy1Sawymxy8LU1EUanQYCglAw1VgPFQACNEQB1ACSPAKAAlUfxUQBVAByBSJogEfAASqaAFqiZA29EAIXJx0ppxqoAu9meDMawqszUsjRFvS8iHsUf8kRMUVCjXsrn0jSlCxlKVW6Q2WS2O1V6s12rDesN1EIilgKjUUFNda1OvUsEKlvRDoEolRAAVh6JhMH5KHquc09HbPGuq4bLoLEyLDy-v4XoY41FvvYLMXEksy1CFVWlXlaxre439QaW22O12ew3dYiCu6+FiNp8KipoOjwrrukSpp8A6+IBnwPD8AAsrOIAnAuNKIAAtIKNyDPoJgOOyhanim-SDFYIxXAY+F2H4MRxKCJaXpC8qVrCNZqo+379i+b7tmqn7cX2agDqU6LulaqIBgAmqiDrokhZRHHOShhouCBYYRXw2H4FgmAmQQGSYPJ8kY8YdFyTgWACTjAox0osXKFYwtWyoPvWIlNq+rYCZ23bCY2iIemismoh6yCiO6qHodSEbYQR+hNFY7IhD0fgSjyFiNHh3yRCKorOEE57grK5bQoqcL3lxnnPs2vkfgFtXVHg6CUGAqAALYDlaw6jhOU4zuUIZqRh8UIFG5m6bGgThJuTJvKmCB3Jmop-FZoRBAx8wXhCzkVbeVUqjVT66nxDWCU1p3qK17VdWJogSVJYUKUpMXznFdQDKeIzNPo+khLZrQ8jl5nXARG5BNMhglaWrEuZVnFfl553vpdyNhrdHXdcF7qhXJEVRe9o2fRcbROMYFiTA8jgivpVgg601DTOmfhtHSfKzA5zF7eVN4ce5J08aJqN+UJzU3W12MPciaKEsSpLE1S4ZfUm-ispMfJjJIjLTLu-3UIRALfM06a6dtTG7WV17sW594AK5qCQGCalQigAF6QC+JrmlJtqgeBAiQTw0Gwf6QbDapysaVpki3ARYRRi4KV8u4S1RgZxhCs03QuACsNOXztt3iqjvO4+buexA3viZJ1ovYpykUiTKsXDhQSG40zIhOTOV0Ty9hWNZ1AZ78035nmBe8zbrkl9QZcu1Alde4auP4+F7qRdFkdoR9rfYYKRjMqegLZmKXI7unzw3FYVMvDZOX5n8U-W2xs9HfPTuL8v1er0iogogJESEkogyQ71ivvBAVM46xlGBMW+LQyJphSkYYIhFBQpUFAZF+V55TYDlNUagShOzEERNOABaJMTYlxPieWICwEqV3i3GOjgkqrkwWMOwhE6QDxcMMdkJgJ6xlsOEHB8MaD4NWIQ4hUBSH-0AXQxW4C94xy5HHUwkQOh0QeGnfoYp+TZWzMbVcLIzzcytrg9IkiyCENQIQQgZDZZAIVqApW6lMKaXPgEfSSYuh+GcLGAeHJhgckmCYcJrgZimFiIxNQ5AIBwE0I5aeaxm7Rw8VhXSFMmR6QMuYIyi1+guGZmMKyx5HC-H0GI-a-MWBpPceNLCgwjA5NPHknWQxClplFIbUp-0hiMhSuyapRd35sA4JAepY0vqDyjDGeM0NdA00mDyXw6sgghDCBEKIIyZ6I2VFM0m2EuSrVyYZTpPIUoWBKYWQwIQWSDF+Lst++z7wAAt3yHMgQCa5m54y-EqSlEIqzXC9MLGYO4Nk77PIRodJGgUzqGi+THNcxhdJtPOcZHkgjrnhPTKeawe4+QwoOgLaqGNEWvg+e2ZFHibJotvnYXS24dYMyWkspKXRB4GXFIRHWJLalzyFijeqaN-IUv7LSxpoQbDGCjFTQRllsrxlMkMEeeTrKGE3GfAVxcP7Crqj5MV4trpqCxvdKVX0HiUR1kmEIXRbUslMnSEpAJu4cj+roXV78awLwrpQD2K8DSWouIIgUkgxQihcCyc2TgB6hDjkPQi-1mh2QMlU8xpVLESNYtMiBqjh4aKiDZXwOiB55gppNaG6aWTBAFdYsMRDBLEBDQlYUAoNxUyiDlQI3J05RCSmMQwZsDCuFsPW3N6hqB2MIK2ia1wR6xh6FGHt4MTL9ruMzX48YHhEucDE6IQA */
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
