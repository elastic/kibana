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
  /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMAZgBsAVjLTOATlly18gCwAOHbL0AaEAE9EshSoBMigL73TaTDnzFSZekVwQaUVgAZAHkAQQARZAA5AHEAfQBlAFUAYRSAUXTwrK5eJBBBYVFUcSkEOQB2NRVdTk5pHV0DI1MLBAq9eTJ5NUVNO0dnDCw8YvJvX38gsMjYuIAxUORAnJ5xQpEPUpkdGy75PQrDPW19Y9bEGwayWQqHJxAXEfcScZ8-VCgAWSJsMGmItF4sk0plsuFcushJsxPkyjY9HoyFdDooLggDF1pIpsfIBg8nm4xl53v4fn8AbN4otlqs8gJocVtggEUiUXd0VVlEpcfihq5Rh43r42CEInEvsEAErpOLRAAq6RiUtC8uQwSiCUh+Q2TLhiCOSJ6fWkdnRqk4shud0Gj2GRKFJJFEFYCXSoSlKQAEnKoorlar1ZrtQyilt9e19N1ev00eYDdiyKjbYTBa8yABjAAWYAzAGsyb8wKmXqRQgA3XAEei4ABG1ZEZg4ax1jPDoDKek4XVR5u71Xq6lu935z2J2dzBc+5OL9rTZcr1brDfQTfY0npBTbsI7iE6SOkvfjCF6FWtI7tAtL5AgYFrRCoGf8CTAuGw2dd7s9PoVSpVao1LUW1DGESgjVRFCNGxZEtaR5Dgq5pHRWQNG6PlLzHR1b3vR9n1fd8s1YCRYHQfAwDIXAADNMGwAAKRQ6gASlYEtiWwh9UCfT4XzfbMQy3MMd0kA0o2NWN0T0ZRkwJOdrzIdjcO4-CP2I0jMAo6iwDohjOGY1isLvDiuKgHiCPXTddXbYTygUZRVA0LQmnOY8dAqK08QvfT01gZSs2fdA-lwABbWBPw9b1ElSDIsjpKFBLA3cWT0K1ZEUDQOWPHobCTNRmhtGSr2JHzeL87iAtfEKwu-BYlhWCFgIE0DmVZZFDwytpoM4c8U1k4kJg+KB5irehRRmCVpVlX8AwA4MGssoSykNaMTTNTKlG6grMPTfr-CG6s2BlMVwl9f1-yDICLO3BLrKWsTTTjNp4J0JN8tHB1ttJT49pGl03XCn8-T-QNAP4+brsW0SY3u9FGi6zh8oeVAiFveB8i80g4qaiMAFp5HRXGesKx0qBoTYGGYSBMb1RLpGkVD5FkBFoePGw1GqHQVs83rHR2z4qassoEOetQKiUepGjOFoXJ0ap7sJrbPF574i35hbEF2TlemRUXFA8+X3sV95KdbeLmUg9m6ZsCpOGSqwrB0TlWbINR0PR8gJ3zQs-jdithuXRhV1V8GZE4HRpDIThoMMdrEF6JFXK5on0wUzi8JKoPmVUCozzxHpbk6PFaZhmXbEThXyGKgj-MCkKM4jEv5CqA4Y4xcOy4N4UBu+42QOp6zFCtshs9kaOHsuTg7PxRwgA */
  createMachine<IntegrationsContext, IntegrationsEvent, IntegrationTypestate>(
    {
      context: initialContext,
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'Integrations',
      initial: 'uninitialized',
      states: {
        uninitialized: {
          always: {
            target: 'loading',
          },
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
            LOADING_FAILED: {
              target: 'loadingFailed',
            },
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
            LOADING_FAILED: {
              target: 'loadingFailed',
            },
          },
        },
        loaded: {
          on: {
            LOAD_MORE_INTEGRATIONS: 'checkingMoreIntegrationsAvailability',
            SEARCH_INTEGRATIONS: {
              target: 'debouncingSearch',
            },
          },
        },
        checkingMoreIntegrationsAvailability: {
          always: [
            {
              cond: 'hasMoreIntegrations',
              target: 'loadingMore',
            },
            {
              target: 'loaded',
            },
          ],
        },
        debouncingSearch: {
          entry: 'storeSearch',
          on: {
            SEARCH_INTEGRATIONS: {
              target: 'debouncingSearch',
            },
          },
          after: {
            500: [
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
              actions: ['storeIntegrations'],
            },
            SEARCH_FAILED: {
              target: 'loadingFailed',
            },
          },
        },
        loadingFailed: {
          entry: ['clearCache', 'storeError'],
          exit: 'clearError',
          on: {
            LOAD_MORE_INTEGRATIONS: 'checkingMoreIntegrationsAvailability',
            RELOAD_INTEGRATIONS: 'loading',
            SEARCH_INTEGRATIONS: 'debouncingSearch',
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
    const id = getIntegrationId(integration)

    if (id !== integrationId) {
      return integration;
    }

    return {
      ...integration,
      // Filter and sort the dataStreams by the search criteria
      dataStreams: new EntityList<DataStream>(integration.dataStreams)
        .filterBy((stream) => stream.name.includes(nameQuery ?? ''))
        .sortBy('name', sortOrder)
        .build(),
    };
  }
};
