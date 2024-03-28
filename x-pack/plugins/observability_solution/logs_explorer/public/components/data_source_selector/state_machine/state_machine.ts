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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBlA9gVwCcBjMLMAGzCPRwIDoAHHJgNzHqPJ1kgGIAVAPIBxYQBkAogG0ADAF1EoJrACW6FTgB2ikAA9EADgBMAGhABPRAEYArDLoBOJw4DsTmQZsBmIwDYAvv5maJi4hCRklNS0jMw4bPTMYJq8AMJigljS8jrKahraSHrWVjIudEZeACxVTlZVNjZGBr5mlgjVXnRlBlZGVlYOtjIOVS6BwRjY+MSkFFQ09Eys7HRJKUKikrIKRXnqWjr6CANlFdW1Qw1NLW2IXg5dNi69Xi5G755GEyAh0+FzKKLWIrRIMZK8LKSVL8AD6AEExGJYRlhFgdrluPlDkVjqVXOcanVrs1WhZEDUqt0XoMXF5SjIbL5vkFflMwrNIgsYst4qt1nQVJp0GAoAQMAVYPxUAAjSEAdQAkvxUgAJWFCWHIeH8eGwgBqiok8qwGvhACEMXssQdCqBjg0rHQDF4bA5fAYqoM3XS7gg3EY6L4qozejSylUvD8-hyIvNoks4gk1uDNILhaLxbapbLIakAEqCJEawSwxUAOX4EmE+Z1isE5dN5sE-CEAFkrUobQUjiUXH6bAZyjJmV7fIznuOHNH2TM40CeUn+an0yKxRKtDm5Vl4fm1bDzQBNWHl+Ft7K7LuqW29k6eoNXIxGSMPOkGP1VXxdXxMwa+VzurYNgzqEc6AtyiagimySrpmG6aFukKCPmcJHrCyHIBI+adiA+w9riFKlHQtTemUZEvEyfpeMYdBuB6VifGMzQgf8nLxsCvLJgKQprlmkrStuEjQnC2q6lk-A4XhOL2tYHjlJURJXI0pIfqMdDPMYzzVO846RixsbgQmIJ8mCMEQFM+oqGAADuiFYEqKrqpqFZVjWdYNqauqWjk1rXvhMkII6zquu6nreq4Xh+i4VSBvUjL9NF1EuDILKTKBAJckZnHLmZFlWbZAmQhIu77mhp7npJ3bScUCAGDIVI-s+pQNF4o6ReSCC+AxtGdFULoeD4br6WBmUcUuplpuZmCWTZdnIahx4YVhlV+dVxy9IGbheDIrUyAxdj0qpVI+BtDiVP0dXRcNGXsYuUEClNqAzQVuZQhIMJajqeqGsaK3YnaNWlEOhKXPUym3B1LjvHQVjBntUN0kMBjTqyMYjbd9A8ECBR0CwqDkCoU1ClAo0FLwf03gRCAfDY3S2F+bwvD4XV+qUzLqfTn4-sGDzAajs43QumPsTjeME0TmgkyLWjk1Yl64VVAPHDTdNMl4jMun4Vis3VvhBjYfQjMynjPNdbFC3QWMLKL+OExKkukzLUhGPLUlK4gKt7WrGvM9rHWw80QZjKMKUTm8fNpax84QZb0tpqokuUEVwkIsWqLoj5V7-beLjBsRLXPt4-S2O17Sw0R0V9T4pRNFY1Fm9HRlW9QOMJ1ASdvR9onwuJFP+TVTQOM6xgugbMgpY0pfWHYtPRVYushrUzIR2y6XmzHze2pbxMd0J70iV9BpGvKfdrYgudUjURcFwM3is+rBgVPP7yAX1ThRvza+N8Cm84-j5DJ33p9MSEgJKZwVqtd2-o85Xx8DfEurM+rlAfk0A2DFqg2CqA3QyP8450H-oAruh8fon3AW7W8pRoZ2DcClOKfRGiIIcLTGK88Hi2CMK4QY2DRoxF-loOgj1nqELhIiZE6dT5QMoYGahDhaEhnoTYVmXVH4j3qF1EMnodrcIxrHbG-DBH5WEcAnuoCJEULKNIsosj+jyKMAw-288nRe2ZOPXOxhfDjE-lHHBvC8EGJskY7uR9fpkMVhQjhw5kraS6l1SoDhWZ2PsIOFwpxjCuD6oEVkmgcAQDgDoNGgsIKYkgbeAAtO6Coz4dqeHpD+d4ft2ilOfN0cee06pjHLtoi22UCDFOzlTUpfVKkhmot4WGzwbF+i-MRZwLhMHq2fMbLBXiDI8MgiZOgnBuCQD6ZTAKddBjqUqLXF4zI5lT0CuPboMVPy1ANu6SoXSY49OggDchAz7BPhGTU8Z9SagXI4bTDhHptJ1CcJ4yOqydEvIFAACxULAdAuz+4OnKFDN06iQUxVOX6IcQ8DZsN8F+YMQ4DBPKyuNV5sF1zZgEsis+JxWrqWXn0SonhPyMimQYR+BtGjlyYcpFGkL0bdMpQ9PKs06W+X6QFOZesmjVA8Rwuu48LnRT1nFJkb4agpKsOS3Bei3lhKps+P0rhaZezdGUEFdUyUrJFRvPBYs7bqAdnHelUD3iszcEC3OIwQw-gYmdfVvjDXb0TmAD1t5ByPxihFA6Hi6rxP9l+Kk9QtpyseJ6O1wrClNzwf-KNVMHD3lcZ4NwgwXQeKUXYGGJb6rVDOn4R4IbhZhv8dZIt+zOj5yaH6mk89TD+zeI-d+TUnBemSnqzJQA */
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
