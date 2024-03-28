/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { getDateISORange } from '@kbn/timerange';
import { assign, createMachine, DoneInvokeEvent, InterpreterFrom } from 'xstate';
import {
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOggyx1nYDMcAYwAWJWlADEEOmHbiAbtQDWctJmx5CpCjXpMWbTt019B6UeKgJF1IRhJ0A2gAYAuq7eJQAB2qwyR1pvEAAPRAAWADYARnYATgBmAHYo+OSADniYlwBWGIAaEHJEZIAmDPYI+JcImJissuSXDIiAXzai9R4tYjIqOkZmVg4uDV4BYTEJSTYmDh8iDH5qBgBbdm7NAj7dQYMR43H0MymrG1ole3Qgz08QvwCbuhDwhCjKiNqY3OTE9LKEWqZSKJQQ5Vy7GS0Xq8Si0KBETKHS6JhwOx0A30wyMYx6fCI1FQEEgkgAqgAFZAAQQAKgBRAD6tOpACEADJMygAJQAkgy+dT7kgQI9Ai8RW9ctl2IkYpkMnL4oqIolQYgcnkEmVclEorkXPEykb4SiQFt0dp+nohoZRmiTuxCcTSbSAPIAcQ9nMZvIActTKLTeQA1Jk0lkAZXptMjwt8-nFwUliDSyXYaUSZUNSWVLnK6oQGRa7DKctyBuVcpciSiZotvUxNoOuIdBKJJIgkndXp9ADEyez2YyI9To7TGQGALL0uPuB6J57J0BvbOVeFRMvy3IRHcufWFzWQo26-WG41lPX1h0Y637HGjMBQBguiDIOynCzTKQyWhyWyqJsN5Wns2J2pwT4vp275CJ+lgSBcVwOM47jxqKi5BK8pQZJCyQxNmubpBEyTpIeTRxBkZQ6k0NapHWnTmsBuxYrahwks+r4wXB36zAw8zsIsyyrBsDa3qBrG4pBnEfpMX7nLY1y3Kh84imKS5Ye8UTsDEqrlC4LiAlkMTxPEZE4aWGTGS0yQ2Yk+7XscYksS2HD8EQ5DUPg6CSNGnJBpO9IAOojnSY4xmhamYSm4JxFRHzKmUOTRCkpnFIg-yQrq0TxF8dQxGkDk9E5zYPgI7med5lDsm60aMn27IAJpumStIRRhEorqUsWXlklFJVEKWHjpspVoqOVGkaeGFdsIHOaVbkeV5snwT+sjyJcKhqExTb3uBC0Vct36IXYyG0HcKkJk8UWdUWrTsAa8KpJZ+U2alYKJNE2q5JRmR1FE+aJNNlrMSVe3lUt5grbx-GCegKzrEBjmzaDhz7RDZwIQpp3nV4qntcuYSIBkfwZtCMQpNmOT-IWiVaYlLj5RkA2Klk9kMaJyO7aj4PoE6HaklVNVMvVTUtW1V0dYTCDxN991ZNCgJGsTTSHiWlkVv8Ro-ArMRA42d5gdzi2886nbklSdJMv6ka8h6AASsbMryM6Mty1J+h69Li0mGn4SkVQ-GWmSxJThRpQg9SQuT8rQi08J5BkevFVzRho7zQiEtgXZuhS9J+nVjXNa1F3oRLBNvHUETsMW0o5Sktb6eTNO5GU2k1Dp+GbsHyQdAxtDUCS8AihzIMpwwC5lxpAC0xrV7qTQmck+QtAzhZT-q1d2VmBkA9U+FJ5zhutscQ+XT70XZlU3y-P85RAtkUSFrkiTHjUSRZtCGSWci7PbQbEn2hPodKwE9z43RolCD4Nl6hJV6oWTciRZTkxVNWXcP9URI1HkfQB+I+avlAepaK+R4jaRIvCP2ek3qIGyOmOytcMppBlgfLBACIIcWgh+Ah10pYNG0rpbMBkIhGRMkNfIsoG4KjGkvdBjFME7WwWwqCkAuLAIkFwyWFctQ1hlvhLIz8cIRDIokdc310gmWMjuAazD5GsPYkot8MlTaQHUeXSIX9Sy6h3NUOyu4GaP3DuTKIVctbQmaNkGsQjrH-xcmVY2LiNJllLD1BK-UUjExpnEYEA1mhNHlqqKJ4kYlp1UVAeJ0V-qQlqF8Q0vxizEVyDTPUCRdz1DwvUAaG4ClzTBsbPBnYyk3XqEIue1QGapA+pRGmmQMzeOVPlXUTNchdJRqnHm7AM7+GcXjSe0U7Lpi8fKB+0JEgv0PP7FuqpdQtEZkkH+HQgA */
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
            fetching: {
              invoke: {
                src: 'loadDataStreamDetails',
                onDone: {
                  target: 'loaded',
                  actions: ['storeDatasetDetails'],
                },
                onError: {
                  target: 'loaded',
                  actions: ['fetchDatasetDetailsFailedNotifier'],
                },
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
                  target: '#DatasetQualityController.flyout.fetching',
                  actions: ['storeFlyoutOptions'],
                },
              },
            },
          },
          on: {
            SELECT_NEW_DATASET: {
              target: '#DatasetQualityController.flyout.fetching',
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
}

export const createDatasetQualityControllerStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
  toasts,
  dataStreamStatsClient,
}: DatasetQualityControllerStateMachineDependencies) =>
  createPureDatasetQualityControllerStateMachine(initialContext).withConfig({
    actions: {
      notifyFetchDatasetStatsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDatasetStatsFailedNotifier(toasts, event.data),
      notifyFetchDegradedStatsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDegradedStatsFailedNotifier(toasts, event.data),
      notifyFetchDatasetDetailsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDatasetDetailsFailedNotifier(toasts, event.data),
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

        return dataStreamStatsClient.getDataStreamDetails({
          dataStream: dataStreamPartsToIndexName({
            type: type as DataStreamType,
            dataset,
            namespace,
          }),
        });
      },
    },
  });

export type DatasetQualityControllerStateService = InterpreterFrom<
  typeof createDatasetQualityControllerStateMachine
>;

export type DatasetQualityControllerStateMachine = ReturnType<
  typeof createDatasetQualityControllerStateMachine
>;
