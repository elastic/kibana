/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, createMachine } from 'xstate';
import { EntityList } from '../../../../common/entity_list';
import { DataStream, Integration } from '../../../../common/data_streams';
import { FindIntegrationsResponse, getIntegrationId } from '../../../../common';
import { IDataStreamsClient } from '../../../services/data_streams';
import { DEFAULT_CONTEXT } from './defaults';
import {
  DefaultIntegrationsContext,
  IntegrationsContext,
  IntegrationsEvent,
  IntegrationsSearchParams,
  IntegrationTypestate,
} from './types';

export const createPureIntegrationsStateMachine = (
  initialContext: DefaultIntegrationsContext = DEFAULT_CONTEXT
) =>
  createMachine<IntegrationsContext, IntegrationsEvent, IntegrationTypestate>(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMATgDMZABzSATAFZOANnWzOAFlnr9AGhABPRAHYtVsrP1LO2rbIXrV8gL5ezaTDj4xKRk9ES4EDRQrBAkYGQ0AG5EANbx-lh4oiFhEVEISUQAxkEkXNzl4oLC2eJSCB5mlghK8naqWkqqVk6q0vKGWj5+GJmlOeGRqNFg2NhE2GT89PgAZgsAtmQZgdnkuVNQBajJJdnllUgg1SLBdTKd0mQ26upKskpW-a1KTYif+jI+i0+l0XX0+lUeiUwxAOyywX2k0gCQg9DArAAMgB5ACCABEAPoAWWxACUAKKE5AAOQAKhSAOJk3F05DYmkAZUuAiEtzEV3q+k4im6A3U8k40mk+iskqsfwQsvUQK0nDcatUTnkulh8PGSIiKIIaIxnIpuLJAGEABLU+lMllsjncnhVPm1QWIYWiuWgyXS2XyxUSpRkeQgkFuDpKFRWPWjXaI0LIiCo9GsTnkun2hnM1nsrk864eu5ehBqfr2WR9DpBsG-CyIWxPQyOTpaVScDx9BMBBEkQ0QY2mzMW6122l5p2FzmEzl0ym44mu3hXG6e0BCkVkMX+qUyuWcBVNhDdOxq6Qg7ucbqeby+OGJgcTI1pk0ZrNknNTx0Fl3zouForsWG5llu-wns0qiOGQV7HhKcgxrqj76nsKZvhhhzEgsGKxKg8SFGk2zPgaWEogcUQ4dgYDHKc4wXG666lgKEEIJ2TyyC8Vg2N0OgGIq8hanBUqdse8gyl02h9mM6EHBRkxUbhrCzPMizLGsmwkf2ZHyWmlHTNRtGFGcwSMWuvI1OBkgyH0ijRmoIJyg2IbHkCjjOFYzjaBoqgyUmg7kWmw4AEZEFQRRgJyYC4NgRQABZRGhiJjpatq5n+zpFkxln8qg9wtK0u4DDqsauMCsqKrKgIOFYHxfI5bj+S+Q4oqF4WoJF0WxQlSWkXsrASLA6D4PEuCrJg2AABSSpwACUrDJYFelkO1EVRTFcWJdMS2kKBLH5eWlb2TWjn1h8jbNK8NWyg4spqPoMqyM1umpqtYBhet3VbX1Ol7Jy6A0bgGywKlE4ZfmWVzguS4gTlJZWaxNktKCyhWIYxg1q4shyIq0iaNWbhdEJMFWK86gvXJb1rZ1G09dtUC7bAANAyDg3DaNZDjZNM3OAtTNBe9n2099vU7f1iIszFIP7Yjh1sboKoGJ0XmdBCQnqHjSiApJxhtpwSidpTyYGVAABiuAEOiECsJSOIEhDM4urLeUFVeKjPDobz1d88iXf8nj2JG0hOPjEp+bCqBEMO8BXEz7pywVAC0siKknMFkN5WfZ55xuBVQNC3AwzCQAnrvlo0p42Fo9i3UoesG7YMKoRLy2KdMZebsjMqo8YHZvAMwpaIqrSAgYdXqNKejqvXeevsOECd9Z9TyKnp5aIohhE3VdkKDxFMt39JtvR+YBL0j9RyIofstp2d0eMegk2GQ6i2CK0p+4bMFz61+nt1ARlz7y2RobMMEYvhaBDjoAYKhBKuHcnVVwUohKxi4j-QWNMuqbTFozVupAgEFXrmGHe0Jjx2SsKoEMkoEGyFsAMGU6gejoJWpgumP1xZH0HFLYGsdcpd3qK0J4V5hQULcB-f2Z5tAv28rGOQ5UpTMP-hbK2pdmKJyOjWVQu4vY6BVnIRwioeiyBfu8O+IodRqmbj4IAA */
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'Integrations',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: 'loading',
        },

        loading: {
          id: 'loading',
          invoke: {
            src: 'loadIntegrations',
            onDone: {
              target: 'loaded',
              actions: ['storeInCache', 'storeIntegrationsResponse', 'storeSearch'],
            },
            onError: 'loadingFailed',
          },
        },

        loaded: {
          id: 'loaded',
          initial: 'idle',
          states: {
            idle: {
              on: {
                LOAD_MORE_INTEGRATIONS: {
                  cond: 'hasMoreIntegrations',
                  target: 'loadingMore',
                },
                SEARCH_INTEGRATIONS: 'debounceSearchingIntegrations',
                SORT_INTEGRATIONS: {
                  target: '#loading',
                  actions: 'storeSearch',
                },
                SEARCH_INTEGRATIONS_STREAMS: 'debounceSearchingIntegrationsStreams',
                SORT_INTEGRATIONS_STREAMS: {
                  target: 'idle',
                  actions: ['storeSearch', 'searchIntegrationsStreams'],
                },
              },
            },
            loadingMore: {
              invoke: {
                src: 'loadIntegrations',
                onDone: {
                  target: 'idle',
                  actions: ['storeInCache', 'appendIntegrations', 'storeSearch'],
                },
                onError: '#loadingFailed',
              },
            },
            debounceSearchingIntegrations: {
              entry: 'storeSearch',
              on: {
                SEARCH_INTEGRATIONS: 'debounceSearchingIntegrations',
              },
              after: {
                300: '#loading',
              },
            },
            debounceSearchingIntegrationsStreams: {
              entry: 'storeSearch',
              on: {
                SEARCH_INTEGRATIONS_STREAMS: 'debounceSearchingIntegrationsStreams',
              },
              after: {
                300: {
                  target: 'idle',
                  actions: 'searchIntegrationsStreams',
                },
              },
            },
          },
        },

        loadingFailed: {
          id: 'loadingFailed',
          entry: ['clearCache', 'storeError'],
          exit: 'clearError',
          on: {
            RELOAD_INTEGRATIONS: '#loading',
          },
        },
      },
    },
    {
      actions: {
        storeSearch: assign((context, event) => ({
          // Store search from search event
          ...('search' in event && { search: event.search }),
          // Store search from response
          ...('data' in event && {
            search: {
              ...context.search,
              searchAfter: event.data.searchAfter,
            },
          }),
        })),
        storeIntegrationsResponse: assign((_context, event) =>
          'data' in event
            ? {
                integrationsSource: event.data.items,
                integrations: event.data.items,
                total: event.data.total,
              }
            : {}
        ),
        searchIntegrationsStreams: assign((context) => {
          if (context.integrationsSource !== null) {
            return {
              integrations: searchIntegrationStreams(context.integrationsSource, context.search),
            };
          }
          return {};
        }),
        storeInCache: assign((context, event) =>
          'data' in event ? { cache: context.cache.set(context.search, event.data) } : {}
        ),
        clearCache: assign((context) => ({
          cache: context.cache.clear(),
          integrationsSource: null,
          integrations: null,
        })),
        appendIntegrations: assign((context, event) =>
          'data' in event
            ? {
                integrationsSource: context.integrations?.concat(event.data.items) ?? [],
                integrations: context.integrations?.concat(event.data.items) ?? [],
                total: event.data.total,
              }
            : {}
        ),
        storeError: assign((_context, event) => ('data' in event ? { error: event.data } : {})),
        clearError: assign((_context) => ({ error: null })),
      },
      guards: {
        hasMoreIntegrations: (context) => Boolean(context.search.searchAfter),
      },
    }
  );

