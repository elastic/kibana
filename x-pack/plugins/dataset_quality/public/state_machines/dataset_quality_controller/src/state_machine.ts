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
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOgDMcBjACxK0oaTAGIIdMO1iZ0UkVhwFiZKnUbNWHbun6DhGVAG0ADAF1EoAA7VYZEnUsgAHogAcAZgBs7AOwAWAIBWNxM3Ly9QgCYAGhByRH8ARhN2NwBOZJMkgICTDw8AX0K4hWw8QlIKGnomFjYuXgEhBXYialQIfTKcWEbdZqhxSXZBADdqAGt5Q3LlKrVazQadPRbDNo6u9cxyvtXBhHHqHgwHWlMzS6cbO3Rzp1cEb392HN8vXw909K8gryivjiCWeSQ87G8UU+6U8biCUSibl8xVKsyUlVUNQ09W0TW6G3anXxu16-TWQzYTA4ViIGE41AYAFt2D0Kipquo6loyYNWoTtgYSeh9nihEdaBNTvc6JdrkgQLd7I55U8Xm9fB8vj8-gCgfFEAjUh4Ah4kgikkl0r4TEEiiUQKz5pjOctcQNiahNkSWmAoAxOpBkCcRe6hMNaFJjtMWWi2QssVyVqLBZ7+d1ff6IIHgzz9OLJWcZeY5dZbEraI9EB54ex8m5-BEkm5LUF-AVgYgvMa-H8QhqkbaGyiHbGnRyljjcztU1t036AxAgzwQ+TRJSGewaXSGczHRjx9juQcPV6BcgMwulyvDscpedZeYbmXpRWVVWa3WG14my22x4OwgravBqvhRGa3y-FabjDnu7KLIeDQkBArCiJQAASACCAByADiACiAD6AAKGH4SWCrPg8b4IBalrsL8GqtukFpRCY6T-vqzymuwQS+L8UQwkkAJBP8QQwaO+7wYmHBISh6HYfhBEAEoAPIAOoAMrEXhSnEaReHkYqL6VjRJi+EEfiBMkoEmFE3g5ABCK+LW-gmJ8nhQtaXhueJQpjlJrqjMhYCoZhuGERpKlKQAKoZlHKqATy0c5bkCQ2vhmma+QARaFm+G4oQmmEyQib5ihxs6E7crJIUqUReFYQRABiAAyACaKkAKqxY+8pGVRiWIOkYRvEJvz-G5fFmgB5lROwTkZc2FqRFEZVzJJCaBTVqEtSpGmEa1HXdXFdwDS4iC0UkPGBEJgT1hk-wAekEL1mEvFpWEHj+NB9qwfGLqTseQhNUQ5DUPg6AKOGkYSlMMx+RtANHsmINgxDCj5ichYXMWvWlqdCXnQg9bgkJQQWjCCKtqBAEZK8vG2gVIT+D8SLFPatDUFm8Dyn9lUIQwT4E6+g0IAAtP4sScWL+W1nkSTJEi9meGt6JwZtgPJgoQvliZXgAf4FmG823xthk+QmCY-iqxVB7SVOKanh6ew68Z1GtjlHhzcxALfNW-xfE2Nv+RryOho7abTnsDuu2dSW2Y5XtpPWOQeFb71-HaqII+rSNJuHfKzlHpI8NQjI0jgYCx4TTzfs9lt0yznnwo5308d4XzeLZ5PJMHiNVfn5KF96wgXlmi7BtXItE62EI2kkIRNkEYTZBxIKG85prMd8rZfZb1u-RJucD26Q8EkXo-zuPV4x318XT-Hc1p+Ti9wivYIAQCV1TWa6TwlEyRAR92PgLB2w8zxj2zMudgpdy6sDkFPPWTY-D5Hyp8ZInwHKcT+KkII-FvIwjbJ8Vah8c7-RPkFVgiDqIWlAn4UC1Y2wKyliCeEzkPh-3+BEesXwfrZ3KiHPOp9Bio3BpDQw1DRYFHmjkNy1YF4RA8AVWm0j-jfACBEZeUIfrFCAA */
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
            UPDATE_TABLE_CRITERIA: {
              target: 'idle',
              actions: ['storeTableOptions'],
            },
            OPEN_FLYOUT: {
              target: 'fetchingFlyoutData',
              actions: ['storeFlyoutOptions'],
            },
            CLOSE_FLYOUT: {
              target: 'idle',
              actions: ['resetFlyoutOptions'],
            },
          },
        },
        fetchingFlyoutData: {
          invoke: {
            src: 'loadDataStreamDetails',
            onDone: {
              target: 'idle',
              actions: ['storeDatasetDetails'],
            },
            onError: {
              target: 'idle',
              actions: ['fetchDatasetDetailsFailedNotifier'],
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
