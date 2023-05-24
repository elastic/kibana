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
  /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMADgDMZWdIBMAVnnyAnFtWctKgDQgAnojX6l0gOyyNAFjWyAbDukBfd8bSYc+YqRk9ES4EDRQrAAyAPIAggAiyAByAOIA+gDKAKoAwjkAovnxRVy8SCCCwqKo4lIIaupk0jYq9q52Wtac1sZmCJqKamr21lrOmlqcKuOe3hhYeNXkwaHhUXGJqWkAYrHIkSU84pUiAbXmjc3Wre1qnd295vKcZFr2KrIjTpzPP7MgPgW-hIyxCYVQUAAskRsGB1glkulsnlCsV4qVjkJTmJynVpN1rGRrHIFHJnJx3mpHgh1NIyOpOJwhnJ5NJnCppGp-oC-EsgmDwtDYfDNuldvtDmUBFjqucEJz7Ip7AZnm9Js4bM5qfYKU19BYKTr7IrZNZufNeQFQaE2DEEmlIdEAEr5NLJAAq+RSTti7uQ0SSGQx5ROstxiFNWjI8lkH0+nGcrhU8i1pkQOrp5Le7NjLmk8nNvkWVv5NogrAy+ViTpyAAlg9KqmdwwhI9Hc-HEyrU30VIyicqtApnjGEwnC0C+RAwAAjIhUADG4QyYFw2AXAAsK1Wa-WjiGZc3QHV1M57PTpl0VNYr-I2tqdU0DC5Psm1DYtFyvACLcWQWRpznRdl1XdctwkWB0HwMAyFwAAzTBsAACkras6zSYpIliABNABKVgeT-QJAPnVAlwhFc103BsKkPHFj0QDkb2jClnBcIYPgpalZH7aRHF0T4XHkaw7gnS1-xI4CKNAzdWAgqDMFghCwGQ1Ddww-IsLwgjf2BYjZ1I8ioEosD2GkKVaKbejJEYvso2sZw1Ec1o5GGaRuLpQch1aH5NEcM1v0IvTyFgGSN2XdBYVwABbWBtzQ2tMlyAoiklTErJqFsGjUJoWjaIc7i6Ho03qZQyGND4KvkO43gCuYi2CshQqo8KKMi1dYvi9TxQOdF90bbFMoY+pLjy257mKvpnGY2RPwMa9WU5AtAt0vkVnBKBtlwAh6FtDYHWdV0PS9H0-QDIN+sswa5QVJUVX0ZUE01alqsULMLGEz5rGVL96snEt1vCLadrYNS6xo0MjxsmkbEJZ42nYhoePsal31kMgk0+IdlVZWbPG-VAiGneByiCpZ0uulsAFoe0QKmcp0RmmaZ0YxKI8gqBoU4GGYSAKbDYb3lRzh0eUWw5HsaQ1WmNnGsBiF+ahk9bCUbGHO6VkfiMEr7DsaMbFNVQNQ5VxZbWgUISFMBFesvFnkJBb306YkFHvEqUxyqXOONWQ7FsZa-vEwJ1r5g8MrldXXhUToNCKtRvqpd3dHpO8LFUByGj+FaGqnAypOMsKbaG6H1GTIllDvVxOirxO+h+jHn0c7oDFUYSzZLZqwIiqLYqLuUPmcMh47F9RhK0eRWmpEScszt4Rm0XQ2Pb-95c27bdogPuWylsqYwHnQXem7VXAbj47gaFR1F0ex8fcIA */
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
