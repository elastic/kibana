/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, createMachine } from 'xstate';
import { isEmpty, isError, omitBy } from 'lodash';
import { IDatasetsClient } from '../../../services/datasets';
import { createDefaultContext } from './defaults';
import {
  DefaultIntegrationsContext,
  IntegrationsContext,
  IntegrationsEvent,
  IntegrationTypestate,
} from './types';

export const createPureIntegrationsStateMachine = (
  initialContext: DefaultIntegrationsContext = createDefaultContext()
) =>
  createMachine<IntegrationsContext, IntegrationsEvent, IntegrationTypestate>(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMATgDMZABzSATAFZOANk7r5a+VqUAaEAE9Es6dOXqFAFjlbVs2Z3sBfD6bSYc+YlIyeiJcCBooVggSMDIaADciAGtY3yw8USCQsIiEBKIAYwCSLm5S8UFhTPEpBHVVUwsEWRUyaQB2WWdZdSVVTh6lLx8MdOKs0PDUSLBsbCJsMn56fAAzBYBbMjT-TPJsqag81ESizNLypBBKkUCamXl5WTJXTV6taXt7JVlGxCV5KplO01G5vrJ7JwlJ5vCAdhlAvtJhFWABlACiAEEAEoAYQAEgB9ZAAOQAKuiAOLYzFk5AAeRJqMuAiEtzEV1qKhsqh+Kna6mk6h0snafwQ7XaWjIj3kgoB8qUWnawzho12iOCyOmaPp2LJxPJVJpdMZzJ4FTZ1U5MlU0mlLV0al6-Q0JnMiGVNke3yVLQ+dlUqvh4yRYUgcQg9DArAAMvTMQARQkAWT16MNFOptIZTJZ1ytdxtCH66jImk4nH6oqrnwU4pcShldkh0McgpB8mD6oRJDDEAjBCjMYxOIJmeNObN+Zu1tAtVL5crVYG7Vr9nrHrqPTI7Xk9nkfV5ql5Ve7fl7E3DEEj0d1+on2dNeYtV1nRfnlnUZa6A16PukJQlXFJ5pWkQElGFVR7DeQVzzGPYtWvJDDhTBYY2iVBYnyFJth7UMUIjA4IjQ7AwGOU5xguV9WSqD9JEQexoLIfp9Ag8FDw0cUhRsZdKyFA91BBaR4I1PtCJvYjplImNZnmRZljWTY8IvAiDiI7UoBkijCiongZ0LDlP2ab8XhFf990A4CtztaVoS0SEvTtVRlRhEZVMQ9SbwHAAjIgqAKMBUTAXBsAKAALCIQz2NEsTxIlSSzE1c3NXg30M1B7gQLQhOUQFa3aew10BMUtz0Z5IIhfQlXtQZRMvfsI18-zUEC4LQoiqL8JiiRYHQfBYlwVZMGwAAKeRKwASlYaLNS8shmoCoKQrCyLplmvsDLooyGJMn9zIBSygK0cUPgquxDxyzh2hPa76rUzSADFcAIaMIFYbF0XjJNH2S6caILbbMuLcCnheHpdBqr4fnFdo+hlTtZQUKxRS8WFUCIAd4CuDbSEtIGsoAWmhF5vlUAVenUJi5HFQnmL49xHntORoPUe7EKoGhbgYZhIHx9lgeMwnDFJvoKcg6nfi3H57DIXQHDUa63Gcdm5s0-m5126xOEUSUPmg1mughWGbt3JROhBGWBV0VXxK8jX6NqDdTsUDdXDcfQ4YcrRDFtq8BxvIdowdnbalFBsBheC3KwmyCoXkFVYVxxrJM0mSQ8F3arqXOHPiUdx+mhbjZCBfcfaYgFCsrPQ-ZThawD8pb2tWrqPMRDOsp9xQnm0A8+Th90mjsMs5QUICektmDa5QiJntevn0oJkHek4MgN0FORro7ThpFh-oEfAk8FClYUtDRjwgA */
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
          on: {
            SEARCH_INTEGRATIONS: 'loaded.debounceSearchingIntegrations',
            SORT_INTEGRATIONS: {
              target: '#loading',
              actions: 'storeSearch',
            },
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
          },
        },
        loadingFailed: {
          id: 'loadingFailed',
          entry: ['clearCache', 'clearData', 'storeError'],
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
          ...('data' in event &&
            !isError(event.data) && {
              search: {
                ...context.search,
                searchAfter: event.data.searchAfter,
              },
            }),
        })),
        storeIntegrationsResponse: assign((_context, event) =>
          'data' in event && !isError(event.data)
            ? {
                integrationsSource: event.data.items,
                integrations: event.data.items,
                total: event.data.total,
              }
            : {}
        ),
        storeInCache: (context, event) => {
          if ('data' in event && !isError(event.data)) {
            context.cache.set(context.search, event.data);
          }
        },
        appendIntegrations: assign((context, event) =>
          'data' in event && !isError(event.data)
            ? {
                integrationsSource: context.integrations?.concat(event.data.items) ?? [],
                integrations: context.integrations?.concat(event.data.items) ?? [],
                total: event.data.total,
              }
            : {}
        ),
        storeError: assign((_context, event) =>
          'data' in event && isError(event.data) ? { error: event.data } : {}
        ),
        clearCache: (context) => {
          context.cache.reset();
        },
        clearData: assign((_context) => ({ integrationsSource: null, integrations: null })),
        clearError: assign((_context) => ({ error: null })),
      },
      guards: {
        hasMoreIntegrations: (context) => Boolean(context.search.searchAfter),
      },
    }
  );

export interface IntegrationsStateMachineDependencies {
  initialContext?: DefaultIntegrationsContext;
  datasetsClient: IDatasetsClient;
}

export const createIntegrationStateMachine = ({
  initialContext,
  datasetsClient,
}: IntegrationsStateMachineDependencies) =>
  createPureIntegrationsStateMachine(initialContext).withConfig({
    services: {
      loadIntegrations: (context) => {
        const searchParams = context.search;

        return context.cache.has(searchParams)
          ? Promise.resolve(context.cache.get(searchParams))
          : datasetsClient.findIntegrations(omitBy(searchParams, isEmpty));
      },
    },
  });
