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
import { DATA_VIEWS_TAB_ID, INTEGRATIONS_TAB_ID } from '../constants';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBlA9gVwCcBjMLMAGzCPRwIDoAHHJgNzHqPJ1kgGIAVAPIBxYQBkAogG0ADAF1EoJrACW6FTgB2ikAA9EADgBMAGhABPRAEYArFbozHMowHYjAFg8A2AMxuAvv5maJi4hCRklNS0jMw4bPTMYJq8AMJigljS8jrKahraSHrWVjIudEY+7n5e7gYy9T5mlgg+lXQ2Lga2Mu5eMn4+VoHBGNj4xKQUVDT0TKzsdEkpQqKSsgpFeepaOvoIVqXlldUutfWNzYh+7g5dVkZeXgCcLm5WzyMgIePhU1GzWILRIMZK8LKSVL8AD6AEExGJoRlhFgNrluPldkV9qVXhUqjU6g0BlcEJ5bp1us5nj4bGUGl8fmFJpEZjF5vFFss6CpNOgwFACBgCrB+KgAEbggDqAEl+KkABLQoTQ5Cw-iw6EANRlEilWGVsIAQmithidoVQPt3HY6AZaa8vHTurSXKS3j46FZ3DIvFYndV+r7GWNmRFptE5nEEktQZoeXyBUKLaKJeDUgAlQQI5WCaEygBy-Akwgz6plggLBqNgn4QgAsqalOaCnsSm6LIgbAZyr6jDYXjI7N2bJ8gt9QxNwwD2dGuXGE-zBcKtKnJVlYRnFdCjQBNaEF2H17KbZuqC1tg4GW4vb1HGxVGx9Gykvqep1eIwGXz9Z7VV4hqEU7-GyUbArGySLkmK6aGu4KCBmMJ7tCCHIBIGZNiA2ytti1jPEYdptL6niVP6D5NJ2rQ+hUdKOD4XguAMziAb8LIRoCHIxtyvJLsmIpiuuEiQjCaoalk-CYdhWJWtYDTHASZxEpclHuC4Nh3PULjPFYbjuB8XgsWGIGRkCnIgpBEBjFqKhgAA7nBWCyvKSoqoWxaluWlYGhqJo5Ga544TJZK2vao5nM6Viuu6RgEbUxFMZ+dguIZwGsiZnHzhZVk2fZAnghIm7bshh7HpJLbScUCD1DeNiVPRzz4U+dikqOBj4u4dRnIcBjPD2KV-GlHFzuZ8aWZg1l2Q5CFIfuqHoWVAUVfs3QEVpRgNb0n79t2r4uLcxgugYnTPL0an9WxM5gWZEGjdlk15RCEhQqq6qajqeoLZilqVaUPbtYSFwkpRamxbUDwyFYPWqcY53TqBdA8ACBR0CwqDkCoY28lAg0FLwn0XrhCCuOpEM2J0lRHRDvWkqU9EdLYnRDG8g7uLDxmAojMzI6j6OY5o2PsbjUhWKeWHld9+zEw4DNuD4lMfAYNNdDIdBOqU22PrYBnjkyqXsTEnPUNzaMY8K-M41oeNGKLUkS4gUuk+Tct0grNP9LFqkNZ7Ol9Gzg0G4LWgI1jlD5cJcI5siqJ+WeX2XopdAdbV1TOC8X6mJRtjXnQe2qVUNL9PRrM65OA36-QhsWsH-Oh49z2ibC4n44FlW1c8drGF023Q14NOeznenHZ4rxDEYfvlwjgfxqoNdgGHT0ia92q6lKzdLYgCdJx4Pip-hxg06PFSQwxVQdb6Y6jEBZeXZPSNB2j5Dz-Xr1NzHYuLXbCCbza2+7+nfd+joD4OWzsTpDCOuPG+ldkYPyfovDUy8Ppv1tpeI4BE6RnC0t0Pof4OwtG9C8RORhIae36O4XBkD4bQKDmNVAE1bJwIjoiKOa9P5oI6GUBivUCG4JpqOAiB19INWAb7EuV8LpUKnnQWh9DGEN1fjbcWqCyjoM4VgnhqkaYM2lk+Xq+FFJVEoSZaht1xo5TkUvd6q9kFKMJg8PE9JXDrRcA8MmGd8ExQpD2IwTE7AnUeIEccmgcAQDgDoXW19QLog-peAAtK4Uk8TbhOBSak5iYjWJw3SsNaJcdCbENJL4RODVer2hkNpXwPYbBGKGuBTg3BIC5IJkFSKHwOgnDqH6c4itKJyxVk+DwRwCFqWLpfTJ7NZzgWWE0lu+wXikn7KtWith6KHDlt6GpkzrrcgABYqFgOgGZ68Dh0wHIsz8TxPBtHcYYPoOiGKHAeGs4YGSjL+yulxBcPFoIpgEkcthpzEqPEeLUSoMVCkGDasOBivpuitReWMt5E8MojWkXdXKEp-nxwHO0x8-Yhx2D8NFLwqsfSMR8M8QuQxRkTnEVkjmU8sX5PcKSP87dSZeB7P6R4thNkVykTzU26hzaMv8nkoKbglaENcH6CGWk5IDj5bfLmQcZ5QEoEyoK3Y2rD1qM8WqxhyFuwaF6T2X4+j9mMNU15esoFSIfpqyqvVkllHJeQk6jEbkHE-LcD4a1IrAK6AEG1kTjFSJkTlR1OICSJxtCI7BLiGgH1qnQYRX4Hmjn9AYQJ-ggA */
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
                  entry: [
                    'storeIntegrationsTabId',
                    'retrieveSearchFromCache',
                    'maybeRestoreSearchResult',
                  ],
                  on: {
                    SWITCH_TO_DATA_VIEWS_TAB: 'dataViewsTab',
                    SCROLL_TO_INTEGRATIONS_BOTTOM: {
                      actions: 'loadMoreIntegrations',
                    },
                    SEARCH_BY_NAME: {
                      actions: ['storeSearch', 'searchIntegrations'],
                    },
                    SORT_BY_ORDER: {
                      actions: ['storeSearch', 'sortIntegrations'],
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
                    SWITCH_TO_INTEGRATIONS_TAB: 'integrationsTab',
                    SEARCH_BY_NAME: {
                      actions: ['storeSearch', 'searchDataViews'],
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
        storeDataViewsTabId: assign((_context) => ({ tabId: DATA_VIEWS_TAB_ID })),
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
          event.type === 'SELECT_DATA_VIEW'
            ? { selection: DataViewSelection.create(event.selection) }
            : {}
        ),
        retrieveSearchFromCache: assign((context, event) => {
          if (event.type === 'SWITCH_TO_INTEGRATIONS_TAB' && 'panelId' in context) {
            return { search: context.searchCache.get(context.panelId) ?? defaultSearch };
          }
          if (event.type === 'SWITCH_TO_DATA_VIEWS_TAB' && 'tabId' in context) {
            return { search: context.searchCache.get(context.tabId) ?? defaultSearch };
          }
          return {};
        }),
        maybeRestoreSearchResult: actions.pure((context, event) => {
          const hasSearchOnIntegrationsTab =
            event.type === 'SWITCH_TO_INTEGRATIONS_TAB' && context.searchCache.has(context.panelId);
          const hasSearchOnDataViewsTab =
            event.type === 'SWITCH_TO_DATA_VIEWS_TAB' && context.searchCache.has(context.tabId);

          if (hasSearchOnIntegrationsTab || hasSearchOnDataViewsTab) {
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
