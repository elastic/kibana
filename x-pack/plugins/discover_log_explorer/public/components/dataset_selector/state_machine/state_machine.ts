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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgZTABswBjdAewCcA6Ew87CAYgBUB5AcQ4BkBRAbQAMAXUSgADgwCW6KeQB2YkAA9EAVgBMAGhABPRAA4AjNTWDzggJxqjAFgODbANicBfVzrSZsuAsTJU1OTiYPJMAMLcbHgCIkqSsDJyikgqiEZGLtTO9hrWBgZqThpqOvoItraC1EYA7E6CdgYAzIJFghrN7p4YWDj4RKQUNMGhrJw8saKpCUkKSqoIGQ3ULrWWjU6WzbW2dmXqzbbZarUaxmZqzoJuHiBefb6DASMh8tSEUrCy8lAAkvJ0GAoJQMMlYBEABIAQQAchxeAB9AAKcN43CE0wk0lk81Si1szRMLTU2xsTk0RksBgOCEstQM1B2Ng6jlsGnOtW6916PgG-mGQTeHy+P3+gOBoNx8gh4Rh8KRqNh6P4RixIFm0oWiEJxOapP1mUp1NpRUs1BuGlqzX1DnaGm5Dz5fiGgVG70+3ykvwBQJBYIUELw4QASmxuNxEexEX9YSxeBwQ9CWH82LC8IiAEJsFjsACymPiOOS2oQBlqFosVerzVp9Q0NVqVJtnWpxiMjt5-RdLyFoRFXp9Ev90qDvGhIblWYAmojYdC81Mi4ktfj0ldVpY7OZ2fTbKcaXpEE5moz6mpSQyjESbAZO95u89Be6B2LfZKAzKmHg2CGWDPEV-ZBeBDQsZmLPFQEWTIGxaDRBCJKwMlOIxTSMNQmVJDRilPJx2Ww+9Hn5V1Xn7T032HKVkjwdBKDAVAAFtZXlBEUTRDE4nAlcSzXBBigwqk1COWp1gMSx6UPcpb1MYomy2NoXEI50nzdYVyO9cU-SohQaLoxixz4cJ-2QZNoRiFgwOxbjILSJZr0ZJx1kcm1TyKEpaQpBtLXqLZWmaJwOzuJ1HwFVSyNFDT3xHajaPopjv3HSdIQA+dF0sjUIJSKDDCqahsKKIwEJbIw8lpZpLGOdCT1k7YGXLLogq7J5QtIj0IqHLTP10uKg1-f9M1nICQPSzUeOyst7ErcrCo6ToOUsWkrWqWozA6a1HLaCqGp6B9mpIvs2sHKAAFV5AY1B5FQGAIG6-SoThVilRVTirLmLLbP4mprGE0TxIZWlLCtahyzMQp-O2c5bh2oie2fNT2pOs6LquyBbvimJDOM0zzJGzLSwyU9Vic60bUKfiAcqbINCpdkXBaOxbCUkL9pfdTflO87LuutGxwnKcBrnBcly4t7SwMXLGgK6m5v82paQcZpsicMTsLsalKi5RrduI3tWYRjnke52K7p-P8AKG0CXoy6z3sWcWKwMeCrWw2oOjpjyHAtWSyfQsw8ncO55HICA4CUYK9peZdRd4gBaRlxITxPE7OWkY4wpPHEKQSjiZiPBToBhICj1dxuvQkvqEuoxNw6wPMcGSrT9i9rihnltdhsL3tGmzFnKytqwH2sjyWFo8tWq1Zc2wlc51uH+wAC1FYuxtswqnAb+w6lPHYjEd2l92OfVtgCtp1gvQLoeUlqDtfSLKM-eARZL1ebg34xrRaJtxflk9VhKRwSpbAZCJGeHdWq3w6h+aUPNl490MIICslhlZnAaMsfUpoOQNy2I7eCt4L5txhipcBbNEacxRjdY2TFYG23gYg5B2FGiZHQcPbYxIVo3DpnsAwFIA6uCAA */
  createMachine<DatasetsSelectorContext, DatasetsSelectorEvent, DatasetsSelectorTypestate>(
    {
      context: { ...DEFAULT_CONTEXT, ...initialContext },
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'DatasetsSelector',
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
              },
            },
            listingIntegrationStreams: {
              entry: ['storePanelId', 'retrieveSearchFromCache', 'maybeRestoreSearchResult'],
              on: {
                CHANGE_PANEL: 'listingIntegrations',
                SELECT_DATASET: {
                  actions: ['storeSelected', 'selectStream'],
                  target: '#closed',
                },
                SEARCH_BY_NAME: {
                  actions: ['storeSearch', 'searchIntegrationsStreams'],
                },
                SORT_BY_ORDER: {
                  actions: ['storeSearch', 'sortIntegrationsStreams'],
                },
              },
            },
            listingUnmanagedStreams: {
              entry: ['storePanelId', 'retrieveSearchFromCache', 'maybeRestoreSearchResult'],
              on: {
                CHANGE_PANEL: 'listingIntegrations',
                SELECT_DATASET: {
                  actions: ['storeSelected', 'selectStream'],
                  target: '#closed',
                },
                SEARCH_BY_NAME: {
                  actions: ['storeSearch', 'searchUnmanagedStreams'],
                },
                SORT_BY_ORDER: {
                  actions: ['storeSearch', 'sortUnmanagedStreams'],
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
        storeSelected: assign((_context, event) =>
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
      selectStream: (_context, event) => {
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
