/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { assign, createMachine, DoneInvokeEvent, InterpreterFrom } from 'xstate';
import { filterInactiveDatasets } from '../../../utils/filter_inactive_datasets';
import { IDataStreamsStatsClient } from '../../../services/data_streams_stats';
import { defaultContext, MAX_RETRIES, RETRY_DELAY_IN_MS } from './defaults';
import {
  DatasetsActivityDetails,
  DatasetsQuality,
  DatasetsSummaryPanelContext,
  DatasetsSummaryPanelState,
  DatasetSummaryPanelEvent,
  DefaultDatasetsSummaryPanelContext,
  EstimatedDataDetails,
  Retries,
} from './types';
import {
  fetchDatasetsEstimatedDataFailedNotifier,
  fetchDatasetsActivityFailedNotifier,
  fetchDatasetsQualityFailedNotifier,
} from './notifications';

export const createPureDatasetsSummaryPanelStateMachine = (
  initialContext: DatasetsSummaryPanelContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QGUCuBbdBDATgTwAUsA7MAGwDoIsAXLWMG2ARVSzIEsa8KAzRgMYALDsSgBiCAHtSFUQDcpAazAU0mXIRLkqteoxZtO3PoJFiECqQNocZAbQAMAXSfPEoAA5TYXO8Q8QAA9EABZQgCYKAHYAVgBmADZQ6IAOUNjQgE5YgEZYgBoQPEQAWlTcilyUx1q6lNSI0IBfZqL1bHwiUkpqOgYmVnYuHn4aYVEJMBwcKRwKTzJaXjn0NQxOrR7dfoMh41GzSctiRRsafzc3QO9fC5lAkIRI1IoK3IrE1LzonMSikoICJZChZL5NUKOTJfZJZFptEAdTTdHR9fSDIwjUzjcxTGZzBZLGgrHBrJFdbS9PQDQzDExjCYWKznS4uey5dxIEC3PwPLlPSKxCjAxJNRzxVKJLJw1IAxAfUIxdK5XLRaK5Rzg2KpVrtDbIyk7dGwACCAgu8ixDNxkhkqisKnWGgp2zRNLNFqtRyZp2stgcbJcNx8vIC-LCsSi2u+EVyEXiWUc0SlhWKiATlWqwNjwNSqSy8VisV1iP1LtR1IMHo4lvp3rxs3mi2WqydmxRVN2TGrtcOOOOzP9xCuQa5PPuYdAAviitCqWi4oSsUThdCcueWUqsca0ay0Xi+9CiRL5K2Fa7pvNNa9-bE4mmjcJLdJbYNrsr3avvexjKgJzOQ5XBywZ3P4jxhDOFBzguhaFiumTrokCRKtUjhgrk0qNNEJ5lmelBwBc2A0JAAAieg-ja0iyA6qinh2FAERwRGkeR1oDr6LIBq4o5eCGE7gc8hYULE0SRAejh5jkBbrvOjjChh+6NOKslZDhzp4QxsCEbQLF0BRkz3viTZEiSZK4fRjHMRAZF6WxPoAROI6crxoF8lOYRJhQiQSvm8TxEm4qJNE67SlEyZ+dUebzokmpqe2hqWTp1msfWhmPs2xKtnRCVaUxSU2Vg+n2X6jlssBY58WB4bPI4ipxvEESpLV6Txn564qhJwkSQeEqOMC0Txq0CLEFIEBwIE2U9CBoYCQuMQJH1EQDbE4qhLk-xpggpQREWMRZI1EQxeteRLTqCKTeexr7CM038dVcZRBUPyajCgXxOupTra8R7Soti3qikcVvpdNLXXWt5QLdVXuQgqpyU9cOJK9STvZteTCUWy6JguBb+ekQPlp2V2YiYOCMPgkxQ25wSIEjclIVk3ypEkS0xcFm25AeFB+b8qr7fmO1NATGlunsJM8GQUhYGNEBU5ONMIGkmZLSJsb5PkRaIXJULZEeUL5MC8TC-Roufp63BywJKogtqMURDtc7AhJG2Av58RvBh+1IZCTRqse53mYapuXubfa-pb91BcJkqLZkjSJpK67ZIkbwneqElznB-t6upJsfiH16k+TeCUxVrny08QXu3k8RxskjUZKEqOAsuKfJHHC7xtqCbG0H+c9likvS5AEcw2kiqFkF+05NU+4u4gK1CoWmqxjFfUHqpAe5zl2nEcldCjwrKqvHE-n28tq3reuaSPWCzP39q2QRL32yJXvBVFZDZczZHKen-9O1L7zwQHuEESYiyJgaJkXIL8dBv10oVMmNAKZiEPk8AaYCkjhBWk3ZMcZ2qamrrUGKQUor5nhDneKr9cpWQ-kPGWaDEDxw9gNcK9sm4HhCmqKC-kPgNTBN5bIQ1mhAA */
  createMachine<DatasetsSummaryPanelContext, DatasetSummaryPanelEvent, DatasetsSummaryPanelState>(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'SummaryPanel',
      type: 'parallel',
      states: {
        datasetsQuality: {
          initial: 'fetching',
          states: {
            fetching: {
              invoke: {
                src: 'loadDatasetsQuality',
                onDone: {
                  target: 'loaded',
                  actions: ['storeDatasetsQuality'],
                },
                onError: [
                  {
                    target: 'retrying',
                    cond: {
                      type: 'canRetry',
                      counter: 'datasetsQualityRetries',
                    },
                    actions: ['incrementDatasetsQualityRetries'],
                  },
                  {
                    target: 'loaded',
                    actions: ['notifyFetchDatasetsQualityFailed'],
                  },
                ],
              },
            },
            retrying: {
              after: {
                [RETRY_DELAY_IN_MS]: 'fetching',
              },
            },
            loaded: {
              type: 'final',
            },
          },
        },
        datasetsActivity: {
          initial: 'fetching',
          states: {
            fetching: {
              invoke: {
                src: 'loadDatasetsActivity',
                onDone: {
                  target: 'loaded',
                  actions: ['storeDatasetsActivity'],
                },
                onError: [
                  {
                    target: 'retrying',
                    cond: {
                      type: 'canRetry',
                      counter: 'datasetsActivityRetries',
                    },
                    actions: ['incrementDatasetsActivityRetries'],
                  },
                  {
                    target: 'loaded',
                    actions: ['notifyFetchDatasetsActivityFailed'],
                  },
                ],
              },
            },
            retrying: {
              after: {
                [RETRY_DELAY_IN_MS]: 'fetching',
              },
            },
            loaded: {
              type: 'final',
            },
          },
        },
        estimatedData: {
          initial: 'fetching',
          states: {
            fetching: {
              invoke: {
                src: 'loadEstimatedData',
                onDone: {
                  target: 'loaded',
                  actions: ['storeEstimatedData'],
                },
                onError: [
                  {
                    target: 'retrying',
                    cond: {
                      type: 'canRetry',
                      counter: 'estimatedDataRetries',
                    },
                    actions: ['incrementEstimatedDataRetries'],
                  },
                  {
                    target: 'loaded',
                    actions: ['notifyFetchEstimatedDataFailed'],
                  },
                ],
              },
            },
            retrying: {
              after: {
                [RETRY_DELAY_IN_MS]: 'fetching',
              },
            },
            loaded: {
              type: 'final',
            },
          },
        },
      },
    },
    {
      actions: {
        storeDatasetsQuality: assign((_context, event) => {
          return 'data' in event ? { datasetsQuality: event.data as DatasetsQuality } : {};
        }),
        storeDatasetsActivity: assign((_context, event) => {
          return 'data' in event ? { datasetsActivity: event.data as DatasetsActivityDetails } : {};
        }),
        storeEstimatedData: assign((_context, event) => {
          return 'data' in event
            ? {
                estimatedData: event.data as EstimatedDataDetails,
              }
            : {};
        }),
        incrementDatasetsQualityRetries: assign(({ retries }, _event) => {
          return {
            retries: { ...retries, datasetsQualityRetries: retries.datasetsQualityRetries + 1 },
          };
        }),
        incrementDatasetsActivityRetries: assign(({ retries }, _event) => {
          return {
            retries: { ...retries, datasetsActivityRetries: retries.datasetsActivityRetries + 1 },
          };
        }),
        incrementEstimatedDataRetries: assign(({ retries }, _event) => {
          return {
            retries: { ...retries, estimatedDataRetries: retries.estimatedDataRetries + 1 },
          };
        }),
      },
      guards: {
        canRetry: (context, event, { cond }) => {
          if ('counter' in cond && cond.counter in context.retries) {
            const retriesKey = cond.counter as keyof Retries;
            return context.retries[retriesKey] < MAX_RETRIES;
          }
          return false;
        },
      },
    }
  );

