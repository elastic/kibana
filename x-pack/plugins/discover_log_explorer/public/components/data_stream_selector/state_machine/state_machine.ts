/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, assign, createMachine, send } from 'xstate';
import { UNMANAGED_STREAMS_PANEL_ID } from '../constants';
import { defaultSearch, DEFAULT_CONTEXT } from './defaults';
import {
  DataStreamsSelectorContext,
  DataStreamsSelectorEvent,
  DataStreamsSelectorStateMachineDependencies,
  DataStreamsSelectorTypestate,
  DefaultDataStreamsSelectorContext,
} from './types';

export const createPureDataStreamsSelectorStateMachine = (
  initialContext: DefaultDataStreamsSelectorContext = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrFmADZgDG6A9rgHSVk2yQDEAKgPIDiPAMgFEA2gAYAuolAAHFgEt0cmgDspIAB6IAjAGYA7AA56AFgOjjANgN6ArABoQAT0Smd9AJzmrtgL4+HaJg4+EQk5FS0DDTSYMqcvAIiEmqysApKqkga2qJ6WvQWpsb69k4u7gBMHlrulVrWNn4BGNh4BMSkFNR09NGx9GRysIrKUACSyuhgULgYGbBsAMIAEgCCAHI8ggD6AAobgvxiklmp6SpqmghaesYFNhYVpc4INgZuFe7ejf4gga0hDrhbpRGLKAZDEbjSbTWaKFQLFYbLZ7A5HLQnGTyeGZUBXCpaO7GG5fBoOF7E-LuYx1BpNP4tYLtMJdSK9MEQ4ZyUYTKYzOYIthYRYAJS4-H42242zG6w4gh4ItWHDGXHWWG2ACEuBxuABZY4pbEZS6IAC0T3yelEOi0T3JiAqBncHi+oncJXp-yZoU6ER6fXBgy5PJh-JxCywglWIpWWoAmtt1qs9UlMSAzjjTQgzTcqmZcgY7c9EDYbHp6DZC8WvYy2r7gWzA5yobzYQLlJGuCKOAntt3kIIRYbTsaLlkrmbbRZ6LZDMWHQhjMZRJXiSvHj9mkF60DWQGOcHW2G4RkfcQlmtNjt9utDiOsWksxPHRU3BY8mSyggKqZ6GZLDpX5vV3Fl-VBfoj25aE+VPFRz0jQ5BEWXssA4EVowNZJRyfE0X2uUQnnoGobFte1vwqCpRFrHdATAkF2UgyFoLbcMz1AoVo1jZY+2TVMHwzMdcWyBBrRsDwaQJL8XjMYigO3AFmT9Bjmyg0NYI7BChW7XtNUTAchwEzM8LxFwbhMAwDCdBdv1k+pfGAus6OUptD2Y0YAFVlEIVBlFQGAIC0pFr1RO8jmwx9zmE-E3wKT9bEXPQLHErRClETcaMUht9wgoN3KgLyfL8gKtKjIQUO2NCMJTIyhOzLRCJS9xSJsl5bjcHRRAMGwPQchSEJcg8mJDArvN8-zIFKri4z0pMUzTI1cPHUzROMfM8ndEpF2sKpfwsTa+oZWilMbIa8pGwrxpKjisB0vsDOHCLBKW6KXF-ExjBa8iZL0XbLAOn5fmUGgIDgNQQOc07cEWqLszNYkqjnItvvNVKqhuctka3I6sr3cDGGYVgIBh58VuLd94pLJd3g8Lx5JxgaocY4TjOWkSp0KWdMda81bji7mnkyxmcuZ+gAAtIRJkz2ZuCstBsN9igS787X-X8pMOiGTpF1T8tYuDOyltnJy0GoCiKLbvx0ZriLSjLHOO7L8d1kb9c00Cjde15OsrCw7ZR65anoTrAM1pztedtyLrG4rJo9nDYfwstxOMJKHgD36qgsXRrMFvwfCAA */
  createMachine<DataStreamsSelectorContext, DataStreamsSelectorEvent, DataStreamsSelectorTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'DataStreamsSelector',
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
            TOGGLE: 'closed',
          },
          states: {
            hist: {
              type: 'history',
            },
            listingIntegrations: {
              entry: ['storePanelId', 'retrieveSearchFromCache', maybeRestoreSearchResult],
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
              entry: ['storePanelId', 'retrieveSearchFromCache', maybeRestoreSearchResult],
              on: {
                CHANGE_PANEL: 'listingIntegrations',
                SELECT_STREAM: {
                  actions: 'selectStream',
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
              entry: ['storePanelId', 'retrieveSearchFromCache', maybeRestoreSearchResult],
              on: {
                CHANGE_PANEL: 'listingIntegrations',
                SELECT_STREAM: {
                  actions: 'selectStream',
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
            return {
              search: event.search,
              searchCache: context.searchCache.set(context.panelId, event.search),
            };
          }
          return {};
        }),
        retrieveSearchFromCache: assign((context, event) =>
          'panelId' in event
            ? { search: context.searchCache.get(event.panelId) ?? defaultSearch }
            : {}
        ),
      },
      guards: {
        isUnmanagedStreamsId: (_context, event) => {
          return 'panelId' in event && event.panelId === UNMANAGED_STREAMS_PANEL_ID;
        },
      },
    }
  );

// Define a conditional action to restore a panel search result when a cached search exists
const maybeRestoreSearchResult = actions.choose<
  DefaultDataStreamsSelectorContext,
  DataStreamsSelectorEvent
>([
  {
    cond: (context, event) => {
      if (event.type !== 'CHANGE_PANEL') return false;

      return context.searchCache.has(event.panelId);
    },
    actions: send((context) => ({ type: 'SORT_BY_ORDER', search: context.search })),
  },
]);

export const createDataStreamsSelectorStateMachine = ({
  initialContext,
  onIntegrationsLoadMore,
  onIntegrationsReload,
  onIntegrationsSearch,
  onIntegrationsSort,
  onIntegrationsStreamsSearch,
  onIntegrationsStreamsSort,
  onUnmanagedStreamsSearch,
  onUnmanagedStreamsSort,
  onStreamSelected,
  onUnmanagedStreamsReload,
}: DataStreamsSelectorStateMachineDependencies) =>
  createPureDataStreamsSelectorStateMachine(initialContext).withConfig({
    actions: {
      selectStream: (_context, event) => {
        if ('dataStream' in event) {
          return onStreamSelected(event.dataStream);
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
