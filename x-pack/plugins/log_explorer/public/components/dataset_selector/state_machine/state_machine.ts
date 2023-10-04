/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actions, assign, createMachine, raise } from 'xstate';
import { AllDatasetSelection, SingleDatasetSelection } from '../../../../common/dataset_selection';
import { DATA_VIEWS_TAB_ID, INTEGRATIONS_TAB_ID, UNCATEGORIZED_TAB_ID } from '../constants';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVsztgZTABswBjdAewCcA6AB3PoDcwaTDzsIBiAFQHkA4gIAyAUQDaABgC6iUPVgBLdIvIA7OSACeiACwAmXdQDMANmMB2UwYAcu4wEYH+gDQgAHogdmjphxcldSQcAVkdJENMAXyi3NExsXAJiMio6BnJmGgYwNS4AYWE+PAkZTQVlVQ0kD0QbCwtqSX1TSXMATgdJSXaLELcdBD8HJskzMZtmm31vGLiMLBx8IlIKGnomFmocvP4hMSlZGoqVdU1PBBsbEcdDc11df3aZgcQQ3RDqUwt9bs6HXTtXT1OYgeKLJIrVLrDJZba0XJcEpifI8AD6AEFhMI0UUBHg0cgMTwMSUeIdyhxKmcahcbN9qBYHJNjO1jG0+u1TK8htMTH1jOzWSF6fpQeDEssUmt0ptsgi1NRFGp0GAoJQMFVYDxUAAjJEAdQAkjx8gAJNH8NEAVQAcvliaIBHwAEpGgBaomQloxACEKccqadqqALgBaBymT6GIJBUI-aySCw8pzsxmmfQtfQWdrdexi2JghaS5KrNIbTJbHZKlVqjXB7V6w0m82WviE4kYtEANSNogNBJJ-rKgaUwfOiBm+moBkTbKcYXa7xT3kk6czxgeP1CIvFxaWpehssr8tyNdV6s16kbuuohEUsBUaigRtrl4bBTNGNtAlEaIACt+ojCAG8hBlUE4IF07TUFm7w2GYpjtJMpg2DyfQjEurKAtmrQzDYe4JAeUIyhWcLVsqF71lqOq3vej7Ki+b7UdeSL5C6fDYm2aJGraPBOi6xJGnwtoEr6fA8PwACyoEgCcEG0ogYaZp8IQWJuji6OYITMu0PJqdOSEOGyalmMYMzRIWErEdK5awlWCrnnWV5qDed4Pk+TFUS5sBIqIGIuq2voAJporaGJSaURxgWOCmhkp9ifG0+EfN0lgfLoPLWDB+iRDYYQWPSDQOIREJSmWMJyvCZ6Uc5Da0e5DHPq+3kfngrroiFaKusgogurJ8k0vFCBhhp1AhHcPw5jMoSZdodQhKpzRJlyfi9JYpUliRdlVRRzE+Q19GeS1dVVHg6CUGAqAALa+ea36-gBQEgSOMXUiGtRQT0sEZvBiHIW0-TzQgAQjG0-iLZYvyWJZ8xEZCtmVSe1WKrV740XqjXHftwbnZdN2+SUAVBaF4WRQN4FDZ9Ok2F8IQTLoCYNBN+khDloSbkhlhAqym02RVx7kY5aMsa5h0eYxJ3o+oeNXbdSIdWiXU9X1FOxVTFz6JYTQ2O0zydHrqEGKz05Ak4U7GFc1gFnDZWHqR9mnqjOMY3REvNS7MsXXLhPAaIqIdiSZJq+9kFsyM1yG-YQo9HNgzqbT9jfM09NOBmsNFvD5VHmRDlngArmoJAYGqVCKAAXpAtHNqaFpWrx-ECIJPDCaJPrDtFcmUx94b6HrsHMpbApXJ0Vgpm0xhfM0ZiTODGYlVZ+4IwLudO9QhfFxeZeVxA1d4MatfcUSJI9n2A7tyH46KQghhfOnhgTMZkTqSmfefHr0wGGyvSMwRi9Z-bHayNqwbxLlAbeVcmxE0ChaLqZMoqUnVj3BKkwviTDCKYDM2ZARA0GN4W+-gAhAjaPYLkFg+bLxzo7FG68i5gIgbvKBitlYul6v1V6XckGQTDIzQyVgMxTXZEuCIK4zDjVaDmdkHMozGAodnB2u1HKgK3pQCukD9TIn9uiY+pJRDkg4YNZBI0YzUHwalFokQWgpiTl8B4AJMzMj7roORgCkZCzPBABY3ZFBgAAO43hrq2eufEBJCREoOP0l84qfTMKbJ+vQ2YdBZOPNS41fgISCO8ZwC9bZbURoLPOipPGYG8X4gJ+8Wx13bHaB0jdXQei9BfAx3dIIAhMK0D4AQAg6UWpINCwNnAfBnKhYeBhIwtBcdtNxhTqDFNQKU-xe9-IwKVqTCKCDRyh2vn4NczxgTZO6ItPoKZzIwUts0ZwARpgTRtpnO2UyClrzmQs8pzDQoq3YZ3QxkEdkmC0qhPWQJOSuAGd4EYjxMF906GzH47RJn5NXjQ55PjFlQL9gHHRp9+xRI1ogUeA9kJhDZvlQIccvCGGnPYaYdh3jsmmPCgW2BpRVGoEoZ8xA-IonRFiHEeICQ6ODs0rh18IxsiaOyfQCE9YWCpW0FMDRGh9AiECLCgRrAMqPEy1YLK2VQA5ZojFnZBVfJaSKiaMFrioS6H3QUuYQV4KQmuAEzgWiJSlTku5eTGUkRZagQghBOVaMDro-RJrhXDQjFGO+E9rAITaFyFM1hGi60TJbLSs9yH-3ufkuAABHQgwhlQAGtqC5D1MQbg4VewCEdEfI0eB8h8G7KrIVWzhps1NkmLousuhaUBIm1BXItJazaLrFNMRCxqHIBAOAmhrKULWIgttn0wwCKaPPGlaUZW4MQDKpoHaZqSrsKmDVCiTxLqvhGtSMFkrMlSmMbdiaRg6XUrhRanTnFZq9VQqqbAOCQAvdEi4adJ7ZiTI8EygoXjAwMEYMyVhbD2HNqeoB7iPrfLNY4ddKV6YPo+DyQwtMEn2EeNMJMiEUPTLXgACw8oB3FQxCrUGQrlfw-hzK8J5IKUwM5BTvCTH0gFcKv38x-cA4WnsxZ6no0YnhCFsN3tw+lZcMHmRpMQpuD4YQtaUceTQkWB1Ma0cfDJyCDRTE6UyYDPwm49LA2eJPVoXRLBSKTFYXTiK9qtVdljSWkn4CbMvSu34PHgh9LNqhEUE0d2MaMACemhVWTIUZh6+d8jUMzIM-VTGR0-Pea9vjW6pnr592nGMGFhHysiiylcZjZgrBqVaPTXmImF0ZbXso0uqid60WKxGyVPHrish8LlKwesYvZNppKw2wp+PqQ89Q6syKym9cC0BxA5kRh+EBMyfKwJkqv1CMxgES5Jj0iCLI1r6WaBarINEjDV7zOWuuM0NkrJmgpkiGuKlfdX3BDsBnNLrjWU+vUKyxixA+srts00D439HBIWzJGFMKEvjQyZM5mVfddO3eDNQP1hAofAaO5YeogJsLblCCjtp6PnCW0Ws13TeaC3FqJxtwUU8hTf3scZYwn2xX0yjJGd4Wt1KftyaJmUzPC1qBLWW3UFa2cIEtltsYYxudjLZAO3Z1gMzsgBeOidQA */
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
              initial: 'integrationsTab',
              on: {
                CLOSE: 'closed',
                TOGGLE: 'closed',
                SELECT_ALL_LOGS_DATASET: 'closed',
                NAVIGATE_TO_DISCOVER_ESQL: 'closed',
              },
              states: {
                hist: {
                  type: 'history',
                  history: 'deep',
                },
                integrationsTab: {
                  initial: 'listingIntegrations',
                  entry: ['storeIntegrationsTabId'],
                  on: {
                    SWITCH_TO_UNCATEGORIZED_TAB: 'uncategorizedTab',
                    SWITCH_TO_DATA_VIEWS_TAB: 'dataViewsTab',
                  },
                  states: {
                    hist: {
                      type: 'history',
                    },
                    listingIntegrations: {
                      entry: [
                        'storePanelId',
                        'retrieveSearchFromCache',
                        'maybeRestoreSearchResult',
                      ],
                      on: {
                        CHANGE_PANEL: 'listingIntegrationStreams',
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
                      entry: [
                        'storePanelId',
                        'retrieveSearchFromCache',
                        'maybeRestoreSearchResult',
                      ],
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
                  },
                },
                uncategorizedTab: {
                  entry: [
                    'storeUncategorizedTabId',
                    'retrieveSearchFromCache',
                    'maybeRestoreSearchResult',
                  ],
                  on: {
                    SWITCH_TO_INTEGRATIONS_TAB: 'integrationsTab.hist',
                    SWITCH_TO_DATA_VIEWS_TAB: 'dataViewsTab',
                    SEARCH_BY_NAME: {
                      actions: ['storeSearch', 'searchUncategorized'],
                    },
                    SORT_BY_ORDER: {
                      actions: ['storeSearch', 'sortUncategorized'],
                    },
                    SELECT_DATASET: '#closed',
                  },
                },
                dataViewsTab: {
                  entry: [
                    'storeDataViewsTabId',
                    'retrieveSearchFromCache',
                    'maybeRestoreSearchResult',
                  ],
                  on: {
                    SWITCH_TO_INTEGRATIONS_TAB: 'integrationsTab.hist',
                    SWITCH_TO_UNCATEGORIZED_TAB: 'uncategorizedTab',
                    SEARCH_BY_NAME: {
                      actions: ['storeSearch', 'searchDataViews'],
                    },
                    SORT_BY_ORDER: {
                      actions: ['storeSearch', 'sortDataViews'],
                    },
                    SELECT_DATA_VIEW: {
                      target: '#closed',
                      actions: ['selectDataView'],
                    },
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
        storeIntegrationsTabId: assign((_context) => ({ tabId: INTEGRATIONS_TAB_ID })),
        storeUncategorizedTabId: assign((_context) => ({ tabId: UNCATEGORIZED_TAB_ID })),
        storeDataViewsTabId: assign((_context) => ({ tabId: DATA_VIEWS_TAB_ID })),
        storePanelId: assign((_context, event) =>
          'panelId' in event ? { panelId: event.panelId } : {}
        ),
        storeSearch: assign((context, event) => {
          if ('search' in event) {
            const id = context.tabId === INTEGRATIONS_TAB_ID ? context.panelId : context.tabId;
            context.searchCache.set(id, event.search);

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
        retrieveSearchFromCache: assign((context, event) => {
          if (event.type === 'CHANGE_PANEL' && 'panelId' in event) {
            return { search: context.searchCache.get(event.panelId) ?? defaultSearch };
          }
          if (event.type === 'SWITCH_TO_INTEGRATIONS_TAB' && 'panelId' in context) {
            return { search: context.searchCache.get(context.panelId) ?? defaultSearch };
          }
          if (event.type === 'SWITCH_TO_UNCATEGORIZED_TAB' && 'tabId' in context) {
            return { search: context.searchCache.get(context.tabId) ?? defaultSearch };
          }
          if (event.type === 'SWITCH_TO_DATA_VIEWS_TAB' && 'tabId' in context) {
            return { search: context.searchCache.get(context.tabId) ?? defaultSearch };
          }
          return {};
        }),
        maybeRestoreSearchResult: actions.pure((context, event) => {
          const hasSearchOnChangePanel =
            event.type === 'CHANGE_PANEL' && context.searchCache.has(event.panelId);
          const hasSearchOnIntegrationsTab =
            event.type === 'SWITCH_TO_INTEGRATIONS_TAB' && context.searchCache.has(context.panelId);
          const hasSearchOnUncategorizedTab =
            event.type === 'SWITCH_TO_UNCATEGORIZED_TAB' && context.searchCache.has(context.tabId);
          const hasSearchOnDataViewsTab =
            event.type === 'SWITCH_TO_DATA_VIEWS_TAB' && context.searchCache.has(context.tabId);

          if (
            hasSearchOnChangePanel ||
            hasSearchOnIntegrationsTab ||
            hasSearchOnUncategorizedTab ||
            hasSearchOnDataViewsTab
          ) {
            return raise({ type: 'SORT_BY_ORDER', search: context.search });
          }
        }),
      },
    }
  );

export const createDatasetsSelectorStateMachine = ({
  initialContext,
  onDataViewSelection,
  onDataViewsSearch,
  onDataViewsSort,
  onIntegrationsLoadMore,
  onIntegrationsReload,
  onIntegrationsSearch,
  onIntegrationsSort,
  onIntegrationsStreamsSearch,
  onIntegrationsStreamsSort,
  onUncategorizedSearch,
  onUncategorizedSort,
  onSelectionChange,
  onUncategorizedReload,
}: DatasetsSelectorStateMachineDependencies) =>
  createPureDatasetsSelectorStateMachine(initialContext).withConfig({
    actions: {
      notifySelectionChanged: (context) => {
        return onSelectionChange(context.selection);
      },
      loadMoreIntegrations: onIntegrationsLoadMore,
      relaodIntegrations: onIntegrationsReload,
      reloadUncategorized: onUncategorizedReload,
      selectDataView: (_context, event) => {
        if (event.type === 'SELECT_DATA_VIEW' && 'dataView' in event) {
          return onDataViewSelection(event.dataView);
        }
      },
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
      searchDataViews: (context, event) => {
        if ('search' in event) {
          onDataViewsSearch(event.search);
        }
      },
      sortDataViews: (context, event) => {
        if ('search' in event) {
          onDataViewsSort(event.search);
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
      searchUncategorized: (_context, event) => {
        if ('search' in event) {
          onUncategorizedSearch(event.search);
        }
      },
      sortUncategorized: (_context, event) => {
        if ('search' in event) {
          onUncategorizedSort(event.search);
        }
      },
    },
  });
