/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, assign, createMachine, raise } from 'xstate';
import { AllDatasetSelection, SingleDatasetSelection } from '../../../utils/dataset_selection';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgZTABswBjdAewCcA6AB3PoDcwaTDzsIBiAFQHkA4gIAyAUQDaABgC6iUPVgBLdIvIA7OSAAeiALQBmAKzUALAEZDAdgBslk4ckAmEwA5HhkwBoQAT0T6LakdHFzMLMLN9dzsAXxjvNExsXAJiMio6BnJmGgYwNS4AYWE+PAkZTQVlVQ0kbUQzSQBOY0szd31zE0lrJutrbz8EVxdTM0solya3YP64hIwsHHwiUgoaeiYWajyC-iExKVk6qpV1TR0ERr7qa0cwx0lJE0tLF0l9QcQTbtveyXa1gB+j6LnmIESSxSq3SGyyOR2tHy1EIilgKjUUAAkmp0GAoJQMDVYEUABIAQQAcgJRAB9AAKVNEwiOlQ41XOdUu+iit0MhjMtgsnQFjgGvkQTQBQV6YXMhncj0c4MhyRWaXWmS2uSRahRaIx2Nx+MJZzUJMKFOpdMZlOZ4jMx3k7LNF0QhiBpn6Hh+7kMTU+EoQ70s1EkHmBjiM+ksTWV8QhizVqTWGU22W2u316MUmJxeIJRPUJLwhQASnxhMJafxaVjKTxRAIy+SeFi+JS8LSAEJ8Hj8ACyrJOLpqboQujMJn01Bad2e7m6Fi8QcsYuoCpMTXGTl9thVSeWKdhWozOuRqJzeeNhbNJdE5LLlp7AE1aZTyQPyk6QKcx1y9DMJomlnBxHDjacWhcCZLC+YN3GoSwekkN4106awpgPJIjxhTV0wRLNL0NfMTSLc0uDwPgyx4V9aSo5BRDLYdnSUV0AInMJjHuCYxSaJDgiQww4MaZ5Z3MZxXHcFwFUsLCoXVVM4W1RELwNXMjQLU1iQo5lREKGjySrWkSgELtkFbckyh4Zjf1HTlQEuRobDDGwjG3cwzCmcUhhcEEgj6R4XGsF5DDk5NcLTeFM11bNiJvLT1DwdBKDAVAAFsLStGkGSZFkKhHVj-wc-wFWoRoRRE-QAUMFw4N6UNrE8qwWgmHkarCnCNUi5TCLU69NLIpKUvS+9H2fbs3w-L8bL-ez6gQBwTFMKMozXUIPSqoSgy3JbBOA-R-iicZQoTVVOsU08CJioj1JI28aiG1KMooqiaImuiywYpj8pYjlamKhBYyW7pmmeMIWhMZw4J2xDkMkKYtzCeGOuhLqlLPFS9Ru-rSLNR6Rp0sR9NpcyeEs0RrJ+2zCrmxz4eMH4mheYCXmeWqgwwyRqCCtdGtsD0ejBU7D1Ri78Oi1SrygABVNQ0tQNRUBgCB8eey0qWy217Sp2b-vmzpHGoEE7n5qMQ1goNGnMI2mYO6YpJklGFJPcXzyxvqZblhWlcgVXRqfUlaKm782RpvXLhko2nPpxwkMFQMhk44wHHCaN-T4kwnePPCord2L1Nl+XFeVv2Xuo2j6MYma7PDxA3FGPjt1trcmYmYSLGT6rIkMNyM6ziL0auyXDUL72S+Sp77yJmjSfJymf118cnOsMNIZMDC1wcBUtsT54QKlF4tysRH1-7tHqGwDUagv9TiEJvSDKMkyzIsqzq7D8cMKCbpIOcRqgpQnBAUG43BAm6Hbe4LghYLGwqLE8l81jXyUJiO+ZRp4k1fhTd+f1xy6D-rDDwrVRS2G8noA6MpBRAjXNuAB8YYHyWzhkBBZBr6oEIIQe+xNZ5vx1jXcc25uYBACL5VwUppgJz0K8bm1gapRgBFOeucQExqHIBAOAmgzpwPWKHHB7EDDTlAk4CCIIap2Dgng0qQVZEfGnAEV40DEywOdjnbUOi2IAzwS0Qx4FnAmOgiuIYAlEIhGXLxHunQz5i1ztQNgHBIBuKKvNSIRhubTFavYSIHw4IxlDN0f+bwarhkaNYSJLtom7ASbTPQzhQwtCMb4qCMFoY9GkeBKc0xXABBKcLJxjDB4Sz1AACwNJU2uE4lpPHlL5HofRmqOGhkzI2dxtwHQcHYbcpSXEY16lLO6CVzSjKXlzIw9gpRVTuCCdmPlgE2G3FOCwionCbO6ts66Hs9mDQniNQ57F-SG3kSEIK3EXD2DqlORCnk2gRBsSEZ5-S87Y09kXH2KsvkZR+QDGqS0oFM39HYFOUxhJPC5j-dZx93LdPoeFc+zD3HU10R48Cu1wwvDaoCGwATAIyKWbIwUrwQawp6QwgeF9cJINvmADF81dC2EQrGEFTgeRFLaHBN4phtz+k2h6DCvk4WiqvuoagbDCBSu5NymMwV3BOCsDGTlwYubAQsAGcM2qoH6CUTEIAA */
  createMachine<DatasetsSelectorContext, DatasetsSelectorEvent, DatasetsSelectorTypestate>(
    {
      context: { ...DEFAULT_CONTEXT, ...initialContext },
      preserveActionOrder: true,
      predictableActionArguments: true,
      id: 'DatasetsSelector',
      type: 'parallel',
      states: {
        popover: {
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
                CLOSE: 'closed',
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
                    SELECT_ALL_LOGS_DATASET: '#closed',
                  },
                },
                listingIntegrationStreams: {
                  entry: ['storePanelId', 'retrieveSearchFromCache', 'maybeRestoreSearchResult'],
                  on: {
                    CHANGE_PANEL: 'listingIntegrations',
                    SEARCH_BY_NAME: {
                      actions: ['storeSearch', 'searchIntegrationsStreams'],
                    },
                    SORT_BY_ORDER: {
                      actions: ['storeSearch', 'sortIntegrationsStreams'],
                    },
                    SELECT_DATASET: '#closed',
                  },
                },
                listingUnmanagedStreams: {
                  entry: ['storePanelId', 'retrieveSearchFromCache', 'maybeRestoreSearchResult'],
                  on: {
                    CHANGE_PANEL: 'listingIntegrations',
                    SEARCH_BY_NAME: {
                      actions: ['storeSearch', 'searchUnmanagedStreams'],
                    },
                    SORT_BY_ORDER: {
                      actions: ['storeSearch', 'sortUnmanagedStreams'],
                    },
                    SELECT_DATASET: '#closed',
                  },
                },
              },
            },
          },
        },
        selection: {
          initial: 'single',
          states: {
            single: {
              on: {
                SELECT_ALL_LOGS_DATASET: {
                  actions: ['storeAllSelection', 'notifySelectionChanged'],
                  target: 'all',
                },
                SELECT_DATASET: {
                  actions: ['storeSingleSelection', 'notifySelectionChanged'],
                },
              },
            },
            all: {
              on: {
                SELECT_DATASET: {
                  actions: ['storeSingleSelection', 'notifySelectionChanged'],
                  target: 'single',
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
        storeAllSelection: assign((_context) => ({
          selection: AllDatasetSelection.create(),
        })),
        storeSingleSelection: assign((_context, event) =>
          'dataset' in event ? { selection: SingleDatasetSelection.create(event.dataset) } : {}
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
  onSelectionChange,
  onUnmanagedStreamsReload,
}: DatasetsSelectorStateMachineDependencies) =>
  createPureDatasetsSelectorStateMachine(initialContext).withConfig({
    actions: {
      notifySelectionChanged: (context) => {
        return onSelectionChange(context.selection);
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