export interface DatasetsSummaryPanelStateMachineDependencies {
  initialContext?: DefaultDatasetsSummaryPanelContext;
  toasts: IToasts;
  dataStreamStatsClient: IDataStreamsStatsClient;
}

export const createDatasetsSummaryPanelStateMachine = ({
  initialContext = defaultContext,
  toasts,
  dataStreamStatsClient,
}: DatasetsSummaryPanelStateMachineDependencies) =>
  createPureDatasetsSummaryPanelStateMachine(initialContext).withConfig({
    actions: {
      notifyFetchDatasetsQualityFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDatasetsQualityFailedNotifier(toasts, event.data),
      notifyFetchDatasetsActivityFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDatasetsActivityFailedNotifier(toasts, event.data),
      notifyFetchEstimatedDataFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDatasetsEstimatedDataFailedNotifier(toasts, event.data),
    },
    services: {
      loadDatasetsQuality: async (_context) => {
        const dataStreamsStats = await dataStreamStatsClient.getDataStreamsDegradedStats();
        const percentages = dataStreamsStats.map((stat) => stat.percentage);
        return { percentages };
      },
      loadDatasetsActivity: async (_context) => {
        const dataStreamsStats = await dataStreamStatsClient.getDataStreamsStats();
        const activeDataStreams = filterInactiveDatasets({ datasets: dataStreamsStats });
        return {
          total: dataStreamsStats.length,
          active: activeDataStreams.length,
        };
      },
      loadEstimatedData: async (_context) =>
        dataStreamStatsClient.getDataStreamsEstimatedDataInBytes(),
    },
  });

export type DatasetsSummaryPanelStateService = InterpreterFrom<
  typeof createDatasetsSummaryPanelStateMachine
>;

export type DatasetsSummaryPanelStateMachine = ReturnType<
  typeof createDatasetsSummaryPanelStateMachine
>;
