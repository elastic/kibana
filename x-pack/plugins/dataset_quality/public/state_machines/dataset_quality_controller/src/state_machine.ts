/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { assign, createMachine, DoneInvokeEvent, InterpreterFrom } from 'xstate';
import { mergeDegradedStatsIntoDataStreams } from '../../../utils/merge_degraded_docs_into_datastreams';
import { DataStreamDetails } from '../../../../common/data_streams_stats';
import { DataStreamType } from '../../../../common/types';
import { dataStreamPartsToIndexName } from '../../../../common/utils';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';
import { getDefaultTimeRange } from '../../../utils';
import { IDataStreamsStatsClient } from '../../../services/data_streams_stats';
import { DEFAULT_CONTEXT } from './defaults';
import {
  DatasetQualityControllerContext,
  DatasetQualityControllerEvent,
  DatasetQualityControllerTypeState,
  FlyoutDataset,
} from './types';
import { DegradedDocsStat } from '../../../../common/data_streams_stats/malformed_docs_stat';
import {
  fetchDatasetDetailsFailedNotifier,
  fetchDatasetStatsFailedNotifier,
  fetchDegradedStatsFailedNotifier,
  noDatasetSelected,
} from './notifications';

export const createPureDatasetQualityControllerStateMachine = (
  initialContext: DatasetQualityControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOggyx1nYDMcAYwAWJWlADEEOmHbiAbtQDWctJmx5CpCjXpMWbTt019B6UeKgJF1IRhJ0A2gAYAuq7eJQAB2qwyR1pvEAAPRABaADYAVnYADgBORIBGABZUtIBmLPiUgCY0gBoQckj8xPZ8lJi0lPiXKKi0-KyXeLSAX06S9R4tYjIqOkZmVg4uDV4BYTEJSTYmDh8iDH5qBgBbdj7NAkHdEYNx4yn0M1mrG1ole3Qgz08QvwD7uhDwhGSAdnYYlMSMXiMXy31iUWBJTKCAiNXY3xiURcaTSLhSLm+aW+yUS3V6Jhw+x0w30YyMk36fCI1FQEEgkgAqgAFZAAQQAKgBRAD67NZACEADI8ygAJQAklyJaynkgQC9Au85Z8QfF2C1WqksmDvoV8lDIgDfvF4lFvjVWkkIfEsniQLtCdohnpRoYJmAoAxaZBkHYLhY5lIZLQ5LZVDsCQNiS7juSPV66RBfUJ-ZYJNdbg5nO5Zb5-IrgsrEOj8nFvmj2vl8i4ay59aVEK18n9vib2jWoolvrlvnaHVHnUcye7Pd6k36ZgGrAsGEt2Cs1httv2iYPSW7OPGx8nU4GM3Ys7RHu5nvm3oXQJ8Irr2C5Ema2siWlEsqCDQhClFb7lq6iYveXxNPtI1XQ51xOfgiHIah8HQSQAGVOWFSh2W5AA5TkAHVuTZPlEPZXN5TPIIPkQNIGgSRIshqZpTRcHJigbBBETVeJdTqZpzUA+JgLOUCSVdCCoJguDKEFAB5RDuQAMUFABNcSGQIk85QVc9SJhbsqiiaoCiyFEOl098mkqRp4mrJIUiabtex6e0QKdMDBKMSDoNgyc0yDWR5BuFQ1Acg4BNjDhXJEjy91sO4HhzFS81eEiiwQG1KmxOiXBibVGkSeJ311ZsITSGIYnS2IawyXj+n4mNhwEYT3PMTyZznBd0HWLYIz4xygpq0L6sudNIsPY8vFU4ilUvRA8hSW8WkBU0qIBdp3yBSpgXLcsmnaRJyrslcuuqjdevQdhqTHSQxMknlZIUpTCLUhKJo-WJ4VNVsUlfF9snyKJ3zWv42MK5JURffIKr2fah0OurjqEalsAgSRxKZTk0Jk+TFOUka4oLDTQWm9KCnRO9iuqH6mM7L8wTycs0U7ZJbTtWhqDpeA5T2wKDvGU94vGsJDU7bTdNaAyWhSd8Im1fKUgRb5dRrbKslxXaAujSGTgpUxuZxxLYXeyjMkyHI8kKcX8mBKoQRqSyzSieowcdDm1fJSNdysLX1MSkE0nYLtEjNztajSWJ62hCJWL0tikiK4q2PtgcnOC05KROmlE3dh6+YQcjm1bJEzYRdo8kScWu3YaiwWo+pOPaOOqqdkcEx9P1095q8ChcW9727Mrn1fb533SOJqhyZpX1SBolfxTrHfAuNR0THdwrd0aeYvTOg+9rFqkBQp6JyfumMKLJ4TaaXQSRGXGlriHZ4b7cJ1OtOV+1x7A4SNobVbIEaJDxBtUqb6LQkg2gqI0BmU9Ko32ciFaGLc15t2qILFIekRZGSYuRaaxVyzVGRFZNoXRlbT1VrfWqbljoNUDHAjSWIvwFEBmbLInFZYxGMoCH2n1qxVgBBPa+M9oGkLCo-SAVDErIPIuqcyvs6xsVLGTaE3Zppf3-M0LsR9bIQPBnwxOR12Cw38MI5+HtHrpF+JxEmFRpZvRYUxc0lRFZ1G1HUdEKRujdCAA */
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
              },
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
        storeFlyoutOptions: assign((context, event) => {
          return 'dataset' in event
            ? {
                flyout: {
                  ...context.flyout,
                  dataset: event.dataset as FlyoutDataset,
                },
              }
            : {};
        }),
        resetFlyoutOptions: assign((_context, _event) => ({ flyout: undefined })),
        storeDataStreamStats: assign((_context, event) => {
          return 'data' in event
            ? {
                dataStreamStats: event.data as DataStreamStat[],
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
      loadDataStreamStats: (_context) => dataStreamStatsClient.getDataStreamsStats(),
      loadDegradedDocs: (_context) => {
        const defaultTimeRange = getDefaultTimeRange();

        return dataStreamStatsClient.getDataStreamsDegradedStats({
          start: defaultTimeRange.from,
          end: defaultTimeRange.to,
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
