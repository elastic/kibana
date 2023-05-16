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
  /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMAJlmcyAFgCsAZiVrZa6QHY1ATk66ANCACeMgGxlOVjfq27ZKlbOkBfD2bSYc+YlIyeiJcCBooVgAZAHkAQQARZAA5AHEAfQBlAFUAYVyAUQKE4q5eJBBBYVFUcSkEAA4lBrIVY107dV0VBs5pM0sEaTayK2lODSUlCd1VYy8fDCw8GvIQsIjo+KS09IAxOOQo0p5xKpFAupklaSUyWSVuqwMrTgU1PoHEd0UVaQaetIrPZdN1VAsQL5lgESGtQuFUFAALJEbBgLaJFIZHL5IolBJlM5CC5iCr1FwGMhqFQvQzqexWFRWL4ILRqWy6Ma6JpTYydCFQ-yrYLwiIotEYnYZA5HE7lATEmpXBAAWhUdyM9hUnNmGjaBhZzXZnB6E00sgMNIMnm8kKWQsCcLCbFiiXSSJiACUCukUgAVAqpT1xP3IGLJTKEirnJVk77-MgNWT2AwfXqgs0s4YqZRWJQPBoNHQFgEC+0rR0i50QViZApxT25AASvuSAaDIbDEajCuqlzjCHVsjI0i0zST+gMAJULJVsl0rQaBnzzX+8k4BgMZb8FdhZAAxgALMD7gDWYtRYEFu9IcQAbrgCPRcAAjJ8icwcU7RxX90D1FVuVGbU+lHNQPmGNRmQsGRwLITd1BcZx3GkUcVG3aFhSPE9z0RcUr3LGFbwfJ9X3fdBP3YaR5UqX9SX-RAkypVD9AaYFniaPMWXkYdOHHDRnmmDpGQwh09wgMAXyIKh9wiTIwFwbAj1retGxbf1A2DUNw0jb9exJWoB1HMh9D4qwGm6Wc9BaNwNDUbpRJvcgJKkmS5IUpTD1YCRYHQfAwDIXAADNMGwAAKNpOAASlYa8iOcyTpNQWTEXkxSjx7Wi+3oyRECsXRpFaRk8yUa0OKUaDBkAnMemXAs1wUTdHPiqsESgPZH3oNhvVdBJW3bLSu10miYz-XKhkMFok1UBRUK0ZMGizHQTNULRtXkVC0K8W1UCICT4AqOLViJbLDIY1U5BsRkOjm8C+npWdkxsN47Ic20jsrKgaAuBhmEgE6DOVVCl3ufNOCTErZkqxAVXGdlrTTTlwZpdD3sI4V1jagHY3OuaFyBCdXnyww5CzYzSvUI0pgBDpUcWHcWsxi80WxsaAM5KlbO0IsIIemDWXGEzOSsBRzIaPQ2isZqMfhf6f1O5VXGHEXx00aZl2cLM81sCYaQJ9ipmlytsLPZmCIZ1Z706sjGAo1mcvqPQFwqvpOSBcquP57V4ItOR00tTdwaN8TErc1KPKPe2zvGtQmPFpkpjKqcKqUKyKtsPX1D0PjOA3WRg6CJnEQ6p85f0nHxqBUqqQeP5ZAsxlwbJloLXUVw3ncO78+2oA */
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
