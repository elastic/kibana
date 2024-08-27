/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { getDateISORange } from '@kbn/timerange';
import { assign, createMachine, DoneInvokeEvent, InterpreterFrom } from 'xstate';
import { DataStreamStat, NonAggregatableDatasets } from '../../../../common/api_types';
import { Integration } from '../../../../common/data_streams_stats/integration';
import {
  GetDataStreamsStatsQuery,
  GetIntegrationsParams,
  GetNonAggregatableDataStreamsParams,
  DataStreamStatServiceResponse,
} from '../../../../common/data_streams_stats';
import { DegradedDocsStat } from '../../../../common/data_streams_stats/malformed_docs_stat';
import { IDataStreamsStatsClient } from '../../../services/data_streams_stats';
import { generateDatasets } from '../../../utils';
import { DEFAULT_CONTEXT } from './defaults';
import {
  fetchDatasetStatsFailedNotifier,
  fetchDegradedStatsFailedNotifier,
  fetchIntegrationsFailedNotifier,
} from './notifications';
import { fetchNonAggregatableDatasetsFailedNotifier } from '../../common/notifications';
import {
  DatasetQualityControllerContext,
  DatasetQualityControllerEvent,
  DatasetQualityControllerTypeState,
  DefaultDatasetQualityControllerState,
} from './types';

