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

/**
 * TODO
 * - Split search and sort into 2 different events
 * - Split states into UI accessible interactions, keep track of current UI state for this
 */

export const createPureIntegrationsStateMachine = (
  initialContext: DefaultIntegrationsContext = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogDsAZgCsZABxyAbAE4AjOqXrVqzqoA0IAJ6JNS1WWkAWJbfnz98pZs23ZAXy8m0mHHxiUjJ6IlwIGihWABkAeQBBABFkADkAcQB9AGUAVQBhfIBRIqTSrl4kEEFhUVRxKQRNWXV1MnUAJlltXS1PeVsTcwQOzk4bDp0PQ1tVWVlVDp8-DCw8OvIwiKjYxJSMzIAxBOQY8p5xGpFghsR1aUVbJ85NTls398mhxC7bMi7VHZbFoQc5bMsQP41kESJtwpFUFAALJEbBgXbJNJZPKFEplJIVS5Ca5iKqNZqtdpdHqtDwKQZmRDvcZOF6cVqOWxde4QqGBDaheFRFFojH7LLHU7nSoCYl1W4Ie6PZ6vd7PWTfBAtaxTdyaaTSbR2JS81b84JwiJseLJTJIuIAJSKmTSABUiukHQlXcg4qlsoSqld5WSLC02p1ujpaf0GcMFONDJx5JNkx0HMDpKaAusLYKrRBWNkigkHfkABKB2W1G6hprqWyaf7J6ScaTqWQdJ6OTVPaRkRb62SOB6TeQd7PQgUQMAAIyIVAAxlFsmBcNhFwALIslsuVi5BuW10CNLrpsicJSGdROTvSDqagZN1TyTiyK-yTRzUbySfm2FkDO85Liua4btuEiwOg+BgGQuAAGaYNgAAUxalhWmRlDECQAJoAJSsHyuYAUBC6oMuiKruuW5VtUR6kieFgNk2P6tu2nbdvImpKFYZCeN0XIGpo8jzEsviQmaxEhKRIGUWBW6sJB0GYHBiFgChaF7phRTYfhhGSTC0lzmRFFQFR4HsJoMp0TWDGSExcgDgYwnUpwkw9oyCBuHxSjOBonjto2n5-lJ5CwPJm4rugaK4AAtrAO7oeWOQFMUpTSkStn1HW6Ysumqi2NIL7JgY6iaoaShkPIDxyDxHTuDxmghYZYURVFMXxYlWmSmcBIHtWJLZYxIxXlV+WFcVzjso+94Dn276OIYvm-uJREtfmCJQIcuAEPQ1p7HajrOm6Hpej6foBv1NmDQqciKCoCwgro+iGL2hV8a2GgdPojgiSaq0GQKWybdtu1sE6NpJC6qTup63q+v6tHBse9kIHdyhqE9egGMYnnDtYwLCbIl7sTe-0rDm63A1EoN7YWmkVkj9FDaj6MPRoNIvbjwyLOMzQ464kz3J2PjiagRAzvAVRrRsmU3XWAC03OIErF5jOrGvq9VzUClQNDXAwzCQHLIbDU4bRtm+bnFV+ziapYih2NIV46LM9XvFmAOU0DQqIibKPkl+sg2JoHRdEoxOC90mr1Sx7yqG4cwiaMhU63m1OIiKYD+3ZgdzCHYfvpHSjUr27gXqVHaWHYXYrRTU7p-CxuHllCqWLI-ZFfqFIFfcb5vZVodDiOKY3hOXsNyRxmyWZEU5yzp7pv2izAiorZuNIj73GQFJ6NMPGtKoacAeF1GRZR0VrvF88Kly3GNsowlky7rhvsfIQZ1tO10zfdavn8N5qqjHvL5d8m9PIpmDi+DoIlna5U8EfUWQA */
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
