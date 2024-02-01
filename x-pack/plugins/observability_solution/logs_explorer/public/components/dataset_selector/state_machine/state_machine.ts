/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, assign, createMachine, raise } from 'xstate';
import {
  AllDatasetSelection,
  ExplorerDataViewSelection,
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgZTABswBjdAewCcA6AB3PoDcwaTDzsIBiAFQHkA4gIAyAUQDaABgC6iUPVgBLdIvIA7OSACeiACwAmXdQDMANmMB2UwYAcu4wEYH+gDQgAHogdmj5yU9MATmMAVmNjfQcAXyi3NExsXAJiMio6BnJmGgYwNS4AYWE+PAkZTQVlVQ0kD0QbCwtqSX1TSXNAh0lJQIsQtx0EUycmyTNRm2abSOMYuIwsHHwiUgoaeiYWahy8-iExKVkaipV1TU8EGxsHE2ddc11dBwtAyP7EEN0Q6lMLfS6Ohy6QK6eqzEDxBZJZapNYZLJbWi5LglMT5HgAfQAgsJhOiigI8OjkJieJiSjwDuUOJVTjVzjYftQLA4JsZgm1eoFTG9BlMTL1wqNAiEGfowRDEksUqt0htsoi1NRFGp0GAoJQMFVYDxUAAjZEAdQAkjx8gAJdH8dEAVQAcvkSaIBHwAEpGgBaomQlsxACFKUdqSdqqBzgBaBymL6GXSSWMOEK-aySCw8pzGSRM0z6Fr6Z5dexi2Lg+aS5IrNLrTKbbZKlVqjXB7V6w0m82WvhEkmY9EANSNogNhNJ-rKgaUwbOiEi+moBmTwScYWFujT3kzVhzxgevwTIvFpcW5Zhsur8tyddV6s16mbuuohEUsBUaigRvr16bBTNmNtAlE6IAAq-qIwgBvIQZVFOCCdIE1C5h8NhmEEEymDYPK9NcwpskCeatJENgHgkR7QjKVbwrWypXo2Wo6vej7Psqb4fjRt7IvkLp8DiHbokato8E6LokkafC2oSvp8Dw-AALLgSAxxQXSiBhjmXyJtujh3KELKBDyiazkEDjBOp5iRKYRGQlKFawnKCIXlRDY3mod4Pk+L7MdRTmwMioiYi67a+gAmuitqYtJpSHBBE6KaGyn2F8bQEZ8XSWJ8q7aIg1hwfoIRoWEFgMg00TFhKJHSpWcI1gql6OU2dGuYxr7vp5X54K6GJBeirrIKILpyQptKxQgYYadQISGD8eYvEu6UDDYIRqc0KZckMPSWBZZakRVtmUSxXn1Qx7nNbVVR4OglBgKgAC23nmr+-5ASBYFjlFNIhrUMHdPB2aIchgSoX0GUIBY-hNEMvT5X8ljmSVh5QuVNlnnZioOZ+tF6g1R17cGZ0Xdd3klH5AXBaF4X9ZBg0fSELLfCE4y6EmDTjXpITZQm25BJYwJshtZXWaeFHVajrHOQdblMcdaPqLjl03ci7Xop13W9eT0WU+c+iWE0NiBC8HS62hBgs7OwJODOxiXNYRZzMR8P8+RVX2dj6P0eLTXO9L52ywToGiGiXakuSqtvdBDI2N8-31JIIqjN0s2IFY1xoVNP0BC0vN2yeDvnoqACuagkBgapUIoABekB0a2poWlafECQIQk8CJYk+qOkXyRT73hvouvwSyFsCpcHRWGmbTGN8zRmBMbSRpEGdWVnlU59Q+eF1eJflxAld4Ma1c8cSpJ9gOQ6t8Hk5KQghjfNm2axhbRm5RYxhpj3Xy61MBjBD0DOEbDtsL2RJeyMV4FyLlADeFcWyE38haTqpMIpUjVl3OKExvgTDCKYbMeYgSAwGN4K+TwQbAjaPYLkFh57HkATtaqq8wEQK3lAhWSsXQ9T6i9DuSDoJhgZgZKw2ZfhP26HTXBXhvCmDGq0Z4GZ2ZRhmH-SylDtpI1rLQ9elAy6QP1CiP2GID5klEBSdhA1kHDRjNQfByUWi5RaGmew4jrCPAMARHuugKFbURoLC8EB5i9kUGAAA7neKu7Za78UEsJUSw4-Rnxih9MwJsH49FZu0Vko9ExjT+EhWMHxnDFRtgo9xAtHaKm8ZgXxASgk7zbDXTsdoHT11dB6L0p8jGd2goCEwrRPggxBtTBakh0JA1uF8O49Qwh2DMuneRm0EZFOXqU1A5TAnb18jAxWJMwoIPHCHC+QxMwvBBLkroC1ehpgiHBC2zRnAgymONa2JZ-6KI8cU6gCylmVKYcFZWbD27GOgnskwdw0K62BJyVwQzvDXEeJgnuHRWa-ECG42Z2dgFvL8csqBvt-aiAABqASKC6XqAcez9kHDE9WdQRRjSfgzAUHQripiGZra44Q0IW2FB8FMcj8kzP5tgaUVRqBKFfMQHyqIMTYlxPiQkeig6tM4RfCMwQmgZn0EhXWFh7CoTTA0RovRo7AmwnGawSK+WkUFcKqAortH+1lQY8lJiwzjTglcNCnQe7hECM0NMQRMyAmcC0eK6q8kPIKbM-lKwLVMWtVijEuL8WuiJXoo+ZL5U7KGhGca8FLjODdUEPMkY0wdHHrGQ2OCMx3FcdMvmJ4I1kEFagQghAxU6OJXK35bTFWRi+Jgse1gkJtC5D6hm1AdbJgtqMro5Dq2ZxlHW4M1BG3NptXGvFBKk3dhTQaB1mg8FXCMFDZkmt5r9Ofh9Hu4d6j1CBDhXcIbSqzrSPOwVYB3C0HYBdSgEIlktv9pKvEggZXdnbYg9NH0VJAnghmeoU1PX+EGXg4tc42h2HLcaqtPKa1zvNeoagr731UBYN+9Fv7dHAftWm8+GbDDZWgwI4IbJ4M8j+JBseccjWVpiMWNQ5AIBwE0A+gBVBQNUfA-wsGSU6ajE1SI4G48GOcpucCl4prF5yhE7E8MiY4KJRZMlaTnwfVQvCIpgZyn7mCaeXM6gbAOCQA0xSmCkZx55hTI8Yy4RXhAwMEYMw0NbD2DNqpqhyiFQOcdWEa4um7BSdSrJww4cFOxiUzrFTM6hPPOXgACzcuF-5BVqD-Ryk8J4EQeE8lZXOEzyWzOpeC0ozxKMPaiz1HlxVIJx7Rf03F+OCBHjhweGbZwFsGQGHq5l4Bwt9oYxy8+NrQ0GjmOptktouVvBAh5C8cerROiWGkSmKw43rO7Rai7TGEtmvwG2aJ7ubQmidB1tC+a80co8h+EYQEdMCpsn+gze9cMMvHaFpdsWjUPInU9njG683z0vBVfChLowFoIcypcQrZgrCJlaHTHm6WrMopUaAtRGiGG6hh93Bko7vDBCtlj3WsncnhzVQbNkC1kvctDbytToWvE+PRXecniAIhJ0BPS+aIJEovwTIV0XMdRujCO8+ymfzFWJkaK6q4zQGNevBXg3KmY2TjrsGhKdiucOKktcQQXw1tw6c+F-Rw+bmTciGahb4h6nAGZ7mbgVuGl3W6XPya9X8eFLjTPu+C0nhsnpxz7yNuH8MfqI3zgJ1unU9yp26rXcHddeHfu7qPu3NXe640AA */
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
                      actions: ['storeExplorerDataViewSelection', 'notifySelectionChanged'],
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
                  actions: ['storeExplorerDataViewSelection', 'notifySelectionChanged'],
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
                  actions: ['storeExplorerDataViewSelection', 'notifySelectionChanged'],
                },
              },
            },
            explorerDataView: {
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
        storeExplorerDataViewSelection: assign((_context, event) =>
          event.type === 'SELECT_EXPLORER_DATA_VIEW'
            ? { selection: ExplorerDataViewSelection.create(event.selection) }
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
