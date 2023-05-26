/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, createMachine, send } from 'xstate';
import { INTEGRATION_PANEL_ID, UNMANAGED_STREAMS_PANEL_ID } from '../constants';
import { defaultSearch, DEFAULT_CONTEXT } from './defaults';
import {
  DataStreamsSelectorContext,
  DataStreamsSelectorEvent,
  DataStreamsSelectorTypestate,
  DefaultDataStreamsSelectorContext,
} from './types';

export const createPureDataStreamsSelectorStateMachine = (
  initialContext: DefaultDataStreamsSelectorContext = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrFmADZgDG6A9rgHSVk2yQDEAKgPIDiPAMgFEA2gAYAuolAAHFgEt0cmgDspIAB6IArACYANCACeiABwBGegBYAnLZMmAzNYDstyzucBfTwbSYc+EQk5FS0DDTSYMqcvAIiEmqysApKqkgaiGZa2fSiAGw6upaizpYOeaJaBsYIWnkW+YVmedZ5zo4ODt6+GNh4BMSkFNR09BFR9PiwYWAACqjK5GxikulJKSpqmgg6nblO+ZYmzmbWoqJmztWI7Vr0ZoWiDrrODqVa3SB+fYGDISPhSLKSZwGbzRZkZZmVYyeSKTbpba7Bz7M55I4nM4XK5GRC2O5vLQPSo6URnN6fb4BAbBYZhMZAkHTOhzBZLYQ6GEgdbwtKgJF7J5ojGnc6Xa47M70ExaayWLRlXYy+yU3rUoJDUKjcbAshyaZyZRQACSynQYCguAwqVgbAAwgAJACCADkeIIAPqzV2CfgrRJw1JbUyWZz0BwmHTmAqWGy6fS4hDHHTh5xaURlfEleWq-z9DX-ek6+h6g1G03my3WlS2x2u91en1+6EB5K84NJ0PhyPRnSx6zxiVaRzSh5E9w2UTI3M-GmagEMialxTls0Wq2821YO0AJS4-H4Hu4HuNLo4gh4O6dHGNXBdWA9ACEuBxuABZf1rQMI-naKf0BU8mOI5rE6LI8glPI6nuTEzHsAcgKcGd1T+OltUZZdDRNNcq03NgsEEJ0d0dJ8AE0PRdJ033iLkeSDRFtGcUR6CVDwBweDxhyHBwU2cKD0VsDMYy6HwvjVfNUK1QEl31FdsMrDcbXwrgdw4MiPRU5BBB3T9YTbejf1qdpUxMckdDgrJzIlYprHDWVY2KUl0V2SxkIk2kpMXXVZKwit12rZQUNrZ03U9b0XV9XTuW-PkMgQMwM2Y0odFJSMHCedpuJRBwxx0FoEsKZwvFEql3PnIsMJ81cFICoL8N9QQ7TUrAOB3QiPwSL99J-OKshyRoimzcpKkgswLDqR4ynyWUVRK8Tfg8hdi0w6r-N5OqCKIkjH3IyjqKiuieu2B56hY9L00Q0yEpxGonEse4JuyPsp3yaw3IW8r0Jkst5LW1INpUtSdo0nctJ0zq9I2WLjrykx6FaY4ZsuODyglDwkpsawTBjawzFDESejzD7Cy+7yfoAVWUQgFlQGAIDqutQsbCK-Qh6LuuhzJEvoZLUt2DKTAlSMLERyo8n49K3rmom5xJ6SybkynqeUWnIA2hqmo9Fq2qog6Yo7Pq7gG57SmGqpEwHMNTJlepLIVKd3tltD5ZLKqoCVmm6fVraHXUvaaNbKGDby5isYzPjZRaSw8gcIWnisIC+IqBx3EKHRHYLZ2vNdimqc9tX3OU1T1M07S9Y54OgJ5mULJ4kx8kcSD69yHGmLKZo6m8UTlBoCA4DUUriedwP2wYhAAFprAlce8gzySFyYFhIBHgzerTe6mJy0MTpjuChyr3Gmi0JjLjJEw58WiqohXo7ECcCUUZYzHI3yV4ivyC-PpdqYwTZMgb85kmG6NwRyEnDiUVwWQCZiRlpnTyy03Z+VwjaABHZdB5HoPlYo9RzBkj7BKNMYYCjpijEVKax9P5y2zitX6yCVBBVQWPB4ewiR1HlDoLGHhShDhSgBYhfZdg71ntLWccClqVVzsrVW9N3KMMMswlErD0S6E4WQiUoERZpieCQ3QJgbBd08EAA */
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
            TOGGLE: 'open',
          },
        },
        open: {
          initial: 'restorePanel',
          on: {
            TOGGLE: 'closed',
          },
          states: {
            restorePanel: {
              always: [
                {
                  cond: 'isIntegrationsId',
                  target: 'listingIntegrations',
                },
                {
                  cond: 'isUnmanagedStreamsId',
                  target: 'listingUnmanagedStreams',
                },
                {
                  target: 'listingIntegrationStreams',
                },
              ],
            },
            listingIntegrations: {
              entry: ['storePanelId', 'retrieveSearchFromCache', 'restoreSearchResult'],
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
              entry: ['storePanelId', 'retrieveSearchFromCache', 'restoreSearchResult'],
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
              entry: ['storePanelId', 'retrieveSearchFromCache', 'restoreSearchResult'],
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
        restoreSearchResult: (context) => send({ type: 'SORT', search: context.search }),
      },
      guards: {
        isIntegrationsId: (context, event) => {
          const id = 'panelId' in event ? event.panelId : context.panelId;
          return id === INTEGRATION_PANEL_ID;
        },
        isUnmanagedStreamsId: (context, event) => {
          const id = 'panelId' in event ? event.panelId : context.panelId;
          return id === UNMANAGED_STREAMS_PANEL_ID;
        },
      },
    }
  );

export interface DataStreamsStateMachineDependencies {
  initialContext?: DefaultDataStreamsSelectorContext;
}

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
  onPanelChange,
  onUnmanagedStreamsReload,
}: DataStreamsStateMachineDependencies) =>
  createPureDataStreamsSelectorStateMachine(initialContext).withConfig({
    actions: {
      selectStream: (_context, event) =>
        'dataStream' in event && onStreamSelected(event.dataStream),
      loadMoreIntegrations: onIntegrationsLoadMore,
      relaodIntegrations: onIntegrationsReload,
      // Search actions
      searchIntegrations: (_context, event) =>
        'search' in event && onIntegrationsSearch(event.search),
      sortIntegrations: (_context, event) => 'search' in event && onIntegrationsSort(event.search),
      searchIntegrationsStreams: (context, event) =>
        'search' in event &&
        onIntegrationsStreamsSearch({ ...event.search, integrationId: context.panelId }),
      sortIntegrationsStreams: (context, event) =>
        'search' in event &&
        onIntegrationsStreamsSort({ ...event.search, integrationId: context.panelId }),
      searchUnmanagedStreams: (_context, event) =>
        'search' in event && onUnmanagedStreamsSearch(event.search),
      sortUnmanagedStreams: (_context, event) =>
        'search' in event && onUnmanagedStreamsSort(event.search),
      changePanel: onPanelChange,
      reloadUnmanagedStreams: onUnmanagedStreamsReload,
    },
  });
