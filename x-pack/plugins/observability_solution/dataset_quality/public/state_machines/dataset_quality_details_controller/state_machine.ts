/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assign, createMachine, DoneInvokeEvent, InterpreterFrom, raise } from 'xstate';
import { getDateISORange } from '@kbn/timerange';
import type { IToasts } from '@kbn/core-notifications-browser';
import {
  DatasetQualityDetailsControllerContext,
  DatasetQualityDetailsControllerEvent,
  DatasetQualityDetailsControllerTypeState,
} from './types';
import { DatasetQualityStartDeps } from '../../types';
import { IDataStreamsStatsClient } from '../../services/data_streams_stats';
import { IDataStreamDetailsClient } from '../../services/data_stream_details';
import { indexNameToDataStreamParts } from '../../../common/utils';
import {
  Dashboard,
  DataStreamDetails,
  DataStreamSettings,
  DegradedFieldAnalysis,
  DegradedFieldResponse,
  DegradedFieldValues,
  NonAggregatableDatasets,
} from '../../../common/api_types';
import { fetchNonAggregatableDatasetsFailedNotifier } from '../common/notifications';
import {
  fetchDataStreamDetailsFailedNotifier,
  assertBreakdownFieldEcsFailedNotifier,
  fetchDataStreamSettingsFailedNotifier,
  fetchDataStreamIntegrationFailedNotifier,
  fetchIntegrationDashboardsFailedNotifier,
} from './notifications';
import { Integration } from '../../../common/data_streams_stats/integration';

