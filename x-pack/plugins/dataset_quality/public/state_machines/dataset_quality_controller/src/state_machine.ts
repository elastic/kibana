/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { assign, createMachine, DoneInvokeEvent, InterpreterFrom } from 'xstate';
import { DataStreamStat } from '../../../../common/data_streams_stats/data_stream_stat';
import { getDefaultTimeRange } from '../../../utils';
import { IDataStreamsStatsClient } from '../../../services/data_streams_stats';
import { DEFAULT_CONTEXT } from './defaults';
import {
  DatasetQualityControllerContext,
  DatasetQualityControllerEvent,
  DatasetQualityControllerTypeState,
} from './types';
import { DegradedDocsStat } from '../../../../common/data_streams_stats/malformed_docs_stat';
import { fetchDatasetStatsFailedNotifier } from './notifications';

export const createPureDatasetQualityControllerStateMachine = (
  initialContext: DatasetQualityControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOgDMcBjACxK0oaTAGJkAQQAqEgPoAZAPITkAUWQBtAAwBdRKAAO1WGRJ19IcogC0ARgDsAFnYBOWwDZbb21p9OATP4ANCAAHoiO-gAc7ACs7lqx9vYAzC7+SVG2AL7ZISJYOATEZFR0jMysHNzo-ILCGKjsRNSoEPUF2OiwXLwCQqIQdGDsggBu1ADWI51FhKQUNPRMLGy9tf0NmM2t7UKz3et1Qgjj1DwYZrTaOjcWRiboVxZWCC7uIeEItrHO7oFRdJRLTuf4BXL5RpdYoLMrLSprGrHLZNFptDpgKAMNqQZDnHpIzaDYajWgTabsA4w0pLCqrap9DqNHbo-aY7EQXH4o6bU5k86XOg3O5IEAPUzmUVfWxRGLvfwpX7AqLuFxaeyxEKvd7sfyOWwpByBexaKIpLIQkBU+Y08orKqjCCsUSUAASEgAcgBxVSyAAKEh9IsMxgltAsXz1cUBoMcKXcvwVWkSWsQsXNuviHmSUX8at8lutJUWdoRHBITrALvd3t9ACVFAB1ADK-tUdf9gdUwbFoaektAkecsRj7jjCciKWTmssiDH7nYCTVtn8Wn8thlBtyeRAtGonPgoqLsNp9rY9z7zylNkVWnYiR+U-1G8cH1nCGs-n+7BSAXsK6nKJHEcIDCyhOZizhOkHUJJlMAvR4r0HG813vWJHy0Z9bFfVMP3sOUPC8KIkjVVUPDAzBoRtEt4XpHk4NRXYGK6Q8Q0QgcwhsDJnAfdNMI3bCEmCd8Yl+Lxk3-TCJ38CjCjwaioLPBkNgYlk9hRFj6KEBCwwjLiQTQjCsNfNdcPeWSqMg08yy0lE1OYnAeh4agAFsDFYdAwB0-tw2vD9V38OJVTHeJQRSRx3jfV483se88y0FwUinBUxxcewLIgk9Szo2D9mZNF1OQdkcQgPEeFY3t2N85D-PTdgsjSjxIlVFV7FwmJ8JSdd7ESjUIsCWIMvkqzspgxk8u2AqMSxEqyoJcaoG8pDOP81D1xAjIXDS+IuqiXCfGcDckqcEDVSBFIhupGjoMRBaCnstkZs5UruWctyPK80VxR8vTVtieqvH-McvxcVrcIyQKNVzDw0vzdJ3EuhTrLoitWCWjivk-WVdXsBJfzcW8U3fYDYtXRwRxlED1WibdsiAA */
  createMachine<
    DatasetQualityControllerContext,
    DatasetQualityControllerEvent,
    DatasetQualityControllerTypeState
  >(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'DatasetQualityController',
      initial: 'fetchingData',
      states: {
        fetchingData: {
          type: 'parallel',
          states: {
            loadingDatasets: {
              initial: 'fetching',
              states: {
                fetching: {
                  invoke: {
                    src: 'loadDataStreamStats',
                    onDone: {
                      target: 'complete',
                      actions: ['storeDataStreamStats'],
                    },
                    onError: {
                      target: 'complete',
                      actions: ['notifyFetchDatasetStatsFailed'],
                    },
                  },
                },
                complete: {
                  type: 'final',
                },
              },
            },
            loadingDegradedDocs: {
              initial: 'fetching',
              states: {
                fetching: {
                  invoke: {
                    src: 'loadDegradedDocs',
                    onDone: {
                      target: 'complete',
                      actions: ['storeDegradedDocStats'],
                    },
                    onError: {
                      target: 'complete',
                      actions: ['notifyFetchDegradedStatsFailed'],
                    },
                  },
                },
                complete: {
                  type: 'final',
                },
              },
            },
          },
          onDone: {
            target: 'idle',
          },
        },
        idle: {
          on: {
            CHANGE_PAGE: {
              target: 'idle',
              actions: ['storeTablePage'],
            },
            CHANGE_ROWS_PER_PAGE: {
              target: 'idle',
              actions: ['storeTableRowsPerPage'],
            },
            CHANGE_SORT: {
              target: 'idle',
              actions: ['storeSortOptions'],
            },
          },
        },
      },
    },
    {
      actions: {
        storeTablePage: assign((context, event) => {
          return 'page' in event
            ? {
                table: {
                  ...context.table,
                  page: event.page,
                },
              }
            : {};
        }),
        storeTableRowsPerPage: assign((context, event) => {
          return 'rowsPerPage' in event
            ? {
                table: {
                  ...context.table,
                  rowsPerPage: event.rowsPerPage,
                },
              }
            : {};
        }),
        storeSortOptions: assign((context, event) => {
          return 'sort' in event
            ? {
                table: {
                  ...context.table,
                  sort: event.sort,
                },
              }
            : {};
        }),
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
        fetchDatasetStatsFailedNotifier(toasts, event.data),
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
    },
  });

export type DatasetQualityControllerStateService = InterpreterFrom<
  typeof createDatasetQualityControllerStateMachine
>;

export type DatasetQualityControllerStateMachine = ReturnType<
  typeof createDatasetQualityControllerStateMachine
>;
