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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOggyx1gGIAqgAVkAQQAqAUQD64gJIBZGQCVRAOQDikgNoAGALqJQAB2qwyJOkZAAPRAE4A7ABoQ5RACYAjLoAs7AFYPAA4PR2CAgN1HewBmXwBfBNc0TGw8QlIKGnomFjZObnT+ZUkAMVKAZQAJaTFxUT1DJBBTc3RLWms7BCdXdwQPXQD-R10wxwA2X2jfey8klKKcAmIyKjpGZlYOLjTeQREJGTk1KQ1VeQB5NUqm6zaLKxaevrdEL0dfR3Zg+xHdMFJhFdMDgosQKkeBk1tlNnkdoV9uh+MJ6jI1KIlJUhKJKJI7gYHmYnl0Xg4XO8EF5gr5YuxProfLEvJNYvZJqyIVD0qsshtctsCntoaijlJpLgBJJlABNe4tR4dZ6gHqTDz0rwBP6g0LTLUefofbX0jxOL5gnwBSbc5Yw-k5Lb5XZ22DsABmOAAxgALEi0KB8CB0MDsf0AN2oAGtQzyVpl1o6EcLXR7vX6AwgI9QvRhOk0FSYScqyarEAF7PZ2LE-h5JpMgqzHI5DVSvPYgdXZlEZvFAbbkXzE-ChS7kW7Pehff7A2wmBxjEQMO7qAwALbsOP24eC51I0VpqcZqBZ2iR3MlgtExXFzrdcuV6u1+uNybN1sDbzDBn-AKORt0t4sQDtCQ5wruiIisU7BENQqAQJAhzorIogAEIADIyJQyhyFIOGNNeRbtHe5IIH8ATsICHjalM9bhLEkxGoMTJVqCvi+ECXzBBE3wgbyCbgU6kGprB8GIeIVwaBomHSKceLyAAajI9SiJUkjiISzREaS95kc2DK+NMsQeHWQI9kxNJOAy-66ICsQsvYgF8fGsICkJKbjjBcEIRAfASVJMllAI6HoXUEiqep0iYtihatLeKq2IgQLBOwYzWtqXjePW1EWcETLsPYtkmeMMzNokySQnaYFucmuxgFADBiRAyA5mKyHyEo0iqJoOiEXFxEJT0LZMRqMTVr4QweHMZq6JW5VLIOAk1aOnD1Y1PktV6JTlFUtQqbFSokWWCDDVSGpmoErJBGEEQxI4znboJtWrQ1TWbRO6YzkGIZhme0axlVS1JitCGvRtrWHtOmbZhe+YGAd8WlolCAjBR0zan4JlhBWI0zF41aVsZ7H2QxXwPdVwN7qD62QO9kPHnwc6ruwi7LquG5bhTI5U2tb0Q5OUMnjDeZ0FeWn9TppGo+w6N5RNJn-vYI2xLNDLUdxc3BO2bLk0D3OIu6RDkNQ+DoHwamYZQ4hRZIADqYUNGp4gIwNSNDR+iDsv4oQsvEYS6MZWu665lMG0bJtm5Q6FXGp0hlOhspXAIzt9Ydg2IKdn50jLfg0ir8yTfYwcOvrBSG8bpu-RYawAF5fcGtChrAmDoADi0h6XHDlxHVcdLXM4u5Lx2OZqRUB3+oRml4Fk0vjPF0uyLbxFMxc7u5Xfh5X-rV6QdcBvulSMGAqBrsgOCoCQRAfUe9c-dmMaboDHcQWXm-oL3JD9-vIqHwwx+n+fS+19BannPCLWgYtiSu10r4dsT57Bmi+IZWabILKzR+FqXwQQA6shKvdCqnM9Yvw3hXd+28+67xnAfI+J8z6YCAfTL6TMFxLnQCudcj924l2IR6N+H8v5QGoX-WhgCr6MOhn9WGot4ap0RjAuBNYEFOHYpMFBsQ0F+F+FrQEJodGxHwQtUCRD168NIfwyh+9-St1eiWNAsAfQACM4IMAgMAhmDdQz3zbkY5+Jju5b1oDvEge9BFWN5rYrAjjnGuPEULSR4DIE3mgaRdiFEhj52CF8WaZkAgWXZPjEqLINT-G4oZVeT0Vr+LIYEihwSqFhJsZ0OxUTUAuLcUwhg84WasPYRzJ+3C-F8PIZ-CxoT6DhKaZEpxrSYkC2PKAnMCSZHizTm7RAqT2DpOyVkjsDZcltjNClGymSYg+EcF4eI5Tlp7iqV5JqfAo4xxkPHROydB4ll0ggpiS9KJOAQRqTkcwyYEP6WvZ6tzRI+SQscWStw5AaGqBpWQigVDqC0O8o6yNMqaJutaEEnIvCZTQaEVK3xbLtjpNEYYVzQ6vzMV6WC2BfJXCEJINQccE5JxTisuRpEGJVkUSrJkxkWRErOgEfGwITQ1n0eMWywEIS0GoAheALRCG+NqlAoeyMAC0WCmLAgKiaaaIwaQhHBCCrhYKQaui1R8lJSs2z1l0IEFscxPgvm1EXS1PiBnPSgrwWJdrMU9Hshg7i4RgQNn+BxfZn5AQpX+CrOsXx5grx9fxDVNrPKQsgMG9OvQGwFXGGm9GPhCUjUJQK9kYQOIzBKjSzuL0abNVavmtZgxfAjRMnPEtjhk0ciBI2nh1M+ZbSDUk7VPQzQUT+A5GsWo8qckpJ+Yy+NjKIIXpMeYNoM0uT9SDXm4Nx25ogO23SWt8YxC1uaoYhlYhxs8GG1KzqOw1g1L2YdgzSHnr5RZa0myb31k+HWJRX7wVDJqSMupAZf3HQlUxYIKtNkPtA6o2adJvWGMzQem5kGgkhKEf-OhF8r5weRpWJiabAgZWBAXeI+jwOVPw7UwjP8aEAPoWIuZM5yM9C8N8NBnxKLhAuYVTBWsDGVStRUvDZjhkCKIyIrjboPF8cQNul15zATNkiFg2kj7qQBw8DLQqgIdH9u8B4Jjcme4KdGb9axjUIn2OmW09TvRHUDEyoS9gE0YgjDylWyINmw7yag4phpznJmueie02Dk77XHQEyuj4LIXWORiOlpNsDd3Yf3da2zASCP1PGY0ugzS3MxLU4lkNGcANzCBN8QL-5OR5LrDRjsLY4jnMvaFulPdT0ecJRxAqYn1RVvmFqGeSHKJZQ5BNbWCr8uPWuWFnuDKzB5tqwWusJnMqk3ZDxBBqXBj1j8xyKYAQWS6Z8LupIQA */
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
