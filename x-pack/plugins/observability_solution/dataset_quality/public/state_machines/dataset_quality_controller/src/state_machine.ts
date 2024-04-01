/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { getDateISORange } from '@kbn/timerange';
import { assign, createMachine, DoneInvokeEvent, InterpreterFrom } from 'xstate';
import { IDataStreamDetailsClient } from '../../../services/data_stream_details';
import {
  DashboardType,
  DataStreamDetails,
  DataStreamStatServiceResponse,
  GetDataStreamsStatsQuery,
} from '../../../../common/data_streams_stats';
import { DegradedDocsStat } from '../../../../common/data_streams_stats/malformed_docs_stat';
import { DataStreamType } from '../../../../common/types';
import { dataStreamPartsToIndexName } from '../../../../common/utils';
import { IDataStreamsStatsClient } from '../../../services/data_streams_stats';
import { mergeDegradedStatsIntoDataStreams } from '../../../utils';
import { DEFAULT_CONTEXT } from './defaults';
import {
  fetchDatasetDetailsFailedNotifier,
  fetchDatasetStatsFailedNotifier,
  fetchDegradedStatsFailedNotifier,
  fetchIntegrationDashboardsFailedNotifier,
  noDatasetSelected,
} from './notifications';
import {
  DatasetQualityControllerContext,
  DatasetQualityControllerEvent,
  DatasetQualityControllerTypeState,
  FlyoutDataset,
} from './types';

