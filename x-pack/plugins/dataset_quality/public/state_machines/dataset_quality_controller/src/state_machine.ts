/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { assign, createMachine, DoneInvokeEvent, InterpreterFrom } from 'xstate';
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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOggyx1gGIAqgAVkAQQAqAUQD640QCEAMjMoAlAJJSNogNoAGALqJQAB2qwyJOsZAAPRAFoA7AFZ2AJncAWABxf3Tp4uAJyBAGwANCDkiADMAIyx7C4J8e7Beu5hwS6eTgC++VFomNh4hKQUNPRMLGyc3GWw7ABmOADGABYktFB8EHRg7D0AbtQA1kMlPOXEZFR0jMysHFylvK0d3b0Io9TtGFa0+gYnNmYW6Ec29gjxfuyxLi5eubHBXvHB8ZlRMXcJdjxeK+eJOL6uPTBAKFYqNHAEOZVRa1FYNdboZptdBdHp9NhMDgmIgYFrUBgAW3Y0zKiMqCxqy3qaxmWK2eN2tDGByudBOZyQIAulmsgtuP3c8Q8Tli6VirjCnx8sT+iESUuBoPBoRcUO8sJANIRFXm1SWdVW8Mx7CI1FQEEgrSI5Go+HQAHkTGBaHwAMqSZSUcTSABykgA6tIxHJ-eIBaZzCLaDdEGFvOw9F4oV8Qi4wmEVdFU+4kpmUrEfHoUn5MgajbN6WbUcyrc1bfbHS1na6PV6fZRFO7-dIAGKKACa7oEccM50TvOTYriXic7ECKVePi+Xx8qoQWeCHkrW9iekzx6edatdNNKKZloxbbtDogTpdbs93s2OO2fQGtCGPZJmpa8TWRRkLXRVkbWfTtuw-Ptv1xHY9h5I5+VnQVhQXFM7j0MJV2+U9oS+SVnhcPc0y8ZJfBcJwnFCdw9HuLwrwxG9wPNNEWSaGCO1fLt317L9sWQ-EGEJdhiVJckqXrDiGS4ltHz4l83x7T9aCQ39OW5Q4+UMeMhXna4lzwuiM0rXxYizAI80Lf5dSSfM9C3Lx5SeJiwjYmYFKbe8oN49s1JICBWD4d0hEkENRwnKcZyMLCTNFUBbieNw9G1LMfBSMJlT3XIwnYYIqPuMinC8YJYh82kwMU5tVjAKAGH45B9jZH88X6QZhi5CYplApF6oCh1mta9rtI5VD9OOQzMITS5TNStUnCKgsQk+b54hcHKKKLcypScPwGI+H5gUymrjSG-zINGlqXza9oOrEvgCXJKSSXQMlKRA9i6pu7imvuyBHuenTpoXDDEoWpNcLBNanlOraduePcckPTMvhySqdqhaqDVoagHXgQV5P+u8LTnRaUrsRwwSlTxfH8QJ3BCcI9wcV5iu8NInEye4tx+FxLobW8IO41sqdhsyHDSJJGb8AIgkYyJ9s+dgvE+BIMgI0I9HlEW-IpiWVNE38pZwsydqKrIV1iAt8IyHa9zSHx2ErAiwhcbajslPxDfJ8XlOg4LIAtpbabuBiNaq55SIPGU91ZtxlVePJcgYgsCiKQ1BsbY3g6C2CBPg4TFxhy3loQOiiszbN0bzAs9xspIsZKnxFcVI6A+uguHxD4v1IQkT2V6cOadudcPBx3xfbSX41dPZIvc+SrZUq6Fs7hP7e6D-ui-4oey9UsOkup8vI8SLms1eAtgj8WIKy8AqHh8EtvhXTwmK8byc7J3elL7w2KHV8oVWDjwvrcPIMd0rxyhInfaLxDw7T8D8HwYR47423r5QOgDOBA3Gk9CBuFZaSksiWJ4NlMruErPEPcPhwTsE9mETIyoshVXcD3fOe98FjQehNM2eJiEyxlOQx+G5qG0LRown+mZ6IMOyHzX+2DaoAIarw4GEBQYnwgMIqumt3Dc3lHREqmUjoVTRgw4qIIAj3wrOWbOhQgA */
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
                    OPEN_FLYOUT: {
                      target: '#DatasetQualityController.datasets.loaded.flyoutOpen',
                      actions: ['storeFlyoutOptions'],
                    },
                  },
                },
              },
            },
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
