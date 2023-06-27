/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, assign, createMachine, raise } from 'xstate';
import { UNMANAGED_STREAMS_PANEL_ID } from '../constants';
import { defaultSearch, DEFAULT_CONTEXT } from './defaults';
import {
  DatasetsSelectorContext,
  DatasetsSelectorEvent,
  DatasetsSelectorStateMachineDependencies,
  DatasetsSelectorTypestate,
  DefaultDatasetsSelectorContext,
} from './types';

export const createPureDatasetsSelectorStateMachine = (
  initialContext: Partial<DefaultDatasetsSelectorContext> = DEFAULT_CONTEXT
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgZTABswBjdAewCcA6Ew87CAYgBUB5AcQ4BkBRAbQAMAXUSgADgwCW6KeQB2YkAA9EAVgBMAGhABPRAA4AjNTUBfMzrSZsuAsTJVq5cWHmtOPASKWTYMuUUkFUQjIwAWA2oANgB2AE5otWj4gw1wjSN4nX0EZJNBaI01AGZBNSNYtVjjCysMLBx8IlIKGhc3akIpWFl5KABJeXQwKEoMQNgmAGEACQBBADkOXgB9AAUl3m4hUWC-AIUlVQRw8JMDErV4kqqcxHia6lu1QTKKqpqjOpBrRrsWo52q55F0en1BsNRuNZAopnMlisNlsdkY9hJpLCgqATmcLlcbnc9OoUtRCsV3pVqrVLL8GrZmg42s4QWDelJ+kMRmMJnCmHhpgAlNjcbirdirAaLFi8DiC+YsAZsRZ4VYAITYLHYAFldr5MYFjoZYvcEDVwjFYllyh9qd9aX8GfZWk4OqDuuzOVCeVipnhePNBXN1QBNVaLeba7zokAHLFGhBGNQWlIRclqU3RaImDRJJJqW1fH6OprOoEszoeiFc6G8+R+tiClih1aN5C8QV6-YGo7BE5GIrUS4aN5GYqm0qxIfXcI2qlFh300uA5lutnV70wwJ4dCUMCoAC28IWyzWm0W2y7GP88b7iGiV2oWVKY4zxLyRiiyQp5XnNPqNjLkyrqslWHKQtyW4KDue6Hn62y8NMzbIAq8z+iwV6xj22IhImERRHEiTJKk6SZNk77ZiY36lL+nz-nSgEAsBwKVuC4E1j6267vuR78gGQazC2EZRphcaGneCAGK81C5gW8RnGkGRZKaJTyU+34GLRdrFkuTEuix7psV6kF1jBPENk2LZth2onYQmUlRIIbwGJ8JSkcp74aLEgjUFUOmMYy+kVoZnpQAAqvIB6oPIqAwBAZlwTMJ5Iuel4+N2N7iTi96Ps+JSvqa8ReUOVRvFpC4Af8gXlmuYH9BFUUxXFCW8f6fBIasKEsGhvAYel16HDh-b4ZaREpIpZGFWc1BKfEc50falVOiuIGsaFDXRbFkAtfBgbBmqYbCdG+qZb22WSdJghJjOkTueRuSaSUM3RC5mmFvRJZ6TVoFGeFkWbc13GJXgjbNgdraCu2nb9Vhp1DYY1RDiOGjGCRs2ZppZJFDR732rS8jkBAcBKJ91VtCdg0JgAtPdiBU9E-lVWWzJ0AwkAU7e51GFcT3PijWQTR5uTJFE8SvpSC2M8tzHBRzWW4appqfk9xRS0BQVrgAFuCctnbhRiFKY2OmuEsTRNO8nzdSgixGrX2rj9oUcVB9a6-DiaG9RpoGAY5uvmVuN22Tq0hRuJlYjtbv2ZU1CJC5WS3ej76aBoRs-oHi4BczIfruBG1NdtQNHlHEnGFOcdWvJgu0wgNwXKVEvaRYZhAA */
  createMachine<DatasetsSelectorContext, DatasetsSelectorEvent, DatasetsSelectorTypestate>(
    {
      context: { ...DEFAULT_CONTEXT, ...initialContext },
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'DatasetsSelector',
      initial: 'closed',
      states: {
        closed: {
          id: 'closed',
          on: {
            TOGGLE: 'open.hist',
          },
        },
        open: {
          initial: 'listingIntegrations',
          on: {
            TOGGLE: 'closed',
          },
          states: {
            hist: {
              type: 'history',
            },
            listingIntegrations: {
              entry: ['storePanelId', 'retrieveSearchFromCache', 'maybeRestoreSearchResult'],
              on: {
                CHANGE_PANEL: [
                  {
                    cond: 'isUnmanagedStreamsId',
                    target: 'listingUnmanagedStreams',
                  },
                  {
                    target: 'listingIntegrationStreams',
                  },
                ],
                SCROLL_TO_INTEGRATIONS_BOTTOM: {
                  actions: 'loadMoreIntegrations',
                },
                SEARCH_BY_NAME: {
                  actions: ['storeSearch', 'searchIntegrations'],
                },
                SORT_BY_ORDER: {
                  actions: ['storeSearch', 'sortIntegrations'],
                },
              },
            },
            listingIntegrationStreams: {
              entry: ['storePanelId', 'retrieveSearchFromCache', 'maybeRestoreSearchResult'],
              on: {
                CHANGE_PANEL: 'listingIntegrations',
                SELECT_DATASET: {
                  actions: ['storeSelected', 'selectStream'],
                  target: '#closed',
                },
                SEARCH_BY_NAME: {
                  actions: ['storeSearch', 'searchIntegrationsStreams'],
                },
                SORT_BY_ORDER: {
                  actions: ['storeSearch', 'sortIntegrationsStreams'],
                },
              },
            },
            listingUnmanagedStreams: {
              entry: ['storePanelId', 'retrieveSearchFromCache', 'maybeRestoreSearchResult'],
              on: {
                CHANGE_PANEL: 'listingIntegrations',
                SELECT_DATASET: {
                  actions: ['storeSelected', 'selectStream'],
                  target: '#closed',
                },
                SEARCH_BY_NAME: {
                  actions: ['storeSearch', 'searchUnmanagedStreams'],
                },
                SORT_BY_ORDER: {
                  actions: ['storeSearch', 'sortUnmanagedStreams'],
                },
              },
            },
          },
        },
      },
    },
    {
      actions: {
        storePanelId: assign((_context, event) =>
          'panelId' in event ? { panelId: event.panelId } : {}
        ),
        storeSearch: assign((context, event) => {
          if ('search' in event) {
            context.searchCache.set(context.panelId, event.search);

            return {
              search: event.search,
            };
          }
          return {};
        }),
        storeSelected: assign((_context, event) =>
          'dataset' in event ? { selected: event.dataset } : {}
        ),
        retrieveSearchFromCache: assign((context, event) =>
          'panelId' in event
            ? { search: context.searchCache.get(event.panelId) ?? defaultSearch }
            : {}
        ),
        maybeRestoreSearchResult: actions.pure((context, event) => {
          if (event.type === 'CHANGE_PANEL' && context.searchCache.has(event.panelId)) {
            return raise({ type: 'SORT_BY_ORDER', search: context.search });
          }
        }),
      },
      guards: {
        isUnmanagedStreamsId: (_context, event) => {
          return 'panelId' in event && event.panelId === UNMANAGED_STREAMS_PANEL_ID;
        },
      },
    }
  );

export const createDatasetsSelectorStateMachine = ({
  initialContext,
  onIntegrationsLoadMore,
  onIntegrationsReload,
  onIntegrationsSearch,
  onIntegrationsSort,
  onIntegrationsStreamsSearch,
  onIntegrationsStreamsSort,
  onUnmanagedStreamsSearch,
  onUnmanagedStreamsSort,
  onDatasetSelected,
  onUnmanagedStreamsReload,
}: DatasetsSelectorStateMachineDependencies) =>
  createPureDatasetsSelectorStateMachine(initialContext).withConfig({
    actions: {
      selectStream: (_context, event) => {
        if ('dataset' in event) {
          return onDatasetSelected(event.dataset);
        }
      },
      loadMoreIntegrations: onIntegrationsLoadMore,
      relaodIntegrations: onIntegrationsReload,
      reloadUnmanagedStreams: onUnmanagedStreamsReload,
      // Search actions
      searchIntegrations: (_context, event) => {
        if ('search' in event) {
          onIntegrationsSearch(event.search);
        }
      },
      sortIntegrations: (_context, event) => {
        if ('search' in event) {
          onIntegrationsSort(event.search);
        }
      },
      searchIntegrationsStreams: (context, event) => {
        if ('search' in event) {
          onIntegrationsStreamsSearch({ ...event.search, integrationId: context.panelId });
        }
      },
      sortIntegrationsStreams: (context, event) => {
        if ('search' in event) {
          onIntegrationsStreamsSort({ ...event.search, integrationId: context.panelId });
        }
      },
      searchUnmanagedStreams: (_context, event) => {
        if ('search' in event) {
          onUnmanagedStreamsSearch(event.search);
        }
      },
      sortUnmanagedStreams: (_context, event) => {
        if ('search' in event) {
          onUnmanagedStreamsSort(event.search);
        }
      },
    },
  });
