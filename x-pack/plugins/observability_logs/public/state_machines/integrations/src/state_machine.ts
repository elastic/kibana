/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catchError, from, map, of } from 'rxjs';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMAJk4BmMgoCcnWQA4FGjQDYFAdlkKANCACeiALTTlGzmumcD6gCwrdK2QF9vZtJg4+MSkZPREuBA0UKwAMgDyAIIAIsgAcgDiAPoAygCqAMIFAKLFyWVcvEgggsKiqOJSCFq2rm0ArO0aTrrtutIaZpYI0gpK0r0qLpycurKunNIGvv4YWHj15OGR0XFJqZlZAGKJyLEVPOK1IiGNMqoGZANtstJLTm+DFjIqSs6u8iMujmLk6KxAAXWwRIWwiUVQUAAskRsGA9il0tl8kVSuVkpUrkIbmJqk15rIyLIPO43px2gpXEZTN8EAo6WR9ANOAtXL1ehpwZCgpswnDosjUeiDtkTmcLlUBET6ncEFYDLYPCp2rMnPT9K52kNELz2hzRpNfvIVK5pO1BWthSFyAQIPQ0QkUllEfEAErFLLpAAqxQyPsSgeQ8TSOQJ1WuytJiE0tk5C1kBgU7Q8+iNCBtrkpDi8ahN-PtgQ2TrILrdrByxUSPoKAAkA2lg6Hw5Ho7HFXVbomEMmOQppGmM1ngczhozdGQXCpi9y+V1y1CRQBjAAWYA3AGtxSiwELKzDEgA3XAEei4ABG15E5g4lzjSoHoCaVi18-ktqmugWMYjFzN4506Bx2lGeZdFmNo10dGEyG3XcDwRCVjwdU9SAvK8b3vRh0CfdhpAVGo3xJD9EF6SlXA0LN1EzbNNFzeQCxgtoYKpFcDDtPwIUw6FQggMBbyIKgN2iHIwFwbBtzrBsm1bIMQzDCMoxjF8+2JBpBysJQxlkXQDA8bpFi0OZp2saRvw8AxugGKZtXceCsPIYTRPEyTpNkrdWAkWB0HwMAyFwAAzTBsAACm1TgAEpWBPQS3JEsTUAkhEpJk7dezI-sKMkKj2gLbV5mpOjs0s1VfjIRRDEXV52iMLoVBcpLRR2BEjlwtg-Q9ZI2w7VTuw00j43fAqRm0WwDH6QwJg0WR5A0VwQLHZQZi1KDeVg1xfD41AiGE+BqkSzZCTynTKNVMclCMRYsxmwDDFkXMrE0JReQMOyGtkRqtGWPjTqrKgaBuBhmEgc7tJVN4jCeOzfgBUYjBm165FsTMDF5eRZiLFRpFakVtnhKAoYTK63nkJ46TkGaFH0IwvmGDwau1KZVEZTMGsJqticPVEyfGz9qptIqjEMp7gJZKl9IURbsbUIzFh5xCazAQX8uF007r-R7aql4Y+hTc0s0tBwARV0JkP3fmMIrJKcOvO8H0IjXLomiZOGUKZ1C+xjgWYlkFjIWjGT1BbzYGS3ko8tKvKyrc3ZVentfaUqAPKqc0f0MhtS5nijLULofEBgSibFTruogJPBwmOXKVmgCOlojwQJmMg6Icew5mx7oS98IA */
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
              target: 'idle',
              actions: ['storeSearch', 'storeIntegrations', 'storeInCache'],
            },
            LOADING_FAILED: {
              target: 'loadingFailed',
              actions: 'storeError',
            },
          },
        },
        loadingMore: {
          invoke: {
            src: 'loadIntegrations',
          },
          on: {
            LOADING_SUCCEEDED: {
              target: 'idle',
              actions: 'appendIntegrations',
            },
            LOADING_FAILED: {
              target: 'loadingFailed',
              actions: 'storeError',
            },
          },
        },
        idle: {
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
              target: 'idle',
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
        storeInCache: assign((context, event) => {
          if (event.type !== 'LOADING_SUCCEEDED') return {};

          return {
            cache: context.cache.set(context.search, event.data),
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
