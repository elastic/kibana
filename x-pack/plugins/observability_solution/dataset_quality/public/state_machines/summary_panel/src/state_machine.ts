/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IToasts } from '@kbn/core/public';
import { getDateISORange } from '@kbn/timerange';
import { assign, createMachine, DoneInvokeEvent, InterpreterFrom } from 'xstate';
import { DEFAULT_TIME_RANGE } from '../../../../common/constants';
import { IDataStreamsStatsClient } from '../../../services/data_streams_stats';
import { filterInactiveDatasets } from '../../../utils/filter_inactive_datasets';
import { defaultContext, MAX_RETRIES, RETRY_DELAY_IN_MS } from './defaults';
import {
  fetchDatasetsActivityFailedNotifier,
  fetchDatasetsEstimatedDataFailedNotifier,
  fetchDatasetsQualityFailedNotifier,
} from './notifications';
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

export const createPureDatasetsSummaryPanelStateMachine = (
  initialContext: DatasetsSummaryPanelContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QGUCuBbdBDATgTwAUsA7MAGwDoIsAXLWMG2ARVSzIEsa8KAzRgMYALDsSgBiCAHtSFUQDcpAazAU0mXIRLkqteoxZtO3PoJFiECqQNocZAbQAMAXSfPEoAA5TYXO8Q8QAA9EABZQgCYKAHYAVgBmADZQ6IAOUNjQgE5YgEZYgBoQPEQAWlTcilyUx1q6lNSI0IBfZqL1bHwiUkpqOgYmVnYuHn4aYVEJMBwcKRwKTzJaXjn0NQxOrR7dfoMh41GzSctiRRsafzc3QO9fC5lAkIRI1IoK3IrE1LzonMSikoICJZChZL5NUKOTJfZJZFptEAdTTdHR9fSDIwjUzjcxTGZzBZLGgrHBrJFdbS9PQDQzDExjCYWKznS4uey5dxIEC3PwPLlPSKxCjAxJNRzxVKJLJw1IAxAfUIxdK5XLRaK5Rzg2KpVrtDbIyk7dGwACCAgu8ixDNxkhkqisKnWGgp2zRNLNFqtRyZp2stgcbJcNx8vIC-LCsSi2u+EVyEXiWUc0SlhWKiATlWqwNjwNSqSy8VisV1iP1LtR1IMHo4lvp3rxs3mi2WqydmxRVN2TGrtcOOOOzP9xCuQa5PPuYdAAviitCqWi4oSsUThdCcueWUqsca0ay0Xi+9CiRL5K2Fa7pvNNa9-bE4mmjcJLdJbYNrsr3avvexjKgJzOQ5XBywZ3P4jxhDOFBzguhaFiumTrokCRKtUjhgrk0qNNEJ5lmelBwBc2A0JAAAieg-ja0iyA6qinh2FAERwRGkeR1oDr6LIBq4o5eCGE7gc8hYULE0SRAejh5jkcLrpKiQUIk8QSbkimOLkSHxLkOHOnhDGwIRtAsXQFGTPe+JNkSJJkrh9GMcxEBkUZbE+gBE4jpyvGgXyU5hEm8kSvm8SKTBXzrlk+ZVKJEpgpKmTAlp7aGrZBn2ax9amY+zbEq2dGJXpTHJQ5WDGc5fquWywFjnxYHhs8jiKnG8QRKkdXpPGM7riqdWghh4SSrUcQZK0CLEFIEBwIEOU9CBoYCQuMQJI4EQRNEESxOKkTROupSrUKvxNcCjVQgWXzxW+57GvsIzTfxNVxlEFQ-JqMLigpW1qa8R7SotETfeqKSneWnYXZida3lA13Vd5CCqo4bz5DDiTPUk8TrnkwlFsuiYLgWinpADOlunsIM8DgjD4JMENecEiCI7DSFhdqSTLYkSYdQeFCBb8qpZE1PORvCerafRhMYnSPBkFIWBjRAlOTtTCBpJmy0ibG8MY4hsNQtkR5QvkB348LH6Xp63CywJKogtqLNLZkjSJpK66KfEcPShESGQk0arHgik3ne6X43r+Zu3Yk0TCX1NtzsCEn-GmG5yd8cbqhJc5wd7gsJe+F49lipM0OTYjB1DofO3kGluy8GShCjcfLnJyS2wu8aM1kBuGiLxvXiYEtS5ARfy2kiqFqHPM5NU+6x4Ca1CoWmqxizi0Hq3PvWbl+nESldD908KqvHEilLSta0zst65qiCQWJmFvxFqtbfbElG+FcV4OVZ5cs74j80H8tq3rafcc9xCjnIjJCzNGqBXvjoR+hkip5wLq-DyM0aorRBC9cIa1q7JmUh1I63V3r5Fkn9KB+E8p2Wfj3aW29EB2zhitZMjUmiBVlIA-cbxQhxm1GhcIqoIhDWaEAA */
  createMachine<DatasetsSummaryPanelContext, DatasetSummaryPanelEvent, DatasetsSummaryPanelState>(
    {
      context: initialContext,
      predictableActionArguments: true,
      id: 'DatasetsQualitySummaryPanel',
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
        storeDatasetsQuality: assign((_context, event) =>
          'data' in event ? { datasetsQuality: event.data as DatasetsQuality } : {}
        ),
        storeDatasetsActivity: assign((_context, event) =>
          'data' in event ? { datasetsActivity: event.data as DatasetsActivityDetails } : {}
        ),
        storeEstimatedData: assign((_context, event) =>
          'data' in event
            ? {
                estimatedData: event.data as EstimatedDataDetails,
              }
            : {}
        ),
        incrementDatasetsQualityRetries: assign(({ retries }, _event) => ({
          retries: { ...retries, datasetsQualityRetries: retries.datasetsQualityRetries + 1 },
        })),
        incrementDatasetsActivityRetries: assign(({ retries }, _event) => ({
          retries: { ...retries, datasetsActivityRetries: retries.datasetsActivityRetries + 1 },
        })),
        incrementEstimatedDataRetries: assign(({ retries }, _event) => ({
          retries: { ...retries, estimatedDataRetries: retries.estimatedDataRetries + 1 },
        })),
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
        const { dataStreamStats } = await dataStreamStatsClient.getDataStreamsStats();
        const activeDataStreams = filterInactiveDatasets({ datasets: dataStreamStats });
        return {
          total: dataStreamStats.length,
          active: activeDataStreams.length,
        };
      },
      loadEstimatedData: async (_context) => {
        const { startDate, endDate } = getDateISORange(DEFAULT_TIME_RANGE);
        return dataStreamStatsClient.getDataStreamsEstimatedDataInBytes({
          query: {
            type: 'logs',
            start: startDate,
            end: endDate,
          },
        });
      },
    },
  });

export type DatasetsSummaryPanelStateService = InterpreterFrom<
  typeof createDatasetsSummaryPanelStateMachine
>;

export type DatasetsSummaryPanelStateMachine = ReturnType<
  typeof createDatasetsSummaryPanelStateMachine
>;
