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
  FailedDocsDetails,
  FailedDocsErrors,
  NonAggregatableDatasets,
  QualityIssue,
  UpdateFieldLimitResponse,
} from '../../../common/api_types';
import { fetchNonAggregatableDatasetsFailedNotifier } from '../common/notifications';
import {
  fetchDataStreamDetailsFailedNotifier,
  assertBreakdownFieldEcsFailedNotifier,
  fetchDataStreamSettingsFailedNotifier,
  fetchDataStreamIntegrationFailedNotifier,
  fetchIntegrationDashboardsFailedNotifier,
  updateFieldLimitFailedNotifier,
  rolloverDataStreamFailedNotifier,
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
                    QUALITY_ISSUES_CHART_CHANGE: {
                      target: 'done',
                      actions: ['storeQualityIssuesChart'],
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
                    dataStreamFailedDocs: {
                      initial: 'fetching',
                      states: {
                        fetching: {
                          invoke: {
                            src: 'loadFailedDocsDetails',
                            onDone: {
                              target: 'done',
                              actions: ['storeFailedDocsDetails', 'raiseDegradedFieldsLoaded'],
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
                            UPDATE_DEGRADED_FIELDS_TABLE_CRITERIA: {
                              target: 'done',
                              actions: ['storeDegradedFieldTableOptions'],
                            },
                          },
                        },
                      },
                    },
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
                            UPDATE_DEGRADED_FIELDS_TABLE_CRITERIA: {
                              target: 'done',
                              actions: ['storeDegradedFieldTableOptions'],
                            },
                            OPEN_DEGRADED_FIELD_FLYOUT: {
                              target:
                                '#DatasetQualityDetailsController.initializing.degradedFieldFlyout.open',
                              actions: [
                                'storeExpandedDegradedField',
                                'resetFieldLimitServerResponse',
                              ],
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
                  initial: 'initializing',
                  states: {
                    initializing: {
                      always: [
                        {
                          target:
                            '#DatasetQualityDetailsController.initializing.degradedFieldFlyout.open.degradedFieldFlyout',
                          cond: 'isDegradedFieldFlyout',
                        },
                        {
                          target:
                            '#DatasetQualityDetailsController.initializing.degradedFieldFlyout.open.failedDocsFlyout',
                        },
                      ],
                    },
                    degradedFieldFlyout: {
                      initial: 'initialized',
                      states: {
                        initialized: {
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
                            mitigation: {
                              initial: 'analyzing',
                              states: {
                                analyzing: {
                                  invoke: {
                                    src: 'analyzeDegradedField',
                                    onDone: {
                                      target: 'analyzed',
                                      actions: ['storeDegradedFieldAnalysis'],
                                    },
                                    onError: {
                                      target: 'analyzed',
                                    },
                                  },
                                },
                                analyzed: {
                                  on: {
                                    SET_NEW_FIELD_LIMIT: {
                                      target: 'mitigating',
                                      actions: 'storeNewFieldLimit',
                                    },
                                  },
                                },
                                mitigating: {
                                  invoke: {
                                    src: 'saveNewFieldLimit',
                                    onDone: [
                                      {
                                        target: 'askingForRollover',
                                        actions: 'storeNewFieldLimitResponse',
                                        cond: 'hasFailedToUpdateLastBackingIndex',
                                      },
                                      {
                                        target: 'success',
                                        actions: 'storeNewFieldLimitResponse',
                                      },
                                    ],
                                    onError: {
                                      target: 'error',
                                      actions: [
                                        'storeNewFieldLimitErrorResponse',
                                        'notifySaveNewFieldLimitError',
                                      ],
                                    },
                                  },
                                },
                                askingForRollover: {
                                  on: {
                                    ROLLOVER_DATA_STREAM: {
                                      target: 'rollingOver',
                                    },
                                  },
                                },
                                rollingOver: {
                                  invoke: {
                                    src: 'rolloverDataStream',
                                    onDone: {
                                      target: 'success',
                                      actions: ['raiseForceTimeRangeRefresh'],
                                    },
                                    onError: {
                                      target: 'error',
                                      actions: 'notifySaveNewFieldLimitError',
                                    },
                                  },
                                },
                                success: {},
                                error: {},
                              },
                            },
                          },
                        },
                      },
                    },
                    failedDocsFlyout: {
                      initial: 'initialized',
                      states: {
                        initialized: {
                          type: 'parallel',
                          states: {
                            failedDocsErrors: {
                              initial: 'fetching',
                              states: {
                                fetching: {
                                  invoke: {
                                    src: 'loadfailedDocsErrors',
                                    onDone: {
                                      target: 'done',
                                      actions: ['storefailedDocsErrors'],
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
                          },
                        },
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
        storeQualityIssuesChart: assign((_context, event) => {
          return 'qualityIssuesChart' in event
            ? { qualityIssuesChart: event.qualityIssuesChart }
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
        storeFailedDocsDetails: assign((context, event: DoneInvokeEvent<FailedDocsDetails>) => {
          return 'data' in event
            ? {
                degradedFields: {
                  ...context.degradedFields,
                  data: [
                    ...(context.degradedFields.data ?? []).filter(
                      (field) => field.type !== 'failed'
                    ),
                    ...(event.data.timeSeries.length > 0
                      ? [
                          {
                            ...event.data,
                            name: 'failedDocs',
                            type: 'failed',
                          },
                        ]
                      : []),
                  ],
                },
              }
            : {};
        }),
        storefailedDocsErrors: assign((context, event: DoneInvokeEvent<FailedDocsErrors>) => {
          return 'data' in event
            ? {
                failedDocsErrors: {
                  ...context.failedDocsErrors,
                  data: event.data.errors,
                },
              }
            : {};
        }),
        storeDegradedFields: assign((context, event: DoneInvokeEvent<DegradedFieldResponse>) => {
          return 'data' in event
            ? {
                degradedFields: {
                  ...context.degradedFields,
                  data: [
                    ...(context.degradedFields.data ?? []).filter(
                      (field) => field.type !== 'degraded'
                    ),
                    ...(event.data.degradedFields.map((field) => ({
                      ...field,
                      type: 'degraded',
                    })) as QualityIssue[]),
                  ],
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
            expandedQualityIssue:
              'qualityIssue' in event
                ? { name: event.qualityIssue.name, type: event.qualityIssue.type }
                : undefined,
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
        storeNewFieldLimit: assign((_, event) => {
          return 'newFieldLimit' in event
            ? { fieldLimit: { newFieldLimit: event.newFieldLimit } }
            : {};
        }),
        storeNewFieldLimitResponse: assign(
          (context, event: DoneInvokeEvent<UpdateFieldLimitResponse>) => {
            return 'data' in event
              ? { fieldLimit: { ...context.fieldLimit, result: event.data, error: false } }
              : {};
          }
        ),
        storeNewFieldLimitErrorResponse: assign((context) => {
          return { fieldLimit: { ...context.fieldLimit, error: true } };
        }),
        resetFieldLimitServerResponse: assign(() => ({
          fieldLimit: undefined,
        })),
        raiseForceTimeRangeRefresh: raise('UPDATE_TIME_RANGE'),
      },
      guards: {
        checkIfActionForbidden: (_, event) => {
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
            Boolean(context.expandedQualityIssue) &&
            Boolean(
              context.degradedFields.data?.some(
                (field) => field.name === context.expandedQualityIssue?.name
              )
            )
          );
        },
        isDegradedFieldFlyout: (context) => {
          return Boolean(context.expandedQualityIssue?.type === 'degraded');
        },
        hasNoDegradedFieldsSelected: (context) => {
          return !Boolean(context.expandedQualityIssue);
        },
        hasFailedToUpdateLastBackingIndex: (_, event) => {
          return (
            'data' in event &&
            typeof event.data === 'object' &&
            'isLatestBackingIndexUpdated' in event.data &&
            !event.data.isLatestBackingIndexUpdated
          );
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
      notifySaveNewFieldLimitError: (_context, event: DoneInvokeEvent<Error>) =>
        updateFieldLimitFailedNotifier(toasts, event.data),
      notifyRolloverDataStreamError: (context, event: DoneInvokeEvent<Error>) =>
        rolloverDataStreamFailedNotifier(toasts, event.data, context.dataStream),
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
      loadFailedDocsDetails: (context) => {
        const { startDate: start, endDate: end } = getDateISORange(context.timeRange);

        return dataStreamDetailsClient.getFailedDocsDetails({
          dataStream: context.dataStream,
          start,
          end,
        });
      },
      loadDegradedFields: (context) => {
        const { startDate: start, endDate: end } = getDateISORange(context.timeRange);

        if (!context?.isNonAggregatable) {
          return dataStreamDetailsClient.getDataStreamDegradedFields({
            dataStream:
              context.showCurrentQualityIssues &&
              'dataStreamSettings' in context &&
              context.dataStreamSettings &&
              context.dataStreamSettings.lastBackingIndexName
                ? context.dataStreamSettings.lastBackingIndexName
                : context.dataStream,
            start,
            end,
          });
        }

        return Promise.resolve();
      },

      loadDegradedFieldValues: (context) => {
        if ('expandedQualityIssue' in context && context.expandedQualityIssue) {
          return dataStreamDetailsClient.getDataStreamDegradedFieldValues({
            dataStream: context.dataStream,
            degradedField: context.expandedQualityIssue.name,
          });
        }
        return Promise.resolve();
      },
      analyzeDegradedField: (context) => {
        if (context?.degradedFields?.data?.length) {
          const selectedDegradedField = context.degradedFields.data.find(
            (field) => field.name === context.expandedQualityIssue?.name
          );

          if (selectedDegradedField && selectedDegradedField.type === 'degraded') {
            return dataStreamDetailsClient.analyzeDegradedField({
              dataStream: context.dataStream,
              degradedField: context.expandedQualityIssue?.name!,
              lastBackingIndex: selectedDegradedField.indexFieldWasLastPresentIn!,
            });
          }
        }
        return Promise.resolve();
      },
      loadfailedDocsErrors: (context) => {
        if ('expandedQualityIssue' in context && context.expandedQualityIssue) {
          const { startDate: start, endDate: end } = getDateISORange(context.timeRange);

          return dataStreamDetailsClient.getFailedDocsErrors({
            dataStream: context.dataStream,
            start,
            end,
          });
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
      saveNewFieldLimit: (context) => {
        if ('fieldLimit' in context && context.fieldLimit && context.fieldLimit.newFieldLimit) {
          return dataStreamDetailsClient.setNewFieldLimit({
            dataStream: context.dataStream,
            newFieldLimit: context.fieldLimit.newFieldLimit,
          });
        }

        return Promise.resolve();
      },
      rolloverDataStream: (context) => {
        return dataStreamDetailsClient.rolloverDataStream({
          dataStream: context.dataStream,
        });
      },
    },
  });

export type DatasetQualityDetailsControllerStateService = InterpreterFrom<
  typeof createDatasetQualityDetailsControllerStateMachine
>;
