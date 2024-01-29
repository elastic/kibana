/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { assign, createMachine, DoneInvokeEvent, InterpreterFrom } from 'xstate';
import { DataStreamType } from '../../../../common/types';
import { DataStreamDetails } from '../../../../common/data_streams_stats/data_stream_details';
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
} from './notifications';

export const createPureDatasetQualityControllerStateMachine = (
  initialContext: DatasetQualityControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOggyx1nYDMcAYwAWJWlADEEOmHbiAbtQDWctJmx5CpCjXpMWbTt019B6UeKgJF1IRhJ0A2gAYAuq7eJQAB2qwyR1pvEAAPRAB2AE52AFZYqIBmAEZ42IAmCPjkgBoQckRkgA4Y9MT0koAWSsT4gDY6yoBfJrz1Hi1iMio6RmZWDi4NXgFhMQlJNiYOHyIMfmoGAFt2ds0CLt1egwHjYfQzMasbWiV7dCDPTxC-AIu6EPCEZOT0uvYootqX2MqoytiiSieQKzxK7DKFX+NXqjRabRMOA2Oh6+n6RiGHT4RGoqAgkAERHI1Hw6AA8j4wLRJABlACiABk6ZQACoAfQAcnSAOps5AAQRZ-PpLOuSBAt0CD3FTzqEWS7GSWQydQyyTqURcRRBiDqb3YDTqWtiRWiEUSdSK8JAayR2m6ej6hkGiIO7BxeIJ-CJJPJlOplAZZPpbIAYgyAJpkgCqovcN38UuCMsQ6TK7AiRs+dUSEQilS+FR1CCBETixUqlvSUUtv2S1ttnRRjp2GNd2Nx+IghOJpIpVNGFnGUhktDktlUq1dyId23RLv2Hc93e9vb9A-MlgkJzODmc7jFvkT92ToCeL1S7BclUzUSiLyKxUSiWLeqKio15ViZvvsXrrRtad7S2NFnT2LF3U7L0fT7f1By3KQpkWdhZnmRYVkbGcQKdXZMVMSDlx7X1+1oeDhx3Ow91oK543FSUT0eQpkmvCFUhcTVylNIpKmLWIXDLCpUj1ZI70qJVEgbIDNlRHC20XAiu3kCBWEkaMAAUBRZOk2SFAAhJk2UoAAlABJLTTP5Q8JWPIJGIQf52EqdJ+MSaoEgtOUePyXV9UNFw9RccoxMyST9iwmTWwXCCPUUkhlLASQyTUukOTDSMYzjLw6Js6Uz0QSoXHSCF-N+PMzWY7VvIQQEXDiL51SNMTGgSUKOnClt504MAoAYZdkDsQ4hysaRZHkU4VDUKTmznMD8R6vqBrI45bHOS4D1oo87lslMEGrd9En4iIykrOpkgLdJi2YwEDWckS00C1U9Va9ZgIizq5t6rt+qEQaEMmBhphQuZ0AWZYpzC16Otm7rPsgb7fvIlaqJorLNqTOy9vYA682OhozqKC6qprWrTXNIoCZKWpKxaADaGofF4HFTDIZmgYEy23KwkQABaP44miN54gKnNyjqYtediD50gKzM-jJ5z0meu1pKh3D23Z9Gdu5hVvyiQXfn8590hNWJizExyxNqFw+PvQKxKVptZ1AtX5M3YcNYYnaTXeN4bwtA6NWtyrQVed8in8zM-2-AmKwd9rWbk6KoIgD3tryhBK0c5zzTcpIGnzYsUlq1JsZNPWXj1WI45Z53E-wmLoLXEjU852V0yVeJBfSdVNWD-KRI+dVXhquUn2rlWE6i+vk6I2CNyOCQW9PLmEHq9gigSaPYg1cO9V4geNTvY3XKBE1FYA5mJ9rqeRgblcYPXUi76XuzklzSW5Wtxo3kSbiiyqwE7wS7Kj1mUZi58EQQyvrJG+bo75KVYC-Ha1YipR24lkao0saymwATURU2MS7VkCi1C+U0nYwK6vNL6A0kHp1qmXaowlf6uXlP8YsppEjlhEn+IEDQ0jj2mtfShsMIDwyWovbKHNl5PALHVaETCvg3kJqCKI5oIRRBNBECO1tUhRAEeQyKwiFo-QUpAWhK9t6VDiBowEGiS5iS8io8E+YaxHRzNne8NMmhAA */
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
                  actions: ['storeDataStreamStats'],
                },
                onError: {
                  target: 'loaded',
                  actions: ['notifyFetchDatasetStatsFailed'],
                },
              },
            },
            loaded: {
              initial: 'idle',
              states: {
                flyoutOpen: {
                  initial: 'fetching',
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
                    loaded: {},
                  },
                  on: {
                    SELECT_NEW_DATASET: {
                      target: '#DatasetQualityController.datasets.loaded.flyoutOpen.fetching',
                      actions: ['storeFlyoutOptions'],
                    },
                    CLOSE_FLYOUT: {
                      target: '#DatasetQualityController.datasets.loaded.idle',
                      actions: ['resetFlyoutOptions'],
                    },
                  },
                },
                idle: {
                  on: {
                    UPDATE_TABLE_CRITERIA: {
                      target: 'idle',
                      actions: ['storeTableOptions'],
                    },
                    OPEN_FLYOUT: {
                      target: '#DatasetQualityController.datasets.loaded.flyoutOpen',
                      actions: ['storeFlyoutOptions'],
                    },
                  },
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
                  actions: ['storeDegradedDocStats'],
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
        const { type, name: dataset, namespace } = context.flyout.dataset as FlyoutDataset;

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
