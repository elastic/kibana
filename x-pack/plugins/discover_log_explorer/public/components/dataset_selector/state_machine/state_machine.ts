/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, assign, createMachine, raise } from 'xstate';
import { UNMANAGED_STREAMS_PANEL_ID } from '../constants';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgZTABswBjdAewCcA6AB3PoDcwaTDzsIBiAFQHkA4gIAyAUQDaABgC6iUPVgBLdIvIA7OSAAeiABwAmADQgAnogCMAVknUAnPfsB2W5cfPLuxwF8vxtJmxcAmIyKjoGcmYaBjA1LgBhYT48CRlNBWVVDSRtC3NbABZqADZnR3ziySqAZklHYzMEav1zagKHewLqwurq3R8-DCwcfCJSChp6JhZqGLj+ITEpWRyMlXVNHQRzfKLS23LbSpq6hsRq4ts7DuKDSXNq8wKBkH9hoLHQyYio2dpY6iERSwFRqKAASTU6DAUEoGCysASAAkAIIAOQEogA+gAFdGiYTLdIcTIbHJbArOai6aqWQqOKqSXQuNxnbbmBnUaqOawVWzdYp9F5vQKjEITcLTaL-NSA4GgiFQmFw9ZqRHxVEY7F4tEE8TmFbyEmqzaISlXGl0ymM5mueqmRCOYqtSTFfSUt26fLc4VDUXBcZhKaRGZzOUgxRgyHQ2Hw9SIvDxABKfGEwix-Cx4LRPFEAiTKJ44L4aLwWIAQnwePwALJE1bGrKm9n2xoHaptFpe5m6LoXX0BEYBr6SkPSgFAiNRpWx1UJ0QopMaisATSxaJRNdShpAayb5IsvZKtiedXM+gv1QKBTZuks+mo90szo5ztq+m8vlefqHnwlwd+MNJwVaNlTjNUuDwPgkx4VcsWg5BRCTesjSUE0D22WwHxpfRJEpRxdGKSxiI5NlHFqEpJH5fRdGZKpzF7Ad3jFQNvilP4J3lSNFRjFUEUgglRHiWCUTTLEkgEMtkELFEUh4FDd0bMlQC2HYj32Q5jkkWpWzNBjqGsejHnPZkOSY-0-yDH5QxlcMQJnPj1DwdBKDAVAAFt1U1TFcXxQk0gbND9xUxBSlafJLGaHlz2dSwyPMGxn3dXoGSdfRBXM39xSs9igK46dePA5zXI8+dF2Xcs1w3LcFL3ZTcgQWjimodLn3vbkaIMYo2Q8SxqCsN1HkFLpigyr8RSy1jR0A2zgO40DZyyYq3M8yDoNgyr4KTRDkIC1DSWyELGsKR9tKwwoClG8puodBBLtaRx2nsL19AOAxXEyj5srYscONlOaCrA1VltKgSxGErFpJ4WTRHkvbFKC+rVIYvYygqRkdLIt0DLda8CgvWwqNsT6WJHACbM4qcoAAVTUdzUDUVAYAgEHVo1dEfJ1PV4bqw6GrC-qXCiywYqsNkdnyakeUke8nWcbT+nGn8vqm8nx3+-KabphmmcgVmyqXJE4Oq7diURvmtiax8BuvWkjnIoxbs6NpbnIxwLwvfYSeHf9rPVuzuNp+nGeZ-W1pguCEKQ2qlItvR+WpXCrxlg4eSI29ykfXGiOZWkPE-QZBxVsm-b+gOwSDnXQ5clb53B2CoZhuGd155s1NRg50ZOXSW1aTxrH0SxLvvEXniVovSYlbBxSyaglDBYgwaEkSxIkqSZLkmPzebD9HBKSKDG5Up9CvcWrUfC9zS9YoChpMfC+Yn2wmn8ZZ-nqBF5SevIY32Gt4O5sRFHwnkeAUZ8CUrQ3UaE8FwbRCKSA-FRW49xvaWRoC-Mgs9UCEEIEvCGjdN481js2XoHYT4RVdEcI4BhxbWhKOYN0TJb5uEej4L8ahyAQDgJoCaxcJhmwARhAAtBRQmhE7xdGZAUGW3I2RCPdKdRkJEvRuCsPfb8E8n4-SiAI9CR0WhskFAZRk9wYpD2dKw8ej80HTRmGwDgkBdHBQak8KkdwrwFG9BcfGbJuR9Uul0PCd5IpdFQd9Wx6snFI1CrYXxj0WpPWvuUXqxQwmq1LmGAAFvKKJcdti0hxu6LCVhaIy10IYy4lF+R9GfLoGWZkrEWXCWrMuAMeJAwRLktuBSkrtBaB4OpHhxZ1GwtLJkr0LpUTSSXXKs1NYLUcmofWXSMJ3g7NQtwHhOpUUdo0coHZelEQeLabS0zfazMpgqSuIc9Y11Kiso6ay7Cux5AYUpWFxbnlGYZYJVE3BnOfn+ZxrcMIcmAQ8J44CU6XWqOLPoHYdgvlpC0AiBEAXoKBeoOe3FiAPJcReEofQGLu1wnSawUCLBuj7lhWo9hkF3lSY0yaI4MGqmoNgwgeKtjEQfM4PGNJKjPgIuLXGXIaVE3pc+NhXggA */
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
              initial: 'listingIntegrations',
              on: {
                CLOSE: 'closed',
                TOGGLE: 'closed',
              },
              states: {
                hist: {
                  type: 'history',
                },
                listingIntegrations: {
                  entry: ['storePanelId', 'retrieveSearchFromCache', 'maybeRestoreSearchResult'],
                  on: {
                    CHANGE_PANEL: [
                      {
                        cond: 'isUnmanagedStreamsId',
                        target: 'listingUnmanagedStreams',
                      },
                      {
                        target: 'listingIntegrationStreams',
                      },
                    ],
                    SCROLL_TO_INTEGRATIONS_BOTTOM: {
                      actions: 'loadMoreIntegrations',
                    },
                    SEARCH_BY_NAME: {
                      actions: ['storeSearch', 'searchIntegrations'],
                    },
                    SORT_BY_ORDER: {
                      actions: ['storeSearch', 'sortIntegrations'],
                    },
                    SELECT_ALL_LOGS_DATASET: '#closed',
                  },
                },
                listingIntegrationStreams: {
                  entry: ['storePanelId', 'retrieveSearchFromCache', 'maybeRestoreSearchResult'],
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
                listingUnmanagedStreams: {
                  entry: ['storePanelId', 'retrieveSearchFromCache', 'maybeRestoreSearchResult'],
                  on: {
                    CHANGE_PANEL: 'listingIntegrations',
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
                  actions: ['storeSelection', 'notifySelectionChanged'],
                  target: 'all',
                },
                SELECT_DATASET: {
                  actions: ['storeSelection', 'notifySelectionChanged'],
                },
              },
            },
            all: {
              on: {
                SELECT_DATASET: {
                  actions: ['storeSelection', 'notifySelectionChanged'],
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
        storeSelection: assign((_context, event) =>
          'dataset' in event ? { selected: event.dataset } : {}
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
      guards: {
        isUnmanagedStreamsId: (_context, event) => {
          return 'panelId' in event && event.panelId === UNMANAGED_STREAMS_PANEL_ID;
        },
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
  onDatasetSelected,
  onUnmanagedStreamsReload,
}: DatasetsSelectorStateMachineDependencies) =>
  createPureDatasetsSelectorStateMachine(initialContext).withConfig({
    actions: {
      notifySelectionChanged: (_context, event) => {
        if ('dataset' in event) {
          return onDatasetSelected(event.dataset);
        }
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
