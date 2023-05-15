/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of, throwError } from 'rxjs';
import { actions, assign, createMachine } from 'xstate';
import { IDataStreamsClient } from '../../../services/data_streams';
import {
  DefaultIntegrationsContext,
  IntegrationsContext,
  IntegrationsEvent,
  IntegrationTypestate,
} from './types';

const defaultContext = {
  integrations: null,
  error: null,
  page: [],
};

export const createPureIntegrationsStateMachine = (
  initialContext: DefaultIntegrationsContext = defaultContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMAJlmcyAFgCsAZiVrZa6QHY1ATk66ANCACeMgGxlOVjfq27ZKlbOkBfD2bSYc+YlIyeiJcCBooVgAZAHkAQQARZAA5AHEAfQBlAFUAYVyAUQKE4q5eJBBBYVFUcSkEAA4lBrIVY107dV0VBs5pM0sEaTayK2lODSUlCd1VYy8fDCw8GvIQsIjo+KS09IAxOOQo0p5xKpFAupklaSUyWSVuqwMrTgU1PoHEd0UVaQaetIrPZdN1VAsQL5lgESGtQuFUFAALJEbBgLaJFIZHL5IolBJlM5CC5iCr1FwGMhqFQvQzqexWFRWL4ILRqWy6Ma6JpTYydCFQ-yrYLwiIotEYnYZA5HE7lATEmpXBAAWhUdyM9hUnNmGjaBhZzXZnB6E00sgMNIMnm8kKWQsCcLCbFiiXSSJiACUCukUgAVAqpT1xP3IGLJTKEirnJVkmRA+56Pq9Xqgs0shQqVqMhrSaRqHQPBoAgX2laOkXOiCsTIFOKe3IACV9yQDQZDYYjUYV1UucYQVmcVKBnAaCm0BgBKhZY3uBgLDU5udBRhtiz85dhlYRUD2uAI9DY3tdCRbbeDofDkdO0cVfdA9Xzk7IY9UCjzWlkVgaLPz0jIszqC4zjuB+KheLaqBEBAcDiIKm6kESvakg+iAqnIdzUto2gNAWfT0iy6HWso+acAYBhKORSiDmopYbjCQRUDQFwMMwkBISStT9nmDSUg8ChjlYUyzMyFhoeM7LWh8i6vAClp0dCwrrDuHGxqhQz5roZBAmOnJ2Po1qyL++bKJaGi4VMAIdOBtrwQxTo7uKYCqfekhoZyVJuGyuEfMMaiiYMOiKKCwIKN+y5tFYCkOluynsbeyFcepriyKMRZNBoZGPEZYlDEJtgTDSOnAkJSjRQhDkRHuB7xT2nHKkClFUg8fyyDJbQ-rlPFzuorhvO4eGyBBHhAA */
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
              actions: 'storeIntegrations',
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
            LOAD_MORE_INTEGRATIONS: 'loadingMore',
            SEARCH_INTEGRATIONS: 'loading',
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
        storeIntegrations: assign((_context, event) =>
          'data' in event
            ? {
                integrations: event.data.items,
                total: event.data.total,
                search: {
                  pageAfter: event.data.pageAfter,
                },
              }
            : {}
        ),
        appendIntegrations: assign((context, event) =>
          'data' in event
            ? {
                integrations: context.integrations?.concat(event.data.items),
                total: event.data.total,
                search: {
                  pageAfter: event.data.pageAfter,
                },
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
      loadIntegrations: (_context, event) =>
        from(
          'search' in event
            ? dataStreamsClient.findIntegrations(event.search)
            : dataStreamsClient.findIntegrations()
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
