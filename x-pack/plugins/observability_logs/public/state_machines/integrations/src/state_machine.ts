/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of, throwError } from 'rxjs';
import { assign, createMachine } from 'xstate';
import { EntityList } from '../../../../common/entity_list';
import { DataStream, Integration, SearchStrategy } from '../../../../common/data_streams';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMADgDMZWdIBMAVk5rlAFgDsagJwAaEAE9EG3Uum7dKzrO1rtm2QDYAvh5NpMOfMSkZPREuBA0UKwAMgDyAIIAIsgAcgDiAPoAygCqAMK5AKIFCcVcvEgggsKiqOJSCGrqZNI29trSBtJaJuYI8vLSZGrObu6yanbao14+GFh4NeQhYRHR8Ulp6QBicchRpTziVSKBdRZNLXac7Z3dZueyZAbaKro2avIuU7ozIL7zARIS1C4VQUAAskRsGA1okUhkcvkiiUEmUjkITmIKvVpJxdAYyG9ZLZOP1ZCoOsZ7gh1IMVNoDAZZI5OM8DG4VL9-v5FsEQRFIdDYRsMjs9gdygIMTUzggutpFAyVPY3M9WbjpD1EC5FLiDPJdOS3PKJly5jzAsCwmxYol0uCYgAlArpFIAFQKqUdcTdyBiyUyaIqxxl2MQxIJ8nJ+gMuj0CjcWr6jLIblZ8mc8jxnBNZr8C0tfOtEFYmQKcUduQAEkGpdVTmGEBGyFHXoY44b5InqfZOISNJxrhMNI1VHmAbyIGAAEZEKgAYwimTAuGw84AFqXy5Wa4dg9KG6B6uo3NoyMrVU4OXjDbokwrHh1XpxlcSHNptOOLUCyFPZwulxXNdNwkWB0HwMAyFwAAzTBsAACjLCtq3SEoojiABNABKVhuQLH8-znVBFzBZdVw3WtKgPLEj0QClbBba4DBUNVtGUJN8UfJx8XUZ45AMNQv3woJCIA0igI3VhQPAzAoNgsAEKQndUIKdDsNw81hPIUTiMA8j13YaRJSo+saMkOj7AJXQ3AmU8HFjOMk2UIZB0HWxmVjD8fm8P5NMBIJYAk9cl3QaFcAAW1gLdkKrLI8kKYoJXRUzakbRo1GaVprg6LpZCTCYCQ-Z9pC7RwDAcIT-PIQL9JCsLIui5SxX2VE9zrTFUtohoLiym5cqTNx9CUATmTePRVDYyreWWUEoC2XACHoG11ntJ0XXdT1vV9f1AzakyOtleVFWYlU1U6HMkwzFRU3TVRyQK9l5CmwsZoiebFrYJTq0okND3MmkbCsLMlVY9jqTUaQ3FTZjBsNB9rIMLwfNQIgp3gCo8Kq5KDsbABabtenxshXJJ0m3Oen8qBoE4GGYSBsdDLqXnyzgoeUWx1DGlRjU-HzMem-kwQZv7j0NYbHAzWM01Ve8FBbQH+kZHKsyevm-IFlYwUFMBhbMnEsysV5PijOwPkZS63F1Zi43oilXjjCmghm+n9xS2VrL7Zj2XxdLSXaS7ZAJFRjaVhlNA+R3tJnIiSKgMjgN1zr-vUYPCWUEdpDY4PNWpBlFFVbn3FULoVHGXnZnzKqyBq4C6pXSLE9lUuoYmZQowZTpZCHDiPiGewFAVO2u28iuJxewW5oWpaIEbxsOmc1tvYhhy1HvQbodeSGWnaNQOW8rwgA */
  createMachine<IntegrationsContext, IntegrationsEvent, IntegrationTypestate>(
    {
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
          invoke: {
            src: 'loadIntegrations',
          },
          on: {
            LOADING_SUCCEEDED: {
              target: 'loaded',
              actions: ['storeInCache', 'storeIntegrationsResponse', 'storeSearch'],
            },
            LOADING_FAILED: 'loadingFailed',
          },
        },
        loadingMore: {
          invoke: {
            src: 'loadIntegrations',
          },
          on: {
            LOADING_SUCCEEDED: {
              target: 'loaded',
              actions: ['storeInCache', 'appendIntegrations', 'storeSearch'],
            },
            LOADING_FAILED: 'loadingFailed',
          },
        },
        loaded: {
          on: {
            LOAD_MORE_INTEGRATIONS: {
              cond: 'hasMoreIntegrations',
              target: 'loadingMore',
            },
            SEARCH: 'debouncingSearch',
          },
        },
        debouncingSearch: {
          entry: 'storeSearch',
          on: {
            SEARCH: 'debouncingSearch',
          },
          after: {
            SEARCH_DELAY: [
              {
                cond: 'isStreamSearch',
                target: 'searchingStreams',
              },
              {
                target: 'loading',
              },
            ],
          },
        },
        searchingStreams: {
          invoke: {
            src: 'searchStreams',
          },
          on: {
            SEARCH_SUCCEEDED: {
              target: 'loaded',
              actions: 'storeIntegrations',
            },
            SEARCH_FAILED: 'loadingFailed',
          },
        },
        loadingFailed: {
          entry: ['clearCache', 'storeError'],
          exit: 'clearError',
          on: {
            LOAD_MORE_INTEGRATIONS: {
              cond: 'hasMoreIntegrations',
              target: 'loadingMore',
            },
            SEARCH: 'debouncingSearch',
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
        storeIntegrationsResponse: assign((context, event) =>
          'data' in event
            ? {
                integrationsSource: event.data.items,
                integrations: event.data.items,
                total: event.data.total,
              }
            : {}
        ),
        storeIntegrations: assign((_context, event) =>
          'integrations' in event ? { integrations: event.integrations } : {}
        ),
        storeInCache: assign((context, event) => {
          if (event.type !== 'LOADING_SUCCEEDED') return {};

          return {
            cache: context.cache.set(context.search, event.data),
          };
        }),
        clearCache: assign((context, event) => {
          if (event.type !== 'LOADING_FAILED') return {};

          return {
            cache: context.cache.clear(),
          };
        }),
        appendIntegrations: assign((context, event) =>
          'data' in event
            ? {
                integrationsSource: context.integrations?.concat(event.data.items) ?? [],
                integrations: context.integrations?.concat(event.data.items) ?? [],
                total: event.data.total,
              }
            : {}
        ),
        storeError: assign((_context, event) =>
          'error' in event
            ? {
                error: event.error,
              }
            : {}
        ),
        clearError: assign((_context) => ({ error: null })),
      },
      guards: {
        hasMoreIntegrations: (context) => Boolean(context.search.searchAfter),
        isStreamSearch: (context) =>
          context.search.strategy === SearchStrategy.INTEGRATIONS_DATA_STREAMS,
      },
      delays: {
        SEARCH_DELAY: (_context, event) => {
          if (event.type !== 'SEARCH' || !event.delay) return 0;

          return event.delay;
        },
      },
    }
  );

export interface IntegrationsStateMachineDependencies {
  initialContext?: IntegrationsContext;
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

        return from(
          context.cache.has(searchParams)
            ? Promise.resolve(context.cache.get(searchParams) as FindIntegrationsResponse)
            : dataStreamsClient.findIntegrations(searchParams)
        ).pipe(
          map(
            (data): IntegrationsEvent => ({
              type: 'LOADING_SUCCEEDED',
              data,
            })
          ),
          catchError((error) =>
            of<IntegrationsEvent>({
              type: 'LOADING_FAILED',
              error,
            })
          )
        );
      },
      searchStreams: (context) => {
        const searchParams = context.search;

        return from(
          context.integrationsSource !== null
            ? Promise.resolve(searchIntegrationStreams(context.integrationsSource, searchParams))
            : throwError(
                () =>
                  new Error(
                    'Failed to filter integration streams: No integrations found in context.'
                  )
              )
        ).pipe(
          map(
            (integrations): IntegrationsEvent => ({
              type: 'SEARCH_SUCCEEDED',
              integrations,
            })
          ),
          catchError((error) =>
            of<IntegrationsEvent>({
              type: 'SEARCH_FAILED',
              error,
            })
          )
        );
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
