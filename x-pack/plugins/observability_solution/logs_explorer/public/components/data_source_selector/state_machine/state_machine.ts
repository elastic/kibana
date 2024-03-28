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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBlA9gVwCcBjMLMAGzCPRwIDoAHHJgNzHqPJ1kgGIAVAPIBxYQBkAogG0ADAF1EoJrACW6FTgB2ikAA9EADgBMAGhABPRAEYArFbozHjgwHYZLgCw2ZAThcBffzM0TFxCEjJKalpGZhw2emYwTV4AYTFBLGl5HWU1DW0kPWsrdzojAGYPDyqqowA2GVMLRAqjGTpvJxcKmxd2iqtA4IxsfGJSCioaeiZWdjoklKFRSVkFIrz1LR19BCtSl3KqmtOGprNLBAq3Oh97nwMDGwMfK3qbeuGQELHwyaiM1i80SDGSvCyklS-AA+gBBMRiGEZYRYda5bj5HZFPalPzHaq1DznZpXYn2DwPIweA6uFz1IZBH6jMITSLTGJzeILJZ0FSadBgKAEDAFWD8VAAIwhAHUAJL8VIACRhQhhyDh-DhMIAanKJDKsKq4QAhdGbTHbQqgPZeewGXo+BlOirPeouS6GHwVOgeequIz0+rE9wVb6-VkRKbRWZxBKLMGaPkCoUiq3iqUQ1IAJUEiNVghhcoAcvwJMJs5q5YJi0aTYJ+EIALLmpSWgq7EoeloId0+Tq2GwVRzeOz1IzhlnjKOAzlxnmJ5OC4WirQZ6VZOHZ5Uwk0ATRhxbhTeyGzbqitnf2Bg8dHqb3J9Sf94qfk9CBsnzoeKMDqsRm9XoviZCNpwBDlYxBBNkiXVNV00dcIUEbNYX3GFkOQCRs1bEAtg7HFrB8Iw6Addp3kcekXH-ep3xqYi3AAnwZFHAwZEGSdQjA9kY2BblQRg-llzTMUJQ3CQoVhDUtSyfgcLw7EbWsGRXAJU46kaUlEA8Ki7nuZ4nQ8B0DHdGwOL+NloyBLl415CBRh1FQwAAd0QrB5UVFU1RLMsKyrGsjS1M0cgtC98MUhA7RIx1nXqV1Pm7K4b2Ip1XAogDXl-MzI3AnjrIXGC7MwBznNciQtx3NCjxPOT2wU4oEFY28PkqPwTjaKwKnfKiDE6cdKSsAxBy8YCRk4-5uKs+d+KTQrUGKlzRN4AAxOUxDLbNdwPfg9wABVPDFQrqvZWP7YyKnO11bBcbwPHfGwfBsb9PmpQyfBqD4sq4yy5yg2z7MchbMywZDUIPDCsJqw7rXqwb6KI+53medKaJ7bT7E8B4XFagaalMkCp3G77IL46CZv+krFshCRoXVTVtT1A1IaxaHcWUo5KkJM4NPfANdKMKwmNpIxhbDfGxos2d6B4QECjoFhUHIFRCv5KAJoKXgmcvAiEEDR6ZFscdqQqWKUauA4bFvFKeli-XqQAz7CcluhpemWX5cV5XNFVyz1akKwz1w2qWcQXWHAN4X3uN98Bvub8ZBpV87dfHwHYliDnZ9rQ5YVpXRS9tWtA1owA-k4OdeusPnqNk3o-6exSl8Wl3GugxU5ndOXeoWXVC9ygIXE6nYQRJEUTRYLz2Zq96VvaobCMG7PneNpa7Y78-Cea6Hvnue25yoFO6tZ2Vb7qmaakuEZM1sL6rn07jGuqxqlcY2DGj+6eoF7TiReOvzt3iaYgH27sfMA-cJK0y1LqfUMor5HUQNPX0Xh57x0XrFTS+wagdHdANT8bEf7-yJhnGWWcFbkDAYPCBF8JCyXHoHKGU9gyILngvBkaC35YzoFjR+fRjJ+ifAEMW5l248SASQ8gZDT6STplAxmtDS5XkOMRbwLgXDPB4eg2wKlXCUlUZSYMjQ8ajSEXvQBmcyZFQBuQmmw9kQiDHiXIOCj3BKObmo1RGiqL2F-P+eeNJp6MiMdlABUszF0FmvNKxUjpLUNgWXRRnRXGfncdHQMPo-TPyunPVugigmENEeYualjJGUJkTAuRjjtb-nxO4JoN4XjPVNtYWoDgPD60Mo0Wo7hAhMk0DgCAcAdCgUdhBA6k9tYAFpAzvkmT6B4cz5n3FFoEr6Ts8oEFGVrcK-N3yxQSY4Bu94vApQ8AQ1ZU06CcG4JADZ19cSDH7HPXofCZCxW9AlVoKjfTBgaE6R4xJeinPTms0mNy4G9h8O+Koj12gAXvI4Qy11AW5XObyAAFioWA6BQVxONr1ZBbRHhPCsKo98BkvmpX6vPB6hjmTi2EZNX6i5BJwXTKJbFCjcXPW8ASp4g0SU9lUR0K2HNBoLyRQykmf0LEUylOy7W116idA5qovwHxG48z9Hcf0PRn7ugaBOHJKyO5mLlVs26PZSjunJZ4AWzFWmPHFaY4hSZ3a53UPnE1IUxnhX6NHDenCAIHBqFdR1ITnVH17mAU1N8ni+lhf+XoVFjYeIaHeRwjwHrKVfCcw1wyRGhNIdGvYfyHDN0pH6XorxzVm08MRNV9wW7GSeDm5Zeb96hPCQDItTSahMIFpUXhFto5o0Qa8z81IGQdW6f4IAA */
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
                    'loadUncategorized',
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
        storeDataViewsTabId: assign((_context) => ({ tabId: DATA_VIEWS_TAB_ID })),
        storeSearch: assign((context, event) => {
          if ('search' in event) {
            context.searchCache.set(context.tabId, event.search);

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
          if (event.type === 'SWITCH_TO_INTEGRATIONS_TAB' && 'tabId' in context) {
            return { search: context.searchCache.get(context.tabId) ?? defaultSearch };
          }
          if (event.type === 'SWITCH_TO_DATA_VIEWS_TAB' && 'tabId' in context) {
            return { search: context.searchCache.get(context.tabId) ?? defaultSearch };
          }
          return {};
        }),
        maybeRestoreSearchResult: actions.pure((context, event) => {
          const hasSearchOnIntegrationsTab =
            event.type === 'SWITCH_TO_INTEGRATIONS_TAB' && context.searchCache.has(context.tabId);
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
  onDataViewsFilter,
  onDataViewsSearch,
  onDataViewsSort,
  onIntegrationsLoadMore,
  onIntegrationsReload,
  onIntegrationsSearch,
  onIntegrationsSort,
  onSelectionChange,
  onUncategorizedLoad,
  onUncategorizedReload,
  onUncategorizedSearch,
}: DataSourceSelectorStateMachineDependencies) =>
  createPureDataSourceSelectorStateMachine(initialContext).withConfig({
    actions: {
      notifySelectionChanged: (context) => {
        return onSelectionChange(context.selection);
      },
      loadMoreIntegrations: onIntegrationsLoadMore,
      relaodIntegrations: onIntegrationsReload,
      loadUncategorized: onUncategorizedLoad,
      reloadUncategorized: onUncategorizedReload,
      // Search actions
      searchIntegrations: (_context, event) => {
        if ('search' in event) {
          onIntegrationsSearch(event.search);
          onUncategorizedSearch(event.search);
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
    },
  });
