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
  /** @xstate-layout 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-8nzPA-OfA0uk7MmjPjpg+W0NhwUbMhcubRpVNzwqzk0MZJseo9A9FYJKR1UqBjdJtPoDgCVWxXuSuplQfSjn7kC+4ESjKvwuWjDBmjRb23UI7LlIVanhQ8CzbO-chjSMLnPV8EdOmXKXi45uUBKDcvCkGXq1QqFXCfJzFmAdep1GDsC8MekOVf2Fj-cg5BjVNR6oUiRR1krEjeDal0dAwx6QLuOYwcSdXio0d-VxvDSperxNzXO10XyHX2t6a+MMnDkWDNDHF+L4lAA */
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
  onUncategorizedLoad,
  onUncategorizedReload,
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
      sortDataViews: (context, event) => {
        if ('search' in event) {
          onDataViewsSort(event.search);
        }
      },
    },
  });