export const createPureDatasetQualityDetailsControllerStateMachine = (
  initialContext: DatasetQualityDetailsControllerContext
) =>
  createMachine<
    DatasetQualityDetailsControllerContext,
    DatasetQualityDetailsControllerEvent,
    DatasetQualityDetailsControllerTypeState
  >(
    {
      id: 'DatasetQualityDetailsController',
      context: initialContext,
      predictableActionArguments: true,
      initial: 'initializing',
      states: {
        initializing: {
          type: 'parallel',
          states: {
            nonAggregatableDataset: {
              initial: 'fetching',
              states: {
                fetching: {
                  invoke: {
                    src: 'checkDatasetIsAggregatable',
                    onDone: {
                      target: 'done',
                      actions: ['storeDatasetAggregatableStatus'],
                    },
                    onError: [
                      {
                        target: '#DatasetQualityDetailsController.indexNotFound',
                        cond: 'isIndexNotFoundError',
                      },
                      {
                        target: 'done',
                        actions: ['notifyFailedFetchForAggregatableDatasets'],
                      },
                    ],
                  },
                },
                done: {
                  on: {
                    UPDATE_TIME_RANGE: {
                      target: 'fetching',
                      actions: ['storeTimeRange'],
                    },
                  },
                },
              },
            },
            dataStreamDetails: {
              initial: 'fetching',
              states: {
                fetching: {
                  invoke: {
                    src: 'loadDataStreamDetails',
                    onDone: {
                      target: 'done',
                      actions: ['storeDataStreamDetails'],
                    },
                    onError: [
                      {
                        target: '#DatasetQualityDetailsController.indexNotFound',
                        cond: 'isIndexNotFoundError',
                      },
                      {
                        target: 'done',
                        actions: ['notifyFetchDataStreamDetailsFailed'],
                      },
                    ],
                  },
                },
                done: {
                  on: {
                    UPDATE_TIME_RANGE: {
                      target: 'fetching',
                      actions: ['storeTimeRange'],
                    },
                    BREAKDOWN_FIELD_CHANGE: {
                      target:
                        '#DatasetQualityDetailsController.initializing.checkBreakdownFieldIsEcs.fetching',
                      actions: ['storeBreakDownField'],
                    },
                  },
                },
              },
            },
            checkBreakdownFieldIsEcs: {
              initial: 'fetching',
              states: {
                fetching: {
                  invoke: {
                    src: 'checkBreakdownFieldIsEcs',
                    onDone: {
                      target: 'done',
                      actions: ['storeBreakdownFieldEcsStatus'],
                    },
                    onError: {
                      target: 'done',
                      actions: ['notifyCheckBreakdownFieldIsEcsFailed'],
                    },
                  },
                },
                done: {},
              },
            },
            dataStreamSettings: {
              initial: 'fetchingDataStreamSettings',
              states: {
                fetchingDataStreamSettings: {
                  invoke: {
                    src: 'loadDataStreamSettings',
                    onDone: {
                      target: 'loadingIntegrationsAndDegradedFields',
                      actions: ['storeDataStreamSettings'],
                    },
                    onError: [
                      {
                        target: '#DatasetQualityDetailsController.indexNotFound',
                        cond: 'isIndexNotFoundError',
                      },
                      {
                        target: 'done',
                        actions: ['notifyFetchDataStreamSettingsFailed'],
                      },
                    ],
                  },
                },
                loadingIntegrationsAndDegradedFields: {
                  type: 'parallel',
                  states: {
                    dataStreamDegradedFields: {
                      initial: 'fetching',
                      states: {
                        fetching: {
                          invoke: {
                            src: 'loadDegradedFields',
                            onDone: {
                              target: 'done',
                              actions: ['storeDegradedFields', 'raiseDegradedFieldsLoaded'],
                            },
                            onError: [
                              {
                                target: '#DatasetQualityDetailsController.indexNotFound',
                                cond: 'isIndexNotFoundError',
                              },
                              {
                                target: 'done',
                              },
                            ],
                          },
                        },
                        done: {
                          on: {
                            UPDATE_TIME_RANGE: {
                              target: 'fetching',
                              actions: ['resetDegradedFieldPageAndRowsPerPage'],
                            },
                            UPDATE_DEGRADED_FIELDS_TABLE_CRITERIA: {
                              target: 'done',
                              actions: ['storeDegradedFieldTableOptions'],
                            },
                            OPEN_DEGRADED_FIELD_FLYOUT: {
                              target:
                                '#DatasetQualityDetailsController.initializing.degradedFieldFlyout.open',
                              actions: ['storeExpandedDegradedField'],
                            },
                            TOGGLE_CURRENT_QUALITY_ISSUES: {
                              target: 'fetching',
                              actions: ['toggleCurrentQualityIssues'],
                            },
                          },
                        },
                      },
                    },
                    integrationDetails: {
                      initial: 'fetching',
                      states: {
                        fetching: {
                          invoke: {
                            src: 'loadDataStreamIntegration',
                            onDone: {
                              target: 'done',
                              actions: ['storeDataStreamIntegration'],
                            },
                            onError: {
                              target: 'done',
                              actions: ['notifyFetchDatasetIntegrationsFailed'],
                            },
                          },
                        },
                        done: {},
                      },
                    },
                    integrationDashboards: {
                      initial: 'fetching',
                      states: {
                        fetching: {
                          invoke: {
                            src: 'loadIntegrationDashboards',
                            onDone: {
                              target: 'done',
                              actions: ['storeIntegrationDashboards'],
                            },
                            onError: [
                              {
                                target: 'unauthorized',
                                cond: 'checkIfActionForbidden',
                              },
                              {
                                target: 'done',
                                actions: ['notifyFetchIntegrationDashboardsFailed'],
                              },
                            ],
                          },
                        },
                        done: {},
                        unauthorized: {
                          type: 'final',
                        },
                      },
                    },
                  },
                  onDone: {
                    target: 'done',
                  },
                },
                done: {},
              },
              on: {
                UPDATE_TIME_RANGE: {
                  target: '.fetchingDataStreamSettings',
                },
              },
            },
            degradedFieldFlyout: {
              initial: 'pending',
              states: {
                pending: {
                  always: [
                    {
                      target: 'closed',
                      cond: 'hasNoDegradedFieldsSelected',
                    },
                  ],
                },
                open: {
                  type: 'parallel',
                  states: {
                    ignoredValues: {
                      initial: 'fetching',
                      states: {
                        fetching: {
                          invoke: {
                            src: 'loadDegradedFieldValues',
                            onDone: {
                              target: 'done',
                              actions: ['storeDegradedFieldValues'],
                            },
                            onError: [
                              {
                                target: '#DatasetQualityDetailsController.indexNotFound',
                                cond: 'isIndexNotFoundError',
                              },
                              {
                                target: 'done',
                              },
                            ],
                          },
                        },
                        done: {},
                      },
                    },
                    analyze: {
                      initial: 'fetching',
                      states: {
                        fetching: {
                          invoke: {
                            src: 'analyzeDegradedField',
                            onDone: {
                              target: 'done',
                              actions: ['storeDegradedFieldAnalysis'],
                            },
                            onError: {
                              target: 'done',
                            },
                          },
                        },
                        done: {},
                      },
                    },
                  },
                  on: {
                    CLOSE_DEGRADED_FIELD_FLYOUT: {
                      target: 'closed',
                      actions: ['storeExpandedDegradedField'],
                    },
                    UPDATE_TIME_RANGE: {
                      target:
                        '#DatasetQualityDetailsController.initializing.degradedFieldFlyout.open',
                    },
                  },
                },
                closed: {
                  on: {
                    OPEN_DEGRADED_FIELD_FLYOUT: {
                      target:
                        '#DatasetQualityDetailsController.initializing.degradedFieldFlyout.open',
                      actions: ['storeExpandedDegradedField'],
                    },
                  },
                },
              },
              on: {
                DEGRADED_FIELDS_LOADED: [
                  {
                    target: '.open',
                    cond: 'shouldOpenFlyout',
                  },
                  {
                    target: '.closed',
                    actions: ['storeExpandedDegradedField'],
                  },
                ],
              },
            },
          },
        },
        indexNotFound: {
          entry: 'handleIndexNotFoundError',
        },
      },
    },
    {
      actions: {
        storeDatasetAggregatableStatus: assign(
          (_context, event: DoneInvokeEvent<NonAggregatableDatasets>) => {
            return 'data' in event
              ? {
                  isNonAggregatable: !event.data.aggregatable,
                }
              : {};
          }
        ),
        storeTimeRange: assign((context, event) => {
          return {
            timeRange: 'timeRange' in event ? event.timeRange : context.timeRange,
          };
        }),
        storeDataStreamDetails: assign((_context, event: DoneInvokeEvent<DataStreamDetails>) => {
          return 'data' in event
            ? {
                dataStreamDetails: event.data,
              }
            : {};
        }),
        storeBreakDownField: assign((_context, event) => {
          return 'breakdownField' in event ? { breakdownField: event.breakdownField } : {};
        }),
        storeBreakdownFieldEcsStatus: assign((_context, event: DoneInvokeEvent<boolean>) => {
          return 'data' in event
            ? {
                isBreakdownFieldEcs: event.data,
              }
            : {};
        }),
        storeDegradedFields: assign((context, event: DoneInvokeEvent<DegradedFieldResponse>) => {
          return 'data' in event
            ? {
                degradedFields: {
                  ...context.degradedFields,
                  data: event.data.degradedFields,
                },
              }
            : {};
        }),
        storeDegradedFieldValues: assign((_, event: DoneInvokeEvent<DegradedFieldValues>) => {
          return 'data' in event
            ? {
                degradedFieldValues: event.data,
              }
            : {};
        }),
        storeDegradedFieldAnalysis: assign((_, event: DoneInvokeEvent<DegradedFieldAnalysis>) => {
          return 'data' in event
            ? {
                degradedFieldAnalysis: event.data,
              }
            : {};
        }),
        storeDegradedFieldTableOptions: assign((context, event) => {
          return 'degraded_field_criteria' in event
            ? {
                degradedFields: {
                  ...context.degradedFields,
                  table: event.degraded_field_criteria,
                },
              }
            : {};
        }),
        storeExpandedDegradedField: assign((_, event) => {
          return {
            expandedDegradedField: 'fieldName' in event ? event.fieldName : undefined,
          };
        }),
        toggleCurrentQualityIssues: assign((context) => {
          return {
            showCurrentQualityIssues: !context.showCurrentQualityIssues,
          };
        }),
        raiseDegradedFieldsLoaded: raise('DEGRADED_FIELDS_LOADED'),
        resetDegradedFieldPageAndRowsPerPage: assign((context, _event) => ({
          degradedFields: {
            ...context.degradedFields,
            table: {
              ...context.degradedFields.table,
              page: 0,
              rowsPerPage: 10,
            },
          },
        })),
        storeDataStreamSettings: assign((_context, event: DoneInvokeEvent<DataStreamSettings>) => {
          return 'data' in event
            ? {
                dataStreamSettings: event.data,
              }
            : {};
        }),
        storeDataStreamIntegration: assign((context, event: DoneInvokeEvent<Integration>) => {
          return 'data' in event
            ? {
                integration: event.data,
              }
            : {};
        }),
        storeIntegrationDashboards: assign((context, event: DoneInvokeEvent<Dashboard[]>) => {
          return 'data' in event
            ? {
                integrationDashboards: event.data,
              }
            : {};
        }),
        handleIndexNotFoundError: assign(() => {
          return {
            isIndexNotFoundError: true,
          };
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
        isIndexNotFoundError: (_, event) => {
          return (
            ('data' in event &&
              typeof event.data === 'object' &&
              'statusCode' in event.data &&
              event.data.statusCode === 500 &&
              'originalMessage' in event.data &&
              (event.data.originalMessage as string)?.includes('index_not_found_exception')) ??
            false
          );
        },
        shouldOpenFlyout: (context) => {
          return (
            Boolean(context.expandedDegradedField) &&
            Boolean(
              context.degradedFields.data?.some(
                (field) => field.name === context.expandedDegradedField
              )
            )
          );
        },
        hasNoDegradedFieldsSelected: (context) => {
          return !Boolean(context.expandedDegradedField);
        },
      },
    }
  );

export interface DatasetQualityDetailsControllerStateMachineDependencies {
  initialContext: DatasetQualityDetailsControllerContext;
  plugins: DatasetQualityStartDeps;
  toasts: IToasts;
  dataStreamStatsClient: IDataStreamsStatsClient;
  dataStreamDetailsClient: IDataStreamDetailsClient;
}

export const createDatasetQualityDetailsControllerStateMachine = ({
  initialContext,
  plugins,
  toasts,
  dataStreamStatsClient,
  dataStreamDetailsClient,
}: DatasetQualityDetailsControllerStateMachineDependencies) =>
  createPureDatasetQualityDetailsControllerStateMachine(initialContext).withConfig({
    actions: {
      notifyFailedFetchForAggregatableDatasets: (_context, event: DoneInvokeEvent<Error>) =>
        fetchNonAggregatableDatasetsFailedNotifier(toasts, event.data),
      notifyFetchDataStreamDetailsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDataStreamDetailsFailedNotifier(toasts, event.data),
      notifyCheckBreakdownFieldIsEcsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        assertBreakdownFieldEcsFailedNotifier(toasts, event.data),
      notifyFetchDataStreamSettingsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchDataStreamSettingsFailedNotifier(toasts, event.data),
      notifyFetchIntegrationDashboardsFailed: (_context, event: DoneInvokeEvent<Error>) =>
        fetchIntegrationDashboardsFailedNotifier(toasts, event.data),
      notifyFetchDatasetIntegrationsFailed: (context, event: DoneInvokeEvent<Error>) => {
        const integrationName =
          'dataStreamSettings' in context ? context.dataStreamSettings?.integration : undefined;
        return fetchDataStreamIntegrationFailedNotifier(toasts, event.data, integrationName);
      },
    },
    services: {
      checkDatasetIsAggregatable: (context) => {
        const { type } = indexNameToDataStreamParts(context.dataStream);
        const { startDate: start, endDate: end } = getDateISORange(context.timeRange);

        return dataStreamStatsClient.getNonAggregatableDatasets({
          types: [type],
          start,
          end,
          dataStream: context.dataStream,
        });
      },
      loadDataStreamDetails: (context) => {
        const { startDate: start, endDate: end } = getDateISORange(context.timeRange);

        return dataStreamDetailsClient.getDataStreamDetails({
          dataStream: context.dataStream,
          start,
          end,
        });
      },
      checkBreakdownFieldIsEcs: async (context) => {
        if (context.breakdownField) {
          const allowedFieldSources = ['ecs', 'metadata'];

          // This timeout is to avoid a runtime error that randomly happens on breakdown field change
          // TypeError: Cannot read properties of undefined (reading 'timeFieldName')
          await new Promise((res) => setTimeout(res, 300));

          const client = await plugins.fieldsMetadata.getClient();
          const { fields } = await client.find({
            attributes: ['source'],
            fieldNames: [context.breakdownField],
          });

          const breakdownFieldSource = fields[context.breakdownField]?.source;

          return !!(breakdownFieldSource && allowedFieldSources.includes(breakdownFieldSource));
        }

        return false;
      },
      loadDegradedFields: (context) => {
        const { startDate: start, endDate: end } = getDateISORange(context.timeRange);

        if (context?.isNonAggregatable) {
          return dataStreamDetailsClient.getDataStreamDegradedFields({
            dataStream:
              context.showCurrentQualityIssues &&
              'dataStreamSettings' in context &&
              context.dataStreamSettings
                ? context.dataStreamSettings.lastBackingIndexName
                : context.dataStream,
            start,
            end,
          });
        }

        return Promise.resolve();
      },

      loadDegradedFieldValues: (context) => {
        if ('expandedDegradedField' in context && context.expandedDegradedField) {
          return dataStreamDetailsClient.getDataStreamDegradedFieldValues({
            dataStream: context.dataStream,
            degradedField: context.expandedDegradedField,
          });
        }
        return Promise.resolve();
      },
      analyzeDegradedField: (context) => {
        if (context?.degradedFields?.data?.length) {
          const selectedDegradedField = context.degradedFields.data.find(
            (field) => field.name === context.expandedDegradedField
          );

          if (selectedDegradedField) {
            return dataStreamDetailsClient.analyzeDegradedField({
              dataStream: context.dataStream,
              degradedField: context.expandedDegradedField!,
              lastBackingIndex: selectedDegradedField.indexFieldWasLastPresentIn,
            });
          }
        }
        return Promise.resolve();
      },
      loadDataStreamSettings: (context) => {
        return dataStreamDetailsClient.getDataStreamSettings({
          dataStream: context.dataStream,
        });
      },
      loadDataStreamIntegration: (context) => {
        if ('dataStreamSettings' in context && context.dataStreamSettings?.integration) {
          return dataStreamDetailsClient.getDataStreamIntegration({
            integrationName: context.dataStreamSettings.integration,
          });
        }
        return Promise.resolve();
      },
      loadIntegrationDashboards: (context) => {
        if ('dataStreamSettings' in context && context.dataStreamSettings?.integration) {
          return dataStreamDetailsClient.getIntegrationDashboards({
            integration: context.dataStreamSettings.integration,
          });
        }

        return Promise.resolve();
      },
    },
  });

export type DatasetQualityDetailsControllerStateService = InterpreterFrom<
  typeof createDatasetQualityDetailsControllerStateMachine
>;
