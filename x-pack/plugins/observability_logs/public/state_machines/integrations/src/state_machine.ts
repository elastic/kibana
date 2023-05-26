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

/**
 * TODO
 * - Split search and sort into 2 different events
 * - Split states into UI accessible interactions, keep track of current UI state for this
 */

export const createPureIntegrationsStateMachine = (
  initialContext: DefaultIntegrationsContext = DEFAULT_CONTEXT
) =>
  createMachine<IntegrationsContext, IntegrationsEvent, IntegrationTypestate>(
    {
      /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogCMATgDMZABzSATABZpANgDs8nbJ3rZAGhABPRAaVkt0nffkBWJ9KWz1AX09m0mHPjEpGT0RLgQNFCsECRgZDQAbkQA1nF+WHiiwaHhkQiJRADGgSRc3GXigsJZ4lIITqpmlghKumQKOi5Osg2yqqry3r4YGSXZYRGoUWDY2ETYZPz0+ABm8wC2ZOkBWeQ5k1D5qEnFWWUVSCBVIkG1Mlqy0mQ6Wi5KzjqcLo0WiK+KWg0nGkvWk8le0iGIG2mSCewmkHiEHoYFYABkAPIAQQAIgB9ACyGIASgBRPHIAByABVSQBxYlY6nIDGUgDKFwEQhuYkudXUnEUqj06icnE46iUTkBEqaiDFslsWk0-SlWk4WgeUJhY3h4URBGRqLZpKxxIAwgAJCk0+mM5msjk8Srcmp8xACoUisUStWqWW-erqsjaFWqEGdVRanzQkY7OEhBEQJEo1hsknUm20hlMlnszlXV23d0INRg9p9f3ycWcKUauUILTyRXNjWyWSa+RRnrauOwkh6iAGo1p00W61U7P2vNsvFs6lkrEEp28S7XN2gfmCsjC+Si8WS6X+9QNqNOZSubrqdQDJx6LS9-z98b65OG1Pp4mZyd23OOucLqay4FuuxabogSg6KeSiqGQ4LyCoLwfG4siPqMuyJq+mEHAS8yojEqBxAUqRbH2urYYi+yRLh2BgEcJxjOczprkWvLgY24btC86oOIKkqPA24KwdW6g6FG7ifKo7yDDGOoYfslETNReGsDMcwLEsqwbKRT7kQpyZUVMNF0QUpxBExq5ctUYGSDI4aKO2-SCjWdZaA2onqDusicJ0rh9NKTgycMunyUmZBDgARkQVCFGAbJgLg2CFAAFpEclwqOZpWlmv4OvmzFWTyqB3C07w7nuApgmobxOA2gXnq2WjuF20qaGh8YDhRyaRdFqCxfFiUpWlZG7KwEiwOg+BxLgKyYNgAAU1acAAlKw6Wdfp4VgFFMVxQlSWpVM62kCBrHFSWZYOZWzniq5dWPMo3m6E1fTNqoTjtc+g6Ij1u0DQdw0hXCbLoLRuDrLAmXjjlOZ5bO86LsBBWFtZbG2S0orKJ04oeEYDSaA2IJPDWtaag8Dz+qon16WFv19Xtg2HVAx2wCDYMQ2NE1TWQM1zYt4qrSzXVbTt9P-UNR0jcDoMJRDp2o+d7HdOeEpNdKRP2J0hNiXBshSjoDgPOo6p7tToW5FMABiuAECiECsGSmK4jD06OvLRUldoD0vG8HxfA0DYmyGQIgnr7ZfFTUKoEQQ7wJcLMugrJUALSmIGycaGQJPZyTkfBehCZUDQNwMMwkCJx7JYB4GBg6LY9jvcb1Z69oZsJoZUAVxu6PSKK55OMb3kCn38h7vdigD22Ymj4CoptxtSZdzZdTNoHE+53o4Z6zB88vkOb5GkvaN1HIigIboGh9MY9i1YGmicM8nxgh4dhNoCu-fQZSlGXhR+K+jrQbDgjEj5Dwe4lAQPctuCE0gNSD0CjoD+ws6b9X2hLZmUsBx-xKlKGwBgloCjsMYJs90H7uA1BAwEvFISyUwXvH621eqoMZoDAuA42ayzjoVbudR3hPFDLWSUxgxS6FPBqMgPpazdAcETPWSCO7W1tuXFiScLoeFgmea8TZIw3h+M0UUNhtB3nsLoEmehvDeCAA */
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
            onError: '#loadingFailed',
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
          entry: ['clearCache', 'storeError'],
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
          console.log('get here', context.search);

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
        clearCache: assign((context) => ({
          cache: context.cache.clear(),
          integrationsSource: null,
          integrations: null,
        })),
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
