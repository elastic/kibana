/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, assign, createMachine, raise } from 'xstate';
import { AllDatasetSelection, SingleDatasetSelection } from '../../../utils/dataset_selection';
import { INTEGRATIONS_TAB_ID, UNCATEGORIZED_TAB_ID } from '../constants';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgZTABswBjdAewCcA6AB3PoDcwaTDzsIBiAFQHkA4gIAyAUQDaABgC6iUPVgBLdIvIA7OSAAeiAJySAbNQAcu3QFYA7Od0BmA7au2ANCACeiW7YAs1S98ljACYLb0dbYwMAXyjXNExsXAJiMio6BnJmGgYwNS4AYWE+PAkZTQVlVQ0kbT0ggEZqc0lzINt6g2MfY0tdVw8EK19OrwjbMzNvIJi4jCwcfCJSChp6JhZqHLz+ITEpWRqKlXVNHQRdevM-QJDLB0kLa37EVqvJIIN66w-eh-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 */
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
                },
                integrationsTab: {
                  entry: ['storeIntegrationsTabId'],
                  on: {
                    SWITCH_TO_UNCATEGORIZED_TAB: 'uncategorizedTab',
                  },
                  initial: 'listingIntegrations',
                  states: {
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
                    SWITCH_TO_INTEGRATIONS_TAB: 'integrationsTab',
                    SEARCH_BY_NAME: {
                      actions: ['storeSearch', 'searchUnmanagedStreams'],
                    },
                    SORT_BY_ORDER: {
                      actions: ['storeSearch', 'sortUnmanagedStreams'],
                    },
                    SELECT_DATASET: '#closed',
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
        storePanelId: assign((_context, event) =>
          'panelId' in event ? { panelId: event.panelId } : {}
        ),
        storeSearch: assign((context, event) => {
          if ('search' in event) {
            context.searchCache.set(context.panelId, event.search);

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
        retrieveSearchFromCache: assign((context, event) =>
          'panelId' in event
            ? { search: context.searchCache.get(event.panelId) ?? defaultSearch }
            : {}
        ),
        maybeRestoreSearchResult: actions.pure((context, event) => {
          if (event.type === 'CHANGE_PANEL' && context.searchCache.has(event.panelId)) {
            return raise({ type: 'SORT_BY_ORDER', search: context.search });
          }
        }),
      },
    }
  );

export const createDatasetsSelectorStateMachine = ({
  initialContext,
  onIntegrationsLoadMore,
  onIntegrationsReload,
  onIntegrationsSearch,
  onIntegrationsSort,
  onIntegrationsStreamsSearch,
  onIntegrationsStreamsSort,
  onUnmanagedStreamsSearch,
  onUnmanagedStreamsSort,
  onSelectionChange,
  onUnmanagedStreamsReload,
}: DatasetsSelectorStateMachineDependencies) =>
  createPureDatasetsSelectorStateMachine(initialContext).withConfig({
    actions: {
      notifySelectionChanged: (context) => {
        return onSelectionChange(context.selection);
      },
      loadMoreIntegrations: onIntegrationsLoadMore,
      relaodIntegrations: onIntegrationsReload,
      reloadUnmanagedStreams: onUnmanagedStreamsReload,
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
      searchUnmanagedStreams: (_context, event) => {
        if ('search' in event) {
          onUnmanagedStreamsSearch(event.search);
        }
      },
      sortUnmanagedStreams: (_context, event) => {
        if ('search' in event) {
          onUnmanagedStreamsSort(event.search);
        }
      },
    },
  });