export const createPureDatasetQualityControllerStateMachine = (
  initialContext: DatasetQualityControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOggyx1gGIAqgAVkAQQAqAUQD64gJIBZGQCVRAOQDikgNoAGALqJQAB2qwyJOkZAAPRAEZ7AJgBs7AOz2ArAGYfX+wAOHwBOABZAgBoQckQAWnt-dh8nJxD7MOd-f3sXAF886LRMbDxCUgoaeiYWNk5uUv5lSQAxZoBlAAlpMXFRPUMkEFNzdEtaazsEDJCvdhddXXdMl3dA3UDAr2jYhASklLSMrN8A-MKQYp4y4jIqOkZmVg4uEt5BEQkZOTUpDVV5AB5NTtAbWEYWKxDXZxVJOeZhLyBJzIsLuJa6HzRKZBbzsLZ+fyrOEhJwFIoNHAEW6VB41Z71N7ofjCXoyNSiJTtISiSiSUEGcFmSETaHxHy6ELsEIuQLLJw+dELLxo7GIJz2EJSsLpHKZUlarzky6Um4Ve7VJ51V7XFmfKTSXACSTKACaYKGELGUNAMNC7nYRxcXhcOsyYV0LjVCCcXmW7C8krjukyPjCYWNV1K1PNVUetReptg7AAZjgAMYACxItCgfAgdDA7BrADdqABrJtZqnlO55+nWoulivV2sIVvUcsYcYDD0mYXe0WgKZhFz2aWKlwhNbpXQBHaIdwo9g6lOOQKk9GBDMXbtmvt0q2FpnFsvoKs1utsJgcYxEDAltQDAALbsHeOYPpaBaMraw7vqOUDjrQbZTous6Cp6C7jJMiCyieZ5xv6TjpqSB4IEeczLGumqrOm6ZkrepoQbSUEMjajTsEQ1CoBAkAfGysiiAAQgAMjIlDKHIUiSf0GHzqM2FDFMXjpMk9hrMEmrBGEWIxA4ixzKSIbBpKaSuO4mZMb2LH5mxQ5cTxfHiICGgaGJ0g-Ly8gAGoyL0ojtJI4gCoM8kijhCBbgGW4pJKIShOsR5kesgSBj43iJiEmmYucFJMsxFq2YOL6cdxvEQHwzmue5LQCCJIk9BIAVBdIHJcnOwxYT6tjqhs8zuC4CrqSqKqRtsenTAZ0qxi4JkGq4uUmvl1mFQOLxgFADCORAyCTnaAnyEo0iqJoOhyZ1CndTi3g+B4sb2JKyyIuNMLpnMQYhmGGSRpZy00qtT6cBtW3lbt5ZNK0HTdP5HVeopy4OF4qTzA9ZwKoEW5LGRcRvYG6TBqG4TfYt4Erf2gO8Zt21g6+I6fvWjbNshHZdlZ-3k9BlMg5ANNwR+Y4TqhM4GLDXVLj15FbB4ziSqE25otuZHOJ4+KpEj6KbiTbO5o+nPA9Te18whfDfkB7B-gBQGgaT7O62x+ug4bb784hgvTnQ6GhRd4VKbhbgZIqTiLMRF6aiESsou9gSahs7hxxKWt-TrrF1CWRDkNQ+DoHwgViZQ4itZIADqjV9IF4ii5d4tTCrqSyllGopi4irhxNoRzJ9W4RpkuQhL91wFRzDJpxnWd8JQImAoF0gtCJrqAgIFfnXDV2HuudcXsiD2ri3SsZMkWU+ME4TzZ4-fZmTdup+nmfoEbn737WVztIwYCoMByA4KgJBEPwDa0E2CcnYwLa0gkVDgI9b6PygNA5+r936f0wD-WASEULu1oJ7IUVcIrbnXJsOOwZPBygyGRNIlFERphUumPc8UjSMSTmAtapYb5Z2gbA7gL8GBvw-l-ZBJsGA-nNv+dAgEQIgIYTZJhkDWHOwQuwzAnDuGIO-r-VBk50GYMwtg320w0xhHmCiHusdnBBDIurQMRC-CSj3O4eK58ey2xThAlhd9ZEPzcbWOQ9B9aLjQLASsAAjbiDAIB-0ZkA1mEiAbQWka4umtZoFePQD48YfjAnBNCWooWHsRbLzFtYXYKl4SuEyMRLKAQkoS23lKQkSwg5rBTO4OheUB6Xyccw0ecT4LuPiVAJJKS6BpKCagEJ-BTa-mEaI62oDJGA1iWwjxfTvFU18VgdJIzMluzQrkr2K9q4OCCLdFKKR66Em8GRAauh5izWcM3cy6R7H3lmTElxpVtrj0ntPWe89F6Vx9gjBAsxUpInlmUlER53BKz6tHLwvgtQajjGEDUjzB5X2cZ0t55V+JfA8iCOQGhOjBVkIoFQ6gtB-MXBFLIAZMhI0VBjGWjg95zESOpZYGxVh7kCCitp4COlQPLFxbAFVARCEkGoGec8F5L12fknR4Z8Q0PCIqHwCxdCJFIUjdgMdjiuCcGsVYBQLi0GoLxeAQwbbJ3AVg-5EtYRSi2INWx24AgbHVdjNcUp4rLCPLNVw157A8scXy9ivAbWUp0UHfCtL3BERIrkbG-o8a5AousCMP16GtODUw0NzJoHhvhhLfVVyBpyk8I4FMm8yKDVuulI+aZ0opiRkGq1Ob7JlUgAW1eCAAhSnUjKTwCojySjIukAMEoVLxVmFuWYLbGEUwdjzPaXb9nTFSgHYdugQ7pC1NjXw8I1yIiRYiFEmw+6ZovtmhdVNHbg3zVo21K49zsExLMZwF5fBbDCBHI+8wQXOs1CqZuc7nn2xvUuu9DlyoroihEVKM0VQ6glIidVUYJqJFDNNdSaJJQPTTNyi9DjW1zJcTByNt0N4N23s3NYkKJoahPEZQae5ZQsfPS0y9xGXkYsWWRgFyoX3UKTA0tEL1EApFuoNVI6VvCnuvCB6Jw9XmLPkagRRCDeG-z4xLYMt0UzptmCJppZFMhXPCAEdSjhciqoGgpoe18eO9MScsraqz-HDNGdpqYunBMGbjGm4zE0imBlDM4HUWx1IMQ40R+d3GoFQc7Q+iNALHARHxCqEI6qBr4acKQtYCIp3RwJhjZpS0s1caUxiwVZhEthWSxLCUAZEP9pTTpfwStFQJmIkSDYuQLwpCNXkIAA */
  createMachine<
    DatasetQualityControllerContext,
    DatasetQualityControllerEvent,
    DatasetQualityControllerTypeState
  >(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'DatasetQualityController',
      type: 'parallel',
      states: {
        datasets: {
          initial: 'fetching',
          states: {
            fetching: {
              invoke: {
                src: 'loadDataStreamStats',
                onDone: {
                  target: 'loaded',
                  actions: ['storeDataStreamStats', 'storeDatasets'],
                },
                onError: {
                  target: 'loaded',
                  actions: ['notifyFetchDatasetStatsFailed'],
                },
              },
            },
            loaded: {
              on: {
                UPDATE_TABLE_CRITERIA: {
                  target: 'loaded',
                  actions: ['storeTableOptions'],
                },
                TOGGLE_INACTIVE_DATASETS: {
                  target: 'loaded',
                  actions: ['storeInactiveDatasetsVisibility', 'resetPage'],
                },
                TOGGLE_FULL_DATASET_NAMES: {
                  target: 'loaded',
                  actions: ['storeFullDatasetNamesVisibility'],
                },
              },
            },
          },
          on: {
            UPDATE_TIME_RANGE: {
              target: 'datasets.fetching',
              actions: ['storeTimeRange'],
            },
            REFRESH_DATA: {
              target: 'datasets.fetching',
            },
            UPDATE_INTEGRATIONS: {
              target: 'datasets.loaded',
              actions: ['storeIntegrations'],
            },
            UPDATE_NAMESPACES: {
              target: 'datasets.loaded',
              actions: ['storeNamespaces'],
            },
            UPDATE_QUERY: {
              actions: ['storeQuery'],
            },
          },
        },
        degradedDocs: {
          initial: 'fetching',
          states: {
            fetching: {
              invoke: {
                src: 'loadDegradedDocs',
                onDone: {
                  target: 'loaded',
                  actions: ['storeDegradedDocStats', 'storeDatasets'],
                },
                onError: {
                  target: 'loaded',
                  actions: ['notifyFetchDegradedStatsFailed'],
                },
              },
            },
            loaded: {},
          },
          on: {
            UPDATE_TIME_RANGE: {
              target: 'degradedDocs.fetching',
              actions: ['storeTimeRange'],
            },
            REFRESH_DATA: {
              target: 'degradedDocs.fetching',
            },
          },
        },
        flyout: {
          initial: 'closed',
          states: {
            initializing: {
              type: 'parallel',
              states: {
                dataStreamDetails: {
                  initial: 'fetching',
                  states: {
                    fetching: {
                      invoke: {
                        src: 'loadDataStreamDetails',
                        onDone: {
                          target: 'done',
                          actions: ['storeDatasetDetails'],
                        },
                        onError: {
                          target: 'done',
                          actions: ['fetchDatasetDetailsFailedNotifier'],
                        },
                      },
                    },
                    done: {
                      type: 'final',
                    },
                  },
                },
                integrationDashboards: {
                  initial: 'fetching',
                  states: {
                    fetching: {
                      invoke: {
                        src: 'loadIntegrationDashboards',
                        onDone: {
                          target: 'done',
                          actions: ['storeIntegrationDashboards'],
                        },
                        onError: {
                          target: 'done',
                          actions: ['notifyFetchIntegrationDashboardsFailed'],
                        },
                      },
                    },
                    done: {
                      type: 'final',
                    },
                  },
                },
              },
              onDone: {
                target: '#DatasetQualityController.flyout.loaded',
              },
            },
            loaded: {
              on: {
                CLOSE_FLYOUT: {
                  target: 'closed',
                  actions: ['resetFlyoutOptions'],
                },
                UPDATE_INSIGHTS_TIME_RANGE: {
                  actions: ['storeFlyoutOptions'],
                },
              },
            },
            closed: {
              on: {
                OPEN_FLYOUT: {
                  target: '#DatasetQualityController.flyout.initializing',
                  actions: ['storeFlyoutOptions'],
                },
              },
            },
          },
          on: {
            SELECT_NEW_DATASET: {
              target: '#DatasetQualityController.flyout.initializing',
              actions: ['storeFlyoutOptions'],
            },
            CLOSE_FLYOUT: {
              target: '#DatasetQualityController.flyout.closed',
              actions: ['resetFlyoutOptions'],
            },
          },
        },
      },
    },
    {
      actions: {
        storeTableOptions: assign((_context, event) => {
          return 'criteria' in event
            ? {
                table: event.criteria,
              }
            : {};
        }),
        resetPage: assign((context, _event) => ({
          table: {
            ...context.table,
            page: 0,
          },
        })),
        storeInactiveDatasetsVisibility: assign((context, _event) => {
          return {
            filters: {
              ...context.filters,
              inactive: !context.filters.inactive,
            },
          };
        }),
        storeFullDatasetNamesVisibility: assign((context, _event) => {
          return {
            filters: {
              ...context.filters,
              fullNames: !context.filters.fullNames,
            },
          };
        }),
        storeTimeRange: assign((context, event) => {
          return 'timeRange' in event
            ? {
                filters: {
                  ...context.filters,
                  timeRange: event.timeRange,
                },
              }
            : {};
        }),
        storeIntegrations: assign((context, event) => {
          return 'integrations' in event
            ? {
                filters: {
                  ...context.filters,
                  integrations: event.integrations,
                },
              }
            : {};
        }),
        storeNamespaces: assign((context, event) => {
          return 'namespaces' in event
            ? {
                filters: {
                  ...context.filters,
                  namespaces: event.namespaces,
                },
              }
            : {};
        }),
        storeQuery: assign((context, event) => {
          return 'query' in event
            ? {
                filters: {
                  ...context.filters,
                  query: event.query,
                },
              }
            : {};
        }),
        storeFlyoutOptions: assign((context, event) => {
          return 'dataset' in event
            ? {
                flyout: {
                  ...context.flyout,
                  dataset: event.dataset as FlyoutDataset,
                },
              }
            : 'timeRange' in event
            ? {
                flyout: {
                  ...context.flyout,
                  insightsTimeRange: event.timeRange,
                },
              }
            : {};
        }),
        resetFlyoutOptions: assign((_context, _event) => ({ flyout: undefined })),
        storeDataStreamStats: assign((_context, event) => {
          return 'data' in event
            ? {
                dataStreamStats: (event.data as DataStreamStatServiceResponse).dataStreamStats,
                integrations: (event.data as DataStreamStatServiceResponse).integrations,
              }
            : {};
        }),
        storeDegradedDocStats: assign((_context, event) => {
          return 'data' in event
            ? {
                degradedDocStats: event.data as DegradedDocsStat[],
              }
            : {};
        }),
        storeDatasetDetails: assign((context, event) => {
          return 'data' in event
            ? {
                flyout: {
                  ...context.flyout,
                  datasetDetails: event.data as DataStreamDetails,
                },
              }
            : {};
        }),
        storeIntegrationDashboards: assign((context, event) => {
          return 'data' in event && 'dashboards' in event.data
            ? {
                flyout: {
                  ...context.flyout,
                  dataset: {
                    ...context.flyout.dataset,
                    integration: {
                      ...context.flyout.dataset?.integration,
                      dashboards: event.data.dashboards as DashboardType[],
                    },
                  } as FlyoutDataset,
                },
              }
            : {};
        }),
        storeDatasets: assign((context, _event) => {
          return context.dataStreamStats && context.degradedDocStats
            ? {
                datasets: mergeDegradedStatsIntoDataStreams(
                  context.dataStreamStats,
                  context.degradedDocStats
                ),
              }
            : context.dataStreamStats
            ? { datasets: context.dataStreamStats }
            : { datasets: [] };
        }),
      },
    }
  );

