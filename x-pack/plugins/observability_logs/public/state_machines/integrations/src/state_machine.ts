/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of } from 'rxjs';
import { assign, createMachine } from 'xstate';
import { IDataStreamsClient } from '../../../services/data_streams';
import { DEFAULT_CONTEXT } from './defaults';
import {
  DefaultIntegrationsContext,
  IntegrationsContext,
  IntegrationsEvent,
  IntegrationTypestate,
} from './types';

export const createPureIntegrationsStateMachine = (
  initialContext: DefaultIntegrationsContext = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogBMARgDsnMgFZpAZjWc1ADgCcANm0AWbQBoQAT0TbpKzvenSjy-WqP79RgL5fzaTDj4xKRk9ES4EDRQrAAyAPIAggAiyAByAOIA+gDKAKoAwvkAokVJpVy8SCCCwqKo4lIIcooq6po6BsZmloj68rpk0pzGw-JjsspGsj5+GFh4deRhEVGxiSkZmQBiCcgx5TziNSLBDTJysmTyepyyRpz9ym7mVk32g0a6X7pu+rra+jkMxA-nmQRIS3CkVQUAAskRsGA1sk0lk8oUSmUkhUjkITmIqo1ZJpLronnc5GoFNIXr1tGpBsp7PI3LpZB5-sDQYFFqEoVF4YjkRssjs9gdKgI8XUzghtDYyEZnGppLonK4NPJaQh5J8yJwDEY1E96U5+ly5jzgpCImx4slMrC4gAlIqZNIAFSK6WdCQ9yDiqWyOKqxxlhMQxNuZDJVKMlOp2qVl3kTNugKe0nkHnkFoCC2tfNtEFY2SKCWd+QAEu7Ul6fX6A0GQ1LaqcIwh2T8yHdjJoyfp08ptcoAWQdNpRopZACXHmwbyAMYACzAi4A1gKEWBuQWIQkAG64Aj0XAAIxPIgsHEOoel7dAjWM+hU2mUP2U2cHo-02sUDINTx5GkU01HkO55ytCEyBXNdNxhQUd0tPdSEPY9TwvRh0GvdhZElap7wJR9rHcV932NL9OB-EdPCuNM1TkQEqX0SCUPICAwDPIgqEXKJsjAXBsBXUty0rGtPW9X1-UDYNb1bfF6g7WQfkuekf11aRPBVEcHjIeVJ20cC9EBGdWPBEIOK4ni+IEoTl1YCRYHQfAwDIXAADNMGwAAKNMAEpWF3cz2M47jUF4mF+MElcWwItsiMkGQFCUVQNC0YyuhHQy9PlB49BVTS3zM3llmhKAtnQthXXtJJa3rKSm1k-CwwfRKmiVOixjZT5dCoplfx6BBeoZN9dBMZMqPy4rC1KqIKpPO11kdF03QkhtpObOS4oU2UnCMTr+juL4+s4AbXhcJR7HsJVDLNDRpug2aYXm+g2DLCtqzqyTGxk2KWoSxo9oO7rjuUfrtRVS4rs4LMDH0GcsxY4FUCIDj4CqILFlxeLFOIhAAFozsQfHlBjb53xzPQWU-ZQHpCKgaBOBhmEgbGdo7IYDSuU7TQ8e5wO1bRLjTW5ZCo-41TUJHZnzYKizKtnwzxpwQJUQcs1kM12S1Qa31J8X7njcCjGzNQ6ZtMrEMV1qiQeJQWSNTwxfZdwiZ1MWe36XU7bcVNpl8EFkLl0rWbvHHZQmYwyD+J4ph0Th43pP8nH1SYxgT3R+mMaRzZg1cNy3RFMetNCT3PS9sOtgHEGUBRFW+XrdTGVxh0Gi67HsN8hmcbNc8ssKIqgKK7Kr3G2uUpk9LUTPhhuH4qJohkJ1OsDXEnMbc6e8rKogUfZXjEcwP1K74c0-Ra6+HwfCAA */
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
              actions: ['storeInCache', 'storeIntegrations', 'storeSearch'],
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
            500: {
              target: 'loading',
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
        storeIntegrations: assign((context, event) =>
          'data' in event
            ? {
                integrations: event.data.items,
                total: event.data.total,
              }
            : {}
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
      loadIntegrations: (context, event) => {
        const searchParams =
          'search' in event ? { ...context.search, ...event.search } : context.search;

        return from(
          context.cache.has(searchParams)
            ? Promise.resolve(context.cache.get(searchParams))
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
    },
  });
