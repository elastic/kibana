/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of } from 'rxjs';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMAJlmcyAFgCsAZiVrZa6QHY1ATk66ANCACeMgGxlOVjfq27ZKlbOkBfD2bSYc+YlIyeiJcCBooVgAZAHkAQQARZAA5AHEAfQBlAFUAYVyAUQKE4q5eJBBBYVFUcSkEAA4lBrIVY107dV0VBs5pM0sEaTayK2lODSUlCd1VYy8fDCw8GvIQsIjo+KS09IAxOOQo0p5xKpFAupklaSUyWSVuqwMrTgU1PoHEd0UVaQaetIrPZdN1VAsQL5lgESGtQuFUFAALJEbBgLaJFIZHL5IolBJlM5CC5iCr1FwGMhqFQvQzqexWFRWL4ILR3KyyBryUEGaS8gwPCFQ-yrYLwiIotEYnYZA5HE7lATEmpXBAAWhUdyM9hUuissw0bQMLOaalsPQmmlkBhpvKFSxFgThYTYACUCrFEukUgAVAqpV1xH3IGLJTKEirnFVkxANam2a167TuQEqFnWykNYb6BoGBr6Oa6e1+FZOsUuiDS9JImLu73JP0BoMhsMRpXVS4xoZA+56Pq9Xqgy3pzgqVqMrPSNQ6B4NAHF6Gi9YQNiZApxV25AAS9cbgeDofDp0jys7oHq+tkVKBnC5b0MALTFkQY3uBmn+asWZ5fQXjth5YIlAey4AQ9Buh62y7v6+4tkeiqVKepLnjID5kFyqgKNIU7yF+LJTtIZCzOoLjOO42HUl43ggKgRArvAFTCqWsJEh2yGSIgapyLoREAg8jKaLezgNCyXG8lSeazLotzPO4Ux-sxQRUDQFwMMwkCsSStRdthub3EoChclYUyzMyz7quMZq8h8n63jSKgKTCQTLhEmnRih3ZqDxQJcnqdj6Lysj4VOyg2hocZTACHQOdRTFOc6QGSmAblnhx6q6JSuh8UoAk2cJLI6HcsgcsMbjTJqzyOUu8IaSebHaR5rhXhyzRNBonAGI8QXmUCdycBMNI+cCxlKFVZYuYiIFgbV7ZaaqvWUmyfycnqbQiT1-xvuorhvO405vFRHhAA */
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
        storeIntegrations: assign((context, event) =>
          'data' in event
            ? {
                integrations: event.data.items,
                total: event.data.total,
                pageAfter: event.data.pageAfter,
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
    },
  });
