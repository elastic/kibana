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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVBldAnMqAtrFmADZgDG6A9rgHSVk2yQDEAKgPIDiPAMgFEA2gAYAuolAAHFgEt0cmgDspIAB6IArACYANCACeiABwBGeloC+Vg2kw58REuSq0GNaWGWdeAkRJqsrAKSqpIGohmZgDMAJyWZloAbDpaBsYIKRaiqda2IPbYeATEpBTUdPSe3vRkcrCKylAAksroYFC4GGGwbADCABIAggByPIIA+gAKY4L8YpIRwaEqapoIACybFiYxWnExAOzpRohxRyb0x-l2GMVOZa6VHl7KdQ1Nre2d3YoqfSGYwmMzmCzMSxk8n+4VAG22u32hxOGW0yQSuTSNjuDhKznKbiqNXe9UacmabQ6XR6ALYWH6ACUuPx+JNuJMWqMOIIeAzhhwWlxRlhJgAhLgcbgAWUWQWhYXWpiOqIQl029GSRzMJhO2MK90cpRcFXc1TeHzJFJ+1JhfSwgmGDKGYoAmpNRsMpQFISAVjDFQgkur0WZNpjTplkskLDpkiksQUiob8c9TcSLV9Kb8aco7VwGRxXZN88hBAzZct5WsIhszKl6HsdKIYmY0iqtMcGwcbnqk3iniaiebSZnrX8wsniAMRuMprNRvMK1CQv6a4hkvt6GY4h3WxHtNrLHlewb+8bCa9aiPyd8qeOVJO7fNBP1C1gOAyHTLApWVwq14GsQJFoSR5Cq0YWPGtz6rijzni8ZpXp8N5ZjaE5nnSDpOoMRYel6S6+lWsKRAgJibFoGp7N2KJnAg8TqqBCY4g8RoEgh6bXlad45o+dL5oWopuiWZYEX6-5wqYHb0JsOjajRmQ6Ecoj0LqiannBbFpsOyHNAAqsohCoMoqAwBAvFArOoILgsP7LqsxEbBuFHbruba0XEikNqpzGPppQ5IZaUD6YZxmmbx9pCK+kzvp+nqiURAbRPEiRQSqO5HA2cRkT2amwaxqb+SSOlBQZRkmZA4VYc6gnup63pyn+1YSaR5HSTESI3CqJjNtJyQ6tBfYaQVl5FYFwVlWFGFYPxRbCeWtmEY1DmSTE9A6DEJg6OYbmRt19DhjYBTKDQEBwGog35YOuANfZAYALRxCqd3JCeeUpldjDMKwEA3auzWxMljH7lkfX0HEe6vSx70XohxFiU1JHxCq2qrUxMFQwOMPpgAFp8v3iSR0QWKG5EtjtiCbEcyRdsiA3qZdWPaYFqH3rm+MI7W0RbtsrnAyYJjUxDuUY-BWkBaO3Ewo+7PLaRZgZXEfXydoOg6EeaMXdD7FM1842hRVZ4ywG5gK0rwOHLsqk2EAA */
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
      reloadUnmanagedStreams: onUnmanagedStreamsReload,
    },
  });
