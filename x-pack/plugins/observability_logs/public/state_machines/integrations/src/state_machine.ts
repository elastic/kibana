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
  /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMADgDMZWZ3nyFAVgBsATnnaATNs0AaEAE9E6zrLIB2dfaPX5D7QBYAvh9NpMOfMSkZPREuBA0UKwAMgDyAIIAIsgAcgDiAPoAygCqAMK5AKIFCcVcvEgggsKiqOJSCOrS2mRunOpaerL6+tKqphYI3bZkKrbybg6yvZyctppePhhYeDXkIWER0fFJaekAYnHIUaU84lUigXWW+uojsuranJqcTa1usv3XzbK2Y5rSmi0Ux+CxAvmWARIa1C4VQUAAskRsGAtokUhkcvkiiUEmUzkILmIKvVpLNhpp5NJGvIKXM3J9Bo0yD1dLYnNppN1pKDwf5VsEYRFEcjUTsMgcjidygICTUrggqW5FDTbJy3LZZP8buoGa1FG0XrN-qr1IYeUs+YFoWE2LFEul4TEAEoFdIpAAqBVSTri7uQMWSmTxFXOcuJiB+zUpc1kbiaFKe+l1MzI7UNc2kJrN3jBFpWVoFNogrEyBTiTtyAAlgzLqpdwwhI2Ro5pY-H5ImGfoU7ZDFM3HHNIZVfJzX581CyBAwAAjIhUADGEUyYFw2AXAAsS2WK9XTiHZfXQPUbhSyNptJr9Jo3LoHH1zIglc1pAP9LZONo5ppVdyc7yJyCac50XZdV3XLcJFgdB8DAMhcAAM0wbAAApS3LKt0hKKI4gATQASlYADISA2d51QJc4RXNdNxrSpDyJY9EB6X4yE5FwvwpC9GgZNkbBHbRTSHdp320McIX5YDyMoqBqIg1goJgzB4KQsBUPQ3csIKHCCKIvMSPIKTQKo8DaOkaV6LrRjJGY7tmkmUldH0PQGSmFp7h-ON1HVd41HEy1J1gUyN2XdBkVwABbWBtwwyssjyQpiilfErNqBtTVuawHieF53E4d4GXUZRm00HRZE4-RgTE-99P5IKaJCqiwtXKKYs0iVjlxfda0JNKmIaG47my55Xnyj5HwQH9NBaVtGl6BQ3EqzwavHAzC1hKA9lwAh6FtbYHWdV0PS9H0-QDINuss3r5UVZUfzVDUtXaBkXH0VNnm8-RFqVd9ZH8wDrQ2radrYDSqzo0MjxswZM2GdiHjmPRBOkQrMzIIcLy-byHBxrwc1QIhp3gCpiNWFLrobABaEwJsp25Ma-TpbwHTz-rWqgaAuBhmEgcmw36xbCtmOwtF0TVOEMak2f5dYNr5qGTw1JRbFvH5TT0Ad1V1WNmWeKYWNjdQ9FHFaJILWWhSRMB5eskkOzhrRuwxp5AXkF6bzYt5emyrpOXUaXzZhXmD1S+U5k4ZWVUaB5nLGF7HjY34VaT9pxgBAPJyMiiwIam2+uhm5nNTRbZC6AdSVvXV3HR1RyseLp7pNxZVrq4LQvCqK8-lSrpvaXsDBUH8xjjib7DcEYjCmNkZjkfKM6CC24WB3aIC7hsmjc7sgUHZzSqTCa3FbGuNQljs9GvZavCAA */
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
            RELOAD_INTEGRATIONS: 'loading',
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
            integrationsSource: null,
            integrations: null,
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
