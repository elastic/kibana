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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOggyx1gGIAqgAVkAQQAqAUQD640QCEAMjMoAlAJJSNogNoAGALqJQAB2qwyJOsZAAPRAFoA7AEZ2AJhcBmVwFYAnL4+-gBsLk4ANCDkji6h7CH+7u5eABxeel5evu4ALAC++VFomNh4hKQUNPRMLGyc3GWw7ABmOADGABYktFB8EHRg7D0AbtQA1kMlPOXEZFR0jMysHFylvK0d3b0Io9TtGFa0+gYnNmYW6Ec29ggOIb7sqf7+LrmvuVmpLnlRMXfufweFy+XIuVJ6EIhXIpPSpApFEDTMoEOZVRa1FYNdboZptdBdHp9NhMDgmIgYFrUBgAW3YyJwqMqCxqy3qaxmeK2RN2tDGByudBOZyQIAulmsotuLyc7F8cV8qRyTgeISVf1ijycvhCelyuT0Lj0TlyThe-kKxUajIq82qSzqqzAUAYqAgkGQ+y5BO2fQGtCGe0m9Ots2Z9sx7OdrvdEE97W9hJ2ewFR2FhnO5gltBuiCN7i1hrhyT0pb07g1CBS7jlTlSEIhkP8TjSTktSNDTLtGLZTpdbo9Xs2PqJfBJ1PY5Mp1LpDLD3dZjs40YHcaH+KTUF5-MOQsMItMWcFOaljicNb0oRbpf17hCXnckWiiDyIXYmVS7j1egCULSqXbOcu3RRcsRaIhyGofB0D4ABlSRlEocRpAAOUkAB1aQxDkeDxAPMUj2uU8EFyCEnn8LwQWhVJdSyXJKx1VInnPMFoVce960AztbRAh0wIgqCYMoRQAHl4OkAAxRQAE0RIEPCM1FcVj1zO4Ww8EJPB+Lx9XhLTKyhIFIU-OFXihFs20RICeJZPj6nAyDoOHTd+kGYY+QmKZuLRWzIw4BzBOc31t32Xdjn3RTD0uIjQFudIgTNGjSyCJwm1SStzxrNVcl8XwfweG8LSs7zwx7JcAqcjdfTHBhSUnCl0CpWkQxxYDfN7VoBMq7lkw81M91OSKCOiyVYsQb43D1QFFUSSj-DhBjnieXxUtSqFTPeLjWpsiMOoq9B2CIahVz4YSxJkKTZPk-DlJiuwXwedg6xCOtvDvHSHxCSslVlRUTQCfwDXvdwtpmNrdvKrqDvaI7sAgPgRKESQUMkmS5IUowlMI0b7qrVx33lTxS0CcsXC+58EESN8VW+VLDUSF4vEKRFaGod14FFayfIhlZMxGk8xruMmgTvLSUl0mEXErBwfDcGEMjVfxUlcdxvl8UGUR2sqsQ5Jo+ezVSHBcOJgVlgIUtCcJpdV3ICZVIJoRyA0meK7bue19lQ0TX19ZU4infYZskhowJ9QeCsKYcJjvhSZXnlyvLlY1m13dAz2cWaI7V19u7bkVR4KJbQJwTyCiI-+BwKMDlVm1IpJIU+ZP514vzl37WN4w5qKDeIo2v3fK8Mj1GFgaff43keTwshe154X1bwm-Bj2+xjQcEyCokc5x25cmhdhTU8QI8kyLIx5fT4noycJH11bU1sXrW05X1dO8O47Yy3gXcdBW30jhHwlRq00pWYIGkYTPHSICSELsrRu1Kk-Tqjl0Cf0Nj8Nwotjbi1IpLKWFNSJuDyokFUaRKKXhcA-VOdl-JQw3r0FBxFTRvh+DlYOXg2JOG1AZQIgd7wwnLIfCERVYFg0flQxBgUs4fyxvzVSxtSL70-EHcsysCzk3+C2NwdZcqhHeCxHwFD4FiP2uwGG5hID0MFm8WUbE8rJFeBwtWGUTZeEBt4E0xtDTM3yEAA */
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
            loaded: {},
          },
          on: {
            UPDATE_TABLE_CRITERIA: {
              target: 'datasets.loaded',
              actions: ['storeTableOptions'],
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