export interface DatasetQualityControllerStateMachineDependencies {
  initialContext?: DatasetQualityControllerContext;
  toasts: IToasts;
  dataStreamStatsClient: IDataStreamsStatsClient;
  dataStreamDetailsClient: IDataStreamDetailsClient;
}

export const createDatasetQualityControllerStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  toasts,
  dataStreamStatsClient,
  dataStreamDetailsClient,
}: DatasetQualityControllerStateMachineDependencies) =>
  createPureDatasetQualityControllerStateMachine(initialContext).withConfig({
    actions: {
      notifyFetchDatasetStatsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDatasetStatsFailedNotifier(toasts, event.data),
      notifyFetchDegradedStatsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDegradedStatsFailedNotifier(toasts, event.data),
      notifyFetchDatasetDetailsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDatasetDetailsFailedNotifier(toasts, event.data),
      notifyFetchIntegrationDashboardsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchIntegrationDashboardsFailedNotifier(toasts, event.data),
    },
    services: {
      loadDataStreamStats: (context) =>
        dataStreamStatsClient.getDataStreamsStats({
          type: context.type as GetDataStreamsStatsQuery['type'],
          datasetQuery: context.filters.query,
        }),
      loadDegradedDocs: (context) => {
        const { startDate: start, endDate: end } = getDateISORange(context.filters.timeRange);

        return dataStreamStatsClient.getDataStreamsDegradedStats({
          type: context.type as GetDataStreamsStatsQuery['type'],
          datasetQuery: context.filters.query,
          start,
          end,
        });
      },
      loadDataStreamDetails: (context) => {
        if (!context.flyout.dataset) {
          fetchDatasetDetailsFailedNotifier(toasts, new Error(noDatasetSelected));

          return Promise.resolve({});
        }

        const { type, name: dataset, namespace } = context.flyout.dataset;

        return dataStreamDetailsClient.getDataStreamDetails({
          dataStream: dataStreamPartsToIndexName({
            type: type as DataStreamType,
            dataset,
            namespace,
          }),
        });
      },
      loadIntegrationDashboards: (context) => {
        if (!context.flyout.dataset) {
          fetchDatasetDetailsFailedNotifier(toasts, new Error(noDatasetSelected));

          return Promise.resolve({});
        }

        const { integration } = context.flyout.dataset;

        return integration
          ? dataStreamDetailsClient.getIntegrationDashboards({ integration: integration.name })
          : Promise.resolve({});
      },
    },
  });

export type DatasetQualityControllerStateService = InterpreterFrom<
  typeof createDatasetQualityControllerStateMachine
>;

export type DatasetQualityControllerStateMachine = ReturnType<
  typeof createDatasetQualityControllerStateMachine
>;
