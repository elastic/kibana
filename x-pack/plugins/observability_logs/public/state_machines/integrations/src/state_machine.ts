/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of, throwError } from 'rxjs';
import { actions, assign, createMachine } from 'xstate';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMAJlmcyAFgCsAZiVrZa6QHY1ATk66ANCACeMgGxlOVjfq27ZKlbOkBfD2bSYc+YlIyeiJcCBooVgAZAHkAQQARZAA5AHEAfQBlAFUAYVyAUQKE4q5eJBBBYVFUcSkEAA4lBrIVY107dV0VBs5pM0sEaTayK2lODSUlCd1VYy8fDCw8GvIQsIjo+KS09IAxOOQo0p5xKpFAupklaSUyWSVuqwMrTgU1PoHEd0UVaQaetIrPZdN1VAsQL5lgESGtQuFUFAALJEbBgLaJFIZHL5IolBJlM5CC5iCr1FwGMhqFQvQzqexWFRWL4ILRqWy6Ma6JpTYydCFQ-yrYLwiIotEYnYZA5HE7lATEmpXBAAWhUdyM9hUnNmGjaBhZzXZnB6E00sgMNIMnm8kKWQsCcLCbFiiXSSJiACUCukUgAVAqpT1xP3IGLJTKEirnJVkmRA+56Pq9Xqgs0shQqVqMhrSaRqHQPBoAgX2laOkXOiCsTIFOKe3IACV9yQDQZDYYjUYV1UucYQ6tkZHzRYasn0BgBKhZKvHrQaBiURf+8k4BgMpb85dhZAgYAARkQqABjCKZMC4bDHgAWNbrDeb-sDwdD4cjp2jir7oHq+bI+k4JQrAaboZz0Fo3A0NRuk3aFhT3Q8TzPC8r1vCRYHQfAwDIXAADNMGwAAKD5OAASlYQVtyCBCj1QU9EXPS8b27Sov1JH9vhpWxmhmAwLTUBdZBnSlHmaMddHzcZNE0WCHR3dYESgPZcAIeg2G9V0EhbNsX07d95VY3t2MkGRDBaMdVAUPMtFkYCWUk-9VC0bV5DzfMVC8W1UCIPd4AqSiYVIIkjNqfsVTkO5qW0bQGgLPp6RnWybDeKCYNtALhSoGgLgYZhIGCklQo4oZ-kpB4FDHKwplmZkLEQcKJjIa0PhA14AUtWSqKdRSCtjYrrN0YdgPHV4rAnOR7L-JRLQ0WKpgBDoPPSstAu6sVUTAXrvxM1VOSpSCYri4Y1FqwYdEUUFgQUYDc26OxOtWys9wgLbjPqVwhysUdpLXR4hLqoYqtsCYaSBBpgSqpQHvgg9aPoqBGNQ16ip2gSh1zJkpmtZ4miqsCgNsUH1CTaY11kaGKwUiJlNU-LPxC5UgWmqkHj+WRWraBpJpaC11FcN53Di8nPKAA */
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
          entry: 'notifyLoadingStarted',
          invoke: {
            src: 'loadIntegrations',
          },
          on: {
            LOADING_SUCCEEDED: {
              target: 'loaded',
              actions: ['storeSearch', 'storeIntegrations'],
            },
            LOADING_FAILED: {
              target: 'loadingFailed',
              actions: 'storeError',
            },
          },
        },
        loadingMore: {
          invoke: {
            src: 'loadMoreIntegrations',
          },
          on: {
            LOADING_SUCCEEDED: {
              target: 'loaded',
              actions: 'appendIntegrations',
            },
            LOADING_FAILED: {
              target: 'loadingFailed',
              actions: 'storeError',
            },
          },
        },
        loaded: {
          entry: 'notifyLoadingSucceeded',
          on: {
            LOAD_MORE_INTEGRATIONS: 'checkingMoreIntegrationsAvailability',
            SEARCH_INTEGRATIONS: {
              target: 'debouncingSearch',
              actions: 'storeSearch',
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
          on: {
            SEARCH_INTEGRATIONS: {
              target: 'debouncingSearch',
              actions: 'storeSearch',
            },
          },
          after: {
            500: {
              target: 'loading',
            },
          },
        },
        loadingFailed: {
          entry: 'notifyLoadingFailed',
          on: {
            RELOAD_INTEGRATIONS: {
              target: 'loading',
            },
          },
        },
      },
    },
    {
      actions: {
        notifyLoadingStarted: actions.pure(() => undefined),
        notifyLoadingSucceeded: actions.pure(() => undefined),
        notifyLoadingFailed: actions.pure(() => undefined),
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
    actions: {},
    services: {
      loadIntegrations: (context, event) =>
        from(
          'search' in event
            ? dataStreamsClient.findIntegrations({ ...context.search, ...event.search })
            : dataStreamsClient.findIntegrations(context.search)
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
        ),
      loadMoreIntegrations: (context) =>
        from(
          'search' in context
            ? dataStreamsClient.findIntegrations(context.search)
            : throwError(() => new Error('Failed to load more integration'))
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
        ),
    },
  });
