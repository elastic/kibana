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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgZTABswBjdAewCcA6Ew87CAYgBUB5AcQ4BkBRAbQAMAXUSgADgwCW6KeQB2YkAA9EARgBMggMzUAbAHYAnHoAcBgKwAaEAE9EptdQsBfFzbSZsuAsTJVqcnEweSYAYW42PAERJUlYGTlFJBV1LV1DE3NrO0RtQSdXdxBPLBx8IlIKGiCQ1k4eGNEU+MSFJVUETR19YzNLG3sEDQs1Nw8MMp9K-xrg+WpsP2rqQilYWXkoAEl5dDAoSgwk2HCACQBBADkOXgB9AAVr3m4hZolpWXaUzoAWAycpm0FiM2gGuQQem0pmceg0v1M-1+mjUgiM4xKk28FWWAVqCyWVQCaw2Ui2u32h2OClOYUuN3uTyuL34aneIFaX2SoD+AOoQJBYJyQ1R-35Bl+RkREpRY2KpWxviJcxCixmKxJmx2ewORy5pzwYQASmxuNw7uw7tsrixeBwjRcWNs2Fc8HcAEJsFjsACybzinySHXUagMgwcFl+1FDalMIJlGlR6PlWPKStmgXmatxNE1ZO1lL1JyY0QuRrpHoAmncrhcfU0AwkucGuoj9EY1L9BHDhYgDPlqAY9BY9GiE0mMQq0+q8VnCRm8+SdVT9SW2EaWFW7uvkLwjf6WoHvjz1EYNPztOlNL3IYIDNRgaD48jE2jJ6npjnM6r5xr1lqKV1al5DwdBKDAVAAFtaXpW5HmeV5YkPJsgx+RA9GHaMjAsbRr3DBAjCMe8wUlaUXwnFMvGnL98WzZVVn-fNAJXJJQPAqCDV4MsK3data3rA8PhQ49UgQUxTEEagNGHHt8PMc8sn7JEUTfSiphxejaN-YlGKXQtgLYiDoLXDctx3PdBI5I9uVE8SYUEHQjG7EZ8IlIxYXhMiVOTCYqM-TS5xnXNdKgABVeRINQeRUBgCBDI485rjgpkWSQoS2hszoMIsLCcLwiELHE6hnIRZTXx8zE-I0jMtKChjSS2cLIui2L4uM0tyzOLd+IbZCMpbcTJIKEcXIhX4oX0EbtDKpNfnfKr0xWWqv0XMKIqimLIDag1103XjtyNXd9zSqzhMyhxzH5K9RqGabJJGeb1MW2dVUg8gIDARZ82IEsXl4MJNwuM07kiDg7mQR0LmiFhLM5VCTwQf5dGG2SIU7PR3KUx9xzlXynrq2i3o+r6th+6I+AB8HIeh2HrJbDQgWcfC1GBPRB0TbRoScgxzAMAxHsVAmsyJz7UEIQhfopzcIZYKHeBhk64ZErLCOjPQu1RkVcPckipRmuVinkd64CUKd-NmRt+rQhAAFoNDDCEbb0AXqPougGEgS3m2tln7eoIiZJuxARjmtTBZo+Yvfh0TE2ZzCHrD12aqzAALf8o+VxAz2Z2MYXMUj9Zd82lsCnMM-OyEjHwkZz0sIvqpLn86tW5iixpcuWxZtmRpvbCcrhAvx1UvHw4CpuVpC1uDLAoz4D672Eelf3+hvVECgfNyvPK+vnpVAlm5CpqNtameOI762l8Um8QXPEqt4okek8bhYRfPhGNGBJm0Y-wFN8LxPi4vRfsbEmUBiBv1EpedyFgP6-CFMzUYt8JIAm0NzXm-MAENyAdQEW1AxaEAgZ0UwoJehXwQZ2ZwyCWZoL5hgtwQA */
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
          type: 'parallel',
          on: {
            CLOSE: 'closed',
            TOGGLE: 'closed',
          },
          states: {
            hist: {
              type: 'history',
              history: 'deep',
            },
            selector: {
              initial: 'listingIntegrations',
              states: {
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
            mode: {
              initial: 'single',
              states: {
                single: {
                  on: {
                    SELECT_ALL_LOG_DATASET: {
                      cond: 'isListingIntegrations',
                      actions: ['storeSelection', 'notifySelectionChanged', 'closeSelector'],
                      target: 'all',
                    },
                    SELECT_DATASET: {
                      actions: ['storeSelection', 'notifySelectionChanged', 'closeSelector'],
                    },
                  },
                },
                all: {
                  on: {
                    SELECT_DATASET: {
                      actions: ['storeSelection', 'notifySelectionChanged', 'closeSelector'],
                      target: 'single',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    {
      actions: {
        closeSelector: raise('CLOSE'),
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
        storeSelection: assign((_context, event) =>
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
        isListingIntegrations: (_context, _event, { state }) => {
          return state.matches('open.selector.listingIntegrations');
        },
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
      notifySelectionChanged: (_context, event) => {
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