export interface IntegrationsStateMachineDependencies {
  initialContext?: DefaultIntegrationsContext;
  dataStreamsClient: IDataStreamsClient;
}

export const createIntegrationStateMachine = ({
  initialContext,
  dataStreamsClient,
}: IntegrationsStateMachineDependencies) =>
  createPureIntegrationsStateMachine(initialContext).withConfig({
    services: {
      loadIntegrations: (context) => {
        const searchParams = context.search;

        return context.cache.has(searchParams)
          ? Promise.resolve(context.cache.get(searchParams) as FindIntegrationsResponse)
          : dataStreamsClient.findIntegrations(searchParams);
      },
    },
  });

const searchIntegrationStreams = (
  integrations: Integration[],
  search: IntegrationsSearchParams
) => {
  const { nameQuery, sortOrder, integrationId } = search;

  return integrations.map((integration) => {
    const id = getIntegrationId(integration);

    if (id !== integrationId) {
      return integration;
    }

    return {
      ...integration,
      // Filter and sort the dataStreams by the search criteria
      dataStreams: new EntityList<DataStream>(integration.dataStreams)
        .filterBy((stream) => Boolean(stream.title?.includes(nameQuery ?? '')))
        .sortBy('name', sortOrder)
        .build(),
    };
  });
};
