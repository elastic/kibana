/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, createMachine } from 'xstate';
import { EntityList } from '../../../../common/entity_list';
import { DataStream, Integration } from '../../../../common/data_streams';
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
  createMachine<IntegrationsContext, IntegrationsEvent, IntegrationTypestate>(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMAJmkB2Mp1kKAzGukBWDQE5ZWgDQgAnol0AWC2QAc0-Vtm7tANheOAvh+NpMOfMSkZPREuBA0UKwQJGBkNABuRADWsb5YeKJBIWERCAlEAMYBJFzcpeKCwpniUggAtHJkljpyRqbmCjZk9hb2LtIWLjZqshZePhjpxVmh4aiRYNjYRNhk-PT4AGYrALZkaf6Z5NlzUHmoiUWZpeVIIJUigTUy0tKcZGpaipwKWgrNFjUxjMCBcFi0ZEBAwsqhsqk4al04xABwygWOs0gcQg9DArAAMgB5ACCABEAPoAWUJACUAKLk5AAOQAKnSAOI04ks5CEpkAZVuAiEjzEd1qiNkZE6XxcPxcul0nRcwMQkqaFhsnE4Ni+StkLmRqOmGLCWIIOLx-LpxJpAGEABKM1kcrk8vmCngVEXVcWIA1S2R2EZqTpvA0KVUIOG6aWfYYWfQKBT2I2TQ7o4KYiDY3Gsfm0lnOtmc7m8gVC+4+p5+hAG94uX42cGyTiK9S6KNglzdThQ8HDA1gtN+NEkU0Qc2W-M2+1O5klt3l-nk-ks+nEyme3h3B6+0C1OoGNSQmxwhSNtTa+SAqPyKUDThDTRuaRa2SyEdTI5Zs05i15gWNJFgurplh6q7rjaW6VnuNYHog-y2Fouihm0IKjNIZAuBomoaAiF5PmM3goumY4zH+v6nJSKx4tEqCxPkKT7GRJpUViJwRDR2BgOclzTDcXq7tWYoIQgiJdBYF7uMqzYGjYKrtAg4JKJwridAoUlfGoX4ZuO7E5px8zcXiizLKs6xbLsLGjmxJwcbMXG0XxhQCTwsEiagzzRroEIxlowzaFoXxRloT4aloUK-G+gzERMtk-vZOaTgARkQVAFGA-JgLg2AFAAFhExpHDOtqOsWYHuhWQnClU8GSIgfwQm+vwBfKWpqVGmldI2PwqP0mnyAounkROWKpelqCZdluUFUVrElRIsDoPgsS4JsmDYAAFFenAAJSsMVmZJWQE0ZVlOV5YV8xHeOHl1aJDUIKhWHBR+bhaEMrzuFGMbdAoPzJp9-wKnFpEJcd2anWAaXnTNV3zRD478ugPG4DssClXOFWllVK5rhuME1VWD1ebWdQKpCuhyh+iY2CmF5RoitiNq2YbNs2Ulg7dFGTslMOTdNl1zTdC3oijaMY6wS0rZgZDrZtO3agdPNjfzsNTRds3XVAqsSzlGP3aKZNiXUIyxkqbYtW8-z0xYTNqU0YL6KzPyONII12Y58wAGK4AQuIQKw9JEmSONLh6Rv7k9rTWO4LgGihuoKtIXWathAMAwaigwooXgkagRCTvAdyq96pPeXUMIQpbzj0zbuh21GDSfN0Iz-PIdhfMFOkkarlDULQBAMMwkDl8b3mvM43Rgk+BhRuGWHfW2OpyMGHt92L+lGVA4-R7UryKGQwVSa22ruJqXWKmQH5XsGnB-BJnuJdme-1YeoZKLX1s-I3mnN1JbC7d9Bvm0EFA0z9IaUQAmAN+j0D4KRvoMHU1NfI2EVGeJmF4PiKh+OgkYOEGaQO3lDHeJk4EmyemCE8uoe6oUGLoJ8nYlJSSwgpVsYVqEIgGMQ3m40BZw2FjrMuwkK61mCu8TS-R0FaV6AqX6fZ-o-DPmeGEqheFq2hhrIW2tEbfnFqjA2JdaoT3Jm8HsBhkyJlBpYemikQRvGsLIK8nCdC2M+p+TeSNeYRD9gHMeojTFiUPjQ6Q7g4RqVznIKM4JYxfCsBYFQdM+z5w8EAA */
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
                SEARCH_INTEGRATIONS_STREAMS: 'debounceSearchingIntegrationsStreams',
                SORT_INTEGRATIONS_STREAMS: {
                  target: 'idle',
                  actions: ['storeSearch', 'searchIntegrationsStreams'],
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
            debounceSearchingIntegrationsStreams: {
              entry: 'storeSearch',
              on: {
                SEARCH_INTEGRATIONS_STREAMS: 'debounceSearchingIntegrationsStreams',
              },
              after: {
                300: {
                  target: 'idle',
                  actions: 'searchIntegrationsStreams',
                },
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
          ...('data' in event && {
            search: {
              ...context.search,
              searchAfter: event.data.searchAfter,
            },
          }),
        })),
        storeIntegrationsResponse: assign((_context, event) =>
          'data' in event
            ? {
                integrationsSource: event.data.items,
                integrations: event.data.items,
                total: event.data.total,
              }
            : {}
        ),
        searchIntegrationsStreams: assign((context) => {
          if (context.integrationsSource !== null) {
            return {
              integrations: searchIntegrationStreams(context.integrationsSource, context.search),
            };
          }
          return {};
        }),
        storeInCache: assign((context, event) =>
          'data' in event ? { cache: context.cache.set(context.search, event.data) } : {}
        ),
        appendIntegrations: assign((context, event) =>
          'data' in event
            ? {
                integrationsSource: context.integrations?.concat(event.data.items) ?? [],
                integrations: context.integrations?.concat(event.data.items) ?? [],
                total: event.data.total,
              }
            : {}
        ),
        storeError: assign((_context, event) => ('data' in event ? { error: event.data } : {})),
        clearCache: assign((context) => ({ cache: context.cache.clear() })),
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

        return context.cache.has(searchParams)
          ? Promise.resolve(context.cache.get(searchParams) as FindIntegrationsResponse)
          : dataStreamsClient.findIntegrations(searchParams);
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
