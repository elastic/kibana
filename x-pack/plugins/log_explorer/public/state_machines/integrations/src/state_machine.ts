/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, createMachine } from 'xstate';
import { isEmpty, isError, omitBy } from 'lodash';
import { createComparatorByField } from '../../../utils/comparator_by_field';
import { Dataset, Integration } from '../../../../common/datasets';
import { IDatasetsClient } from '../../../services/datasets';
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
      /** @xstate-layout N4IgpgJg5mDOIC5QEkB2AXMUBOBDdAlgPaqwB0ArqgdYbgDYEBekAxANoAMAuoqAA5FYBQiT4gAHogC0ATgBs8sgEYAHAHYALMs7rV85ctkAmADQgAnonWcysgKwHZmgMwPlN1aoC+382kwcfGJSMnoiXAgaKFYIEjAyGgA3IgBrBICsPFFQ8MjohGSiAGNgki5uCvFBYRzxKQRpdQ8yY3tlRTVOF05OTXMrBGUXJXtZVU1J1UMXTWNffwwsstyIqNQYsGxsImwyfnp8ADNdgFsyTKCc8jz1qELUFNKciqqkEBqREPqZHWNjMj2GzGTiqWQuYyuYyqAaIaFKVScZzydT2EY6FwuBYgS7ZEI3NaQRIQehgVgAGQA8gBBAAiAH0ALKUgBKAFF6cgAHIAFTZAHEWdSechKVyAMpvARCL5id4NaTGHqApyyDzKYxaDywhA9VRkMGycGcZSuPSg7G4lYEyJEggksnitnUlkAYQAEpzeQKhSKxZKeNUZXV5TIXOpZGRNA5-prUUigTq2uoyLNOGjFJoI7N5n4cUsrviwoSIMTSaxxayeV6+YLhaKJVKPsHvqHGs1bBrFJj7JN7I4zJZEJolOpjApZoZ5FD9JaC3iSDaIHaHRXnW7Pdza76G+L6eKeezqYyA7x3p8Q6AFSCEUZe2jVD1ZEidUZNGQI2iO7IbA5ZHPAgXVZbVLe1y0rFlqy3H1639fdD2dE8mwvVsrzDMYozRVx7FUTUxiRdQdWkQwAUMbQRkhZ8XCBTQAOWa5ixAxi7kZXYyTiVAEiKdILnna1mKJW5olY7AwAeJ4VleQNzxbOU0IQLN3wotxphsFFDCI2YDXsOM0Q1I1NVovMrQY25BLWYS2NYLYdj2A5jjOXjAP4szSyEjYRLEopnhCKSz2lWpUMkX4TXfdN-lw0E+kUQihwQHD9W6XRsOmEdXDowtFwE0tlwAIyIKhijAcUwFwbBigAC2iEz8TXF0PRrGC-UbaSAtlVAfkaexbAhdRUQmU1+yBLQdTmWx0xwmxPFmeRc0WZzTJLMg8oK1AipKsrKuqvjrlYCRYHQfAElwI5MGwAAKHpOAASlYGqstc5awHywritK8qqo2e7SGQ2SOrbaRpxTVR2jGXDUXBPRRuMZRAX7EH1HkBR1BcU0jPm+ii0elbXo2j7toW-FxXQUTcFOWA6o3Rq62avcDyPJDWubQK5OC+Leg-VHDA8MdXDUeQdQhSNUY7cdmkxTg5vzQmHqWnG1rezbPqgb7YGJ0nyb2g6jrIE6zsu3pbtV7KnpehW8a2r6dqJknSvJ36Wf++Sug-BR2mMeRerBadRv1f4FDVT3wV69Hpcx2X8g2AAxXACFJCBWHZKk6Wpnd-Qd9rOuIzVYemadOBREHoxRpMQdTJEzRBTUwXUXw81QIhl3gd5VaDR2s+GIwDQ6TQC70XsfxcIjoRTMiOg1XCDAjUPjaoGgvgYZhIDbzOAYMsh0xHboNF7Nwh7i4j7FTMYPcfftZhRtEMqApdohXy82eI7pR2jExEb1D3YsGDpbD6xFnH7DoUE4Zr4uRLPfIKCo5gpmjDpf4fVuoOC-r8I0ZADDaFmvoHQyh2hYmMtbCOy5QIOggaza8XhATTFwtMGMIM2g6iRphWayU+4I3sKAxaTF3JQE8qQp2bMXYozcECHsU5lClyPm4I0mh8LdC0FLY22NnqrXWu9S2KsCGkD4VncMsNwxImfkiDQfVBYKDhglac05wQKA4VjOWyjcZqOVqrdWdtm5tQfg0DUAI5jB17moOY44BZxXVK0Bw1EcH6D5v+fBMtgJ3BjnHZeMl24A2wZGHQ4If5omrsg3UiNWh9RjPpaM4467eCAA */
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
        searchIntegrationsStreams: assign((context) => {
          if (context.integrationsSource !== null) {
            return {
              integrations: searchIntegrationStreams(context.integrationsSource, context.search),
            };
          }
          return {};
        }),
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

const searchIntegrationStreams = (
  integrations: Integration[],
  search: IntegrationsSearchParams
) => {
  const { nameQuery, sortOrder, integrationId } = search;

  return integrations.map((integration) => {
    if (integration.id !== integrationId) {
      return integration;
    }

    return Integration.create({
      ...integration,
      // Filter and sort the datasets by the search criteria
      dataStreams: integration.datasets
        .filter((stream) => Boolean(stream.title?.includes(nameQuery ?? '')))
        .sort(createComparatorByField<Dataset>('name', sortOrder)),
    });
  });
};
