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
import { DEFAULT_CONTEXT } from './defaults';
import {
  DatasetsActivityDetails,
  DatasetsQuality,
  DatasetsSummaryPanelContext,
  DatasetsSummaryPanelState,
  DatasetSummaryPanelEvent,
  DefaultDatasetsSummaryPanelContext,
  EstimatedDataDetails,
} from './types';
import {
  fetchDatasetsEstimatedDataFailedNotifier,
  fetchDatasetsActivityFailedNotifier,
  fetchDatasetsQualityFailedNotifier,
} from './notifications';

export const createPureDatasetsSummaryPanelStateMachine = (
  initialContext: DatasetsSummaryPanelContext
) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QGUCuBbdBDATgTwAUsA7MAGwDoIsAXLWMG2ARVSzIEsa8KAzRgMYALDsSgBiCAHtSFUQDcpAazAU0mXIRLkqteoxZtO3PoJFiECqQNocZAbQAMAXSfPEoAA5TYXO8Q8QAA9EAGYAJgB2CnCADgA2ABZk+MjwgEYI8IAaEDxEAFZQ+IpI9McATljYioL48NDQgF8m3PVsfCJSSmo6BiZWdi4efhphUQkwHBwpHApPMlpeWfQ1DA6tbt0+g0HjEbMJy2JFGxp-NzdA719zmUCQhAjouKSUtMzwnLzEZMSKRLxUIFWLpCoVSKOGrFFptdaaLo6Xr6JgAQQE53kw1MY3MEmksisKjWGk62h6en6sHRmOxo3GFisZwuLiuSBANz893Zj0ajgoBXSdXKiUckQKkSSBVy+QQsVC-IKr3iNSKmUcBVhIHaCPJ2xR1IxHCxJnpePEUxmcwWSxWJI2iIpOzRRpNB1xRyZtgcrJc1x8XICPLCCoFQviIrFEqlMsQkVCsRioPCEfBoSqKq1OrJWzg52wNEgABE9DiGfiZKoiaps5sdHmOAXi6WzZ6TtZvcRLn72Zy7kHQLyohQwWrU7FHKF0pFYwh0ulEulSg15+nHBrHIlYln4Tn67B87Rm3Qy+bLbN5osaMscKta46KA2mxASyfW4z28yfa4e14A-2HjCYdRyncdJ2nWcRQqAFxUheIKkXYpMhaVoQGIKQIDgQJ73Jf1bn8QCEAAWnCRJZxTaDQUiMoCgKcEgQqUJIh3Uk6ydA09mGPDA0I0jZ2BaIF0cIEong2JEghFiHT1ZEqU401DjEbiAODBA0lnRI6goeICkQ8opwqL5t1QnCtlk3YjGxMgpCwTCIGUgjVLoxNdIQ9N5xBNUNPjChKijeCJLiOjNRM3c2P1KkaWNLje3-RzB0QPifgQHT+VqeV0lE1JEjKKTdTMykDCit1TwmBzuQStTvllcV+Ry9JQXKOJYnCSc8r3djItdKybLs8qB2CRB4k3CgKhVFUqIKMVIjI5LJRKCooUSYoEIjeUQrhViHyfI8Xz0frCKnGJIgSLdQOG9JUmlZKxvCEclVgrclUM5pQq2vUdsLPa30UqADtUyJoKiU6MviC6VUg4SlzB+paIhVNkna8LPuPLAKGs2zIH+yq6KXKIoXAwVAUlSGTpHRxmoaxjaMBlCmiAA */
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
                onError: {
                  target: 'loaded',
                  actions: ['notifyFetchDatasetsQualityFailed'],
                },
              },
            },
            loaded: {},
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
                onError: {
                  target: 'loaded',
                  actions: ['notifyFetchDatasetsActivityFailed'],
                },
              },
            },
            loaded: {},
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
                onError: {
                  target: 'loaded',
                  actions: ['notifyFetchEstimatedDataFailed'],
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
      },
    }
  );

export interface DatasetsSummaryPanelStateMachineDependencies {
  initialContext?: DefaultDatasetsSummaryPanelContext;
  toasts: IToasts;
  dataStreamStatsClient: IDataStreamsStatsClient;
}

export const createDatasetsSummaryPanelStateMachine = ({
  initialContext = DEFAULT_CONTEXT,
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