export const createPureDatasetQualityControllerStateMachine = (
  initialContext: DatasetQualityControllerContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QBECGAXVszoIoFdUAbAS3QE8BhAewDt0AnaoosBgOggyx1gGIAqgAVkAQQAqAUQD64gJIBZGQCVRAOQDikgNoAGALqJQAB2qwyJOkZAAPRAFZ77AEwAWAGwAOXfc+f39u7uAIwBADQg5IieAMwAnOwA7PbOujHucTHpzs72AL55EWiY2HiEpBQ09EwsbJzcpfzKkgBizQDKABLSYuKieoZIIKbm6Ja01nYIzu4xLv4ZMcGJwZ7OiXERUQieronsurtxibquufYrMQVFDTgExGRUdIzMrBxcJbzsAGY4AMYACxItCgfAgdDA7GBADdqABrSHFHhlB6VZ41N71T7oWA-f5AkEIGHUP4YcYDAbWEYWKxDKbpJwxNJZHIxHK6DKJLaIYI+fauTzBeyuOLOOKuGKxK6FEBI0r3CpPaqvOofZG437oQHA0FsJgcYxEDDfagMAC27Dld3KjyqL1q71uOLxWoJUCJtFhpLGdApBipZhpEzpiD2nhccVWx2CwVch1W9m5Owy7HciT89klIr2rnyMqtKMVdoxqrAUAYqAgkGQJP4wl6MnkSmkqk0On9Q2pPuDoCm3nc7F26aynLOIqTsQSyVS6Uy2Tc11lToVtvRKveZYrVYgNb+TVaHW6vX6HZMge7kx5umWB3WYaynkSMWFE-czlTrj2s2C6yf9mCi4FiuaLKg6nCbpW1a1i62ogmCEJQp68KIsuNogfamJVuWkE7tBmqwe6xLeuSBiUp257jJeCAxiE7AeOmJzPokzF7EmvIXHRgrCqK4qSlkgGoaiSoYaW2HbruGr4jqfB6qa7CGsapoWkBaHCSWG5iVBe4wW6HpemSvqkaewwUbSvY8ss+zXnEsShB49iRlykSIHEhzzMxKQ-s4ni+HmNzYsBanroh6AQd2dYiBIjaKCo6haGRZ6jJRIYIMKqarMsbIhB5QqJs5CCfq4g4xs+nkhDEEruAJAWqcWwXAqF2HhXwzRtJIXQ9BIJ6DIlQZUTkRWZisiQij5qzuBySbOEK7AXCNwTHLxqQpNVyKBXVYENWF4wRQ20hyGoUgaKo8gAPJqO0CUmUlZm2A4HGxJ+Sz+CsDl5dsoRON4mRxvYPgcuKq3yrVa6bfQ210LtUXSGoohKO0QiiJQ7VXV2yXmalngJEyMTDXEKQCksU1pi4cZY2moRzq4QPWkJG2YltTU7YIkVSNIuACJIygAJqo6ZPZ3dRqxFRkszJFluPLGxGzsDZv7pCscbrH5S41XToMM+DTOQzp0ngrQkLEgilqCUWGt1IzFbhbrhJEQZtB+j1119Slua6IOzE+VmPhvm4Sa44yey6AxyzTb4NOFquoGa41Vs7TbuoMPq8lGugJrmibatm9HFta3HOv4bpdvdo7AY3QL9K8rNcTuAK3ixgKyRJoE7t7AHkZxKKDlVfmptRyJHCW-buJENQOEs3tfQAEIADIyJQyhyFIi-dWXLsY2m4a8Y+-7LJvSYTYNWQ1xkFyPjMEfrebg958P7Cj+P4inRoGhz-tsOUPIABqMjHu0kjiEusZNGt0+wzHYBlUUWNj4XFcEmCU+w2Q-lnP4T8mRL4gxzjfWOd8H7bj4E-F+b8WgCBnjPTqfR-7iBhnDFGwD+ZUUFPsea14BS6EyFGf26ROKhw5FjDwAoVYqXVlgn4RByDUHwOgPg-856fxhpIAA6hQ0QVC+blyoimdhvgTiZmcFkBBbEKpFSfN5ZIwQ2S42pr3LO-d1JiIkVIvglAZ6nX-tIFoM9uanQEOIdR69Bb-icJ+RwARYysifEY0IsssZ+A2KcCqmYMEiIHg4yR6BEIWAeAALz1ghWAmBQqZzWpg1J3xxHpMyWMHJOp-EXhSryGacZEj6O8p3XGxw2L4zmMkGywpprDXWMk7OZSKlSKqSQGpIIsSoHaIwMAqAzTIBwKgEgRBJKujyQbRCsJjbCJGfY8pjiMnAiyaQXJ0y1RzIYAspZKy1kbIInpEk9tS7kQ0a7fRqYVhYwWv+XMViuluHYLjYx6xBTsk8MMuxwUjmVNOdU85OoZnXNucszADyE4ySTnJBSaclLFOBikw5YyTm0DOSQC5UAUXzMWei1Z6yE7POIoZfQdT0aCzOMEJI2jryxiCaKJyH10xTl4r4fwPhhSJGhehElxyJlTOpUPbsaBYAAgAEZjwYBAR5bp4LbKNihWxsrYWkoVUi6Zyrxiqo1VqnVTLi4kTZfQj5GM0EuCWN5NY1k1h+3yjkRwEDQ4BAmiOR8MqgpgTheMhFkyLVKtviqrAtrUDat1dJWSBpU7p2Un3E1UazWxsVSFCGtAbWatTfawuOpmWvKMk7EBFdQwig9T+PwqQFq+rgf60I74rEXF0OsTIpwI30zqNGjJeDIDONce4zx3jfHstAYgEaCQT6jWWjmZwbE9hODFKHY4iwghQpsSU4lpr5VTogBPaGB12hyA0J0QBsgYotjiu2BtDCGmdoOEybR4TDjMTYrA1MQRUjBxrrkLwo7r5pPGX8Ue2Br2nSEJINQHivE+L8S6gJUxwUQIqsxNMMxEi13SDumuBx-D40fKcE4J6ZS0GoFWeAQx9kwodGvepGMAC0rhuWSlWCRyUA1djvUQDxre00cwZE-LoYO-gYOiLVI0LjHKpj7DcF4HwfgQ0hHCPlacIKFhiiyJKR81j-JnoOcFFTXxq0gjU8uoW4Z5O7DSIKSUswBRJnFAOLIvhPwzElhkJTqS7POivU5ptqVwFCksSJiU-Hgi+Z8rNGYf0mR-XWOkML9isJbi0qx3q3HBbJHDEOKUo43CbEMykYzYG5zmZGnl2zEFxJ4Sko595uHoiRlmvxxwrkuInBS-lY4744n+FCN4Ea6ZWtgQKzhCS98x7bmi1RCxaW1h6Nco4CqaQ2LXjmMRxw15DhsmFAtmOpbivO1K1MAcIQmFZUskE8TCB0x0QlJkMUPgDFLGu7nHB1sHNQA2w08USRYi128Bmc+7gppQ8Ysgi434fJCLzZGm72taAjzW5ACHG8zgQN8KESUwdgtCocDkA4AQRTsLo14OIQOOATqJ2Vun9FZwnDTHNtiOQEhvk-N4JkHheTOFZ3BslFKqUc6mIGjk3POQcg8mxEITgOQVUFIzrMlnVbWY45iCd5rKXIqubSu5GL1ny6vHMJYsxIyEfxtNRH+VliDrol63TrkYz4ylybot8aaU3LpfcxlYPbfUX-CC8nTu9gu9CGxXYRVTiOVmFxbykvT1EpswW+VQezeXO4KisP1vcT6zAFH0+ECctCkjOcIIyeHLfN5LsGM00KrZ6s7no347C3ksRUXhNIPrXJorWmqPvI5hK7TDz1XTd-XB01+w1YLT4isIDwP2XyKrV0HLXa9N3WSvqZ5DH2fT4Vd84+wMkxPFO4zjTD3HvtM8-G+30PqlJbccH8rRXiEUepG7sYGmYFiwoSCMQU0C0rcsYrkiwZwawW+l6BOEAU+wc3KHCjEaOYoQG7ugQCQ-gHawW-GsQ3eBuve+a7+8qCGZghOPWD290A44oLSg66+2YkB7uEo742iTIywvgg6K0BQeQQAA */
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
            UPDATE_TIME_RANGE: {
              target: 'datasets.fetching',
              actions: ['storeTimeRange'],
            },
            REFRESH_DATA: {
              target: 'datasets.fetching',
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
                onError: [
                  {
                    target: 'unauthorized',
                    cond: 'checkIfActionForbidden',
                  },
                  {
                    target: 'loaded',
                    actions: ['notifyFetchDegradedStatsFailed'],
                  },
                ],
              },
            },
            loaded: {},
            unauthorized: { type: 'final' },
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
        integrations: {
          initial: 'fetching',
          states: {
            fetching: {
              invoke: {
                src: 'loadIntegrations',
                onDone: {
                  target: 'loaded',
                  actions: ['storeIntegrations', 'storeDatasets'],
                },
                onError: {
                  target: 'loaded',
                  actions: [
                    'notifyFetchIntegrationsFailed',
                    'storeEmptyIntegrations',
                    'storeDatasets',
                  ],
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
              target: 'integrations.fetching',
              actions: ['storeTimeRange'],
            },
            REFRESH_DATA: {
              target: 'integrations.fetching',
            },
            UPDATE_INTEGRATIONS: {
              target: 'integrations.loaded',
              actions: ['storeIntegrationsFilter'],
            },
            UPDATE_NAMESPACES: {
              target: 'integrations.loaded',
              actions: ['storeNamespaces'],
            },
            UPDATE_QUALITIES: {
              target: 'integrations.loaded',
              actions: ['storeQualities'],
            },
            UPDATE_QUERY: {
              actions: ['storeQuery'],
            },
          },
        },
        nonAggregatableDatasets: {
          initial: 'fetching',
          states: {
            fetching: {
              invoke: {
                src: 'loadNonAggregatableDatasets',
                onDone: {
                  target: 'loaded',
                  actions: ['storeNonAggregatableDatasets'],
                },
                onError: [
                  {
                    target: 'unauthorized',
                    cond: 'checkIfActionForbidden',
                  },
                  {
                    target: 'loaded',
                    actions: ['notifyFetchNonAggregatableDatasetsFailed'],
                  },
                ],
              },
            },
            loaded: {},
            unauthorized: { type: 'final' },
          },
          on: {
            UPDATE_TIME_RANGE: {
              target: 'nonAggregatableDatasets.fetching',
            },
            REFRESH_DATA: {
              target: 'nonAggregatableDatasets.fetching',
            },
          },
        },
      },
    },
    {
      actions: {
        storeTableOptions: assign((_context, event) => {
          return 'dataset_criteria' in event
            ? {
                table: event.dataset_criteria,
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
        storeIntegrationsFilter: assign((context, event) => {
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
        storeQualities: assign((context, event) => {
          return 'qualities' in event
            ? {
                filters: {
                  ...context.filters,
                  qualities: event.qualities,
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
        storeDataStreamStats: assign(
          (_context, event: DoneInvokeEvent<DataStreamStatServiceResponse>) => {
            if ('data' in event && 'dataStreamsStats' in event.data) {
              const dataStreamStats = event.data.dataStreamsStats as DataStreamStat[];
              const datasetUserPrivileges = event.data.datasetUserPrivileges;

              // Check if any DataStreamStat has null; to check for serverless
              const isSizeStatsAvailable =
                !dataStreamStats.length || dataStreamStats.some((stat) => stat.totalDocs !== null);

              return {
                dataStreamStats,
                isSizeStatsAvailable,
                datasetUserPrivileges,
              };
            }
            return {};
          }
        ),
        storeDegradedDocStats: assign((_context, event) => {
          return 'data' in event
            ? {
                degradedDocStats: event.data as DegradedDocsStat[],
              }
            : {};
        }),
        storeNonAggregatableDatasets: assign(
          (
            _context: DefaultDatasetQualityControllerState,
            event: DoneInvokeEvent<NonAggregatableDatasets>
          ) => {
            return 'data' in event
              ? {
                  nonAggregatableDatasets: event.data.datasets,
                }
              : {};
          }
        ),
        storeIntegrations: assign((_context, event) => {
          return 'data' in event
            ? {
                integrations: event.data as Integration[],
              }
            : {};
        }),
        storeEmptyIntegrations: assign((_context) => {
          return {
            integrations: [],
          };
        }),
        storeDatasets: assign((context, _event) => {
          return context.integrations && (context.dataStreamStats || context.degradedDocStats)
            ? {
                datasets: generateDatasets(
                  context.dataStreamStats,
                  context.degradedDocStats,
                  context.integrations
                ),
              }
            : {};
        }),
      },
      guards: {
        checkIfActionForbidden: (context, event) => {
          return (
            'data' in event &&
            typeof event.data === 'object' &&
            'statusCode' in event.data! &&
            event.data.statusCode === 403
          );
        },
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
      notifyFetchNonAggregatableDatasetsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchNonAggregatableDatasetsFailedNotifier(toasts, event.data),
      notifyFetchIntegrationsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchIntegrationsFailedNotifier(toasts, event.data),
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
      loadIntegrations: (context) => {
        return dataStreamStatsClient.getIntegrations({
          type: context.type as GetIntegrationsParams['query']['type'],
        });
      },
      loadNonAggregatableDatasets: (context) => {
        const { startDate: start, endDate: end } = getDateISORange(context.filters.timeRange);

        return dataStreamStatsClient.getNonAggregatableDatasets({
          type: context.type as GetNonAggregatableDataStreamsParams['type'],
          start,
          end,
        });
      },
    },
  });

export type DatasetQualityControllerStateService = InterpreterFrom<
  typeof createDatasetQualityControllerStateMachine
>;
