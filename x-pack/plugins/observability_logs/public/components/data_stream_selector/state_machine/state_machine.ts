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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrFmADZgDG6A9rgHSVk2yQDEAKgPIDiPAMgFEA2gAYAuolAAHFgEt0cmgDspIAB6IAjACYALAFZ6WgGyitBkzoMAaEAE9te+qIDsenVoAcrgwF8-OzRMHHwiEnIqWgYaaTBlTl4BEQk1WVgFJVUkDW03LXoTPS89AGZfO0cEPQBOHXoarRq6718AoIxsPAJiUgpqOnpY+PoyOVhFZSgASWV0MChcDCzYNgBhAAkAQQA5HkEAfQAFXcF+MUkc9MyVNU0ELXdCy2tKxAMvUvodGpMff0CIGCXTCvUiAxicWUo3GkxmcwWS0UKlWm12+2Op3OWkuMnkyOyoHunmcekev3+b2qWgKNVqnn+7SBnVCPQi-WiQyhMImcims3mi2WKLYWDWACUuPx+AduAdpjsOIIeOKthxplwdlgDgAhLgcbgAWQuaXxWTuiAAtNYCq5RKVdLYHIgdF4ag1fqIauUAR0Qt1wn0ooNhtCxrz+QihQTVlhBFtxZtdQBNA47LaGlK4kDXAkWhCWx71LyiNxeR1UgwGVz0Axlx1M4GswPgzmhnlwgWI4XKWNccUcFMHfvIQTik1XM23HL3S0Okz0XyucuvZ3VPSiWtkjdWX3M-2g9nByEjcOdqNIrLN4jrbZ7Q4nHZnCd4jJ5mcunRfEyuVpOqr6F49AlnofxtICTYBmCHIhtyZ58vCgqXio16xmcghrIOWAcOK8bGqkk5vuaH4PKI1jGDUBgOquAE6KIjYslBR4Qlyp6wghXbRleTGivGiYbEO6aZi+OZToSuQIHaRh0i0lJriWxiMhBjGHkGLHtvBkZIT2qGiv2g46qmI5jiJubEUSiBkjWxReK6FbyZuf4MQebJqW2cHsVMACqyiEKgyioDAEC6Wi96Yk+5wEa+NzicSX6FL+clVK4JhGKYO7WM5IKua2sFsRGUA+X5AVBbpcZCJhBzYbhGamWJ+ZaGRaWUdR-6IO4XylKIXgGN64F+tlLYwSeYaeYVvn+YFkBlXxSaGWmGZZqaRHThZkkeMBv5ej6VI+PU+hmH1e6QapuUjR2CFFZNpU8Vg+lDsZ45RaJK2xZZ+j0Hohitbtrj7aB23gYCyg0BAcBqCdOXDctMX5paZL1EuK5tQWpj1I81bI1lqFuYMTAsJAMPvmtjrfolFRrsUXw1KIoFKQNONnax4lmatElzkUi6Y-ZVSWk8P7c5lykuUNx7M-QAAWsJE+Z7OPDWFhfmUFNVLowH6Ay-X7oN0FixpY2cchvYy2zs40u6RQlDta6lJRxhFKIu7Y0xuPnZpiHdgSqEm29CBUZulgO7uVJNO6XV01rkOi+pHkFVdJXTUxPv5lWRh6ClLwo399QmFopR2ULARAA */
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
          onUnmanagedStreamsSearch(event.search);
        }
      },
    },
  });
