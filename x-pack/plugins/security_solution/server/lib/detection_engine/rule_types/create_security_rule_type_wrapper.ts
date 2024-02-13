/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import agent from 'elastic-apm-node';

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { createPersistenceRuleTypeWrapper } from '@kbn/rule-registry-plugin/server';
import type { DataViewFieldBase } from '@kbn/es-query';
import { buildExceptionFilter } from '@kbn/lists-plugin/server/services/exception_lists';
import { technicalRuleFieldMap } from '@kbn/rule-registry-plugin/common/assets/field_maps/technical_rule_field_map';
import type { FieldMap } from '@kbn/alerts-as-data-utils';
import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';
import { getIndexListFromEsqlQuery } from '@kbn/securitysolution-utils';
import type { FormatAlert } from '@kbn/alerting-plugin/server/types';
import {
  checkPrivilegesFromEsClient,
  getExceptions,
  getRuleRangeTuples,
  hasReadIndexPrivileges,
  hasTimestampFields,
  isMachineLearningParams,
  isEsqlParams,
} from './utils/utils';
import { DEFAULT_MAX_SIGNALS, DEFAULT_SEARCH_AFTER_PAGE_SIZE } from '../../../../common/constants';
import type { CreateSecurityRuleTypeWrapper } from './types';
import { getListClient } from './utils/get_list_client';
// eslint-disable-next-line no-restricted-imports
import { getNotificationResultsLink } from '../rule_actions_legacy';
// eslint-disable-next-line no-restricted-imports
import { formatAlertForNotificationActions } from '../rule_actions_legacy/logic/notifications/schedule_notification_actions';
import { createResultObject } from './utils';
import { bulkCreateFactory, wrapHitsFactory, wrapSequencesFactory } from './factories';
import { RuleExecutionStatusEnum } from '../../../../common/api/detection_engine/rule_monitoring';
import { truncateList } from '../rule_monitoring';
import aadFieldConversion from '../routes/index/signal_aad_mapping.json';
import { extractReferences, injectReferences } from './saved_object_references';
import { withSecuritySpan } from '../../../utils/with_security_span';
import { getInputIndex, DataViewError } from './utils/get_input_output_index';
import { TIMESTAMP_RUNTIME_FIELD } from './constants';
import { buildTimestampRuntimeMapping } from './utils/build_timestamp_runtime_mapping';
import { getFieldsForWildcard } from './utils/get_fields_for_wildcard';
import { alertsFieldMap, rulesFieldMap } from '../../../../common/field_maps';

const aliasesFieldMap: FieldMap = {};
Object.entries(aadFieldConversion).forEach(([key, value]) => {
  aliasesFieldMap[key] = {
    type: 'alias',
    required: false,
    path: value,
  };
});

export const securityRuleTypeFieldMap = {
  ...technicalRuleFieldMap,
  ...alertsFieldMap,
  ...rulesFieldMap,
  ...aliasesFieldMap,
};

/* eslint-disable complexity */
export const createSecurityRuleTypeWrapper: CreateSecurityRuleTypeWrapper =
  ({
    lists,
    logger,
    config,
    publicBaseUrl,
    ruleDataClient,
    ruleExecutionLoggerFactory,
    version,
    isPreview,
    experimentalFeatures,
  }) =>
  (type) => {
    const { alertIgnoreFields: ignoreFields, alertMergeStrategy: mergeStrategy } = config;
    const persistenceRuleType = createPersistenceRuleTypeWrapper({
      ruleDataClient,
      logger,
      formatAlert: formatAlertForNotificationActions,
    });

    return persistenceRuleType({
      ...type,
      cancelAlertsOnRuleTimeout: false,
      useSavedObjectReferences: {
        extractReferences: (params) => extractReferences({ logger, params }),
        injectReferences: (params, savedObjectReferences) =>
          injectReferences({ logger, params, savedObjectReferences }),
      },
      autoRecoverAlerts: false,
      getViewInAppRelativeUrl: ({ rule, start, end }) => {
        let startTime = null;
        let endTime = null;

        if (start && end) {
          startTime = new Date(start).toISOString();
          endTime = new Date(end).toISOString();
        } else if (rule.schedule?.interval) {
          startTime = `now-${rule.schedule?.interval}`;
          endTime = 'now';
        }
        if (!startTime || !endTime) {
          return '';
        }

        const fromInMs = parseScheduleDates(startTime)?.format('x');
        const toInMs = parseScheduleDates(endTime)?.format('x');

        return getNotificationResultsLink({
          from: fromInMs,
          to: toInMs,
          id: rule.id,
        });
      },
      async executor(options) {
        agent.setTransactionName(`${options.rule.ruleTypeId} execution`);
        return withSecuritySpan('securityRuleTypeExecutor', async () => {
          const {
            executionId,
            params,
            previousStartedAt,
            startedAt,
            services,
            spaceId,
            state,
            rule,
          } = options;
          let runState = state;
          let inputIndex: string[] = [];
          let inputIndexFields: DataViewFieldBase[] = [];
          let runtimeMappings: estypes.MappingRuntimeFields | undefined;
          const { from, maxSignals, timestampOverride, timestampOverrideFallbackDisabled, to } =
            params;
          const {
            alertWithPersistence,
            alertWithSuppression,
            savedObjectsClient,
            scopedClusterClient,
            uiSettingsClient,
            ruleMonitoringService,
            ruleResultService,
          } = services;
          const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);

          const esClient = scopedClusterClient.asCurrentUser;

          const ruleExecutionLogger = await ruleExecutionLoggerFactory({
            savedObjectsClient,
            ruleMonitoringService,
            ruleResultService,
            context: {
              executionId,
              ruleId: rule.id,
              ruleUuid: params.ruleId,
              ruleName: rule.name,
              ruleRevision: rule.revision,
              ruleType: rule.ruleTypeId,
              spaceId,
            },
          });

          const completeRule = {
            ruleConfig: rule,
            ruleParams: params,
            alertId: rule.id,
          };

          const {
            schedule: { interval },
          } = completeRule.ruleConfig;

          const refresh = isPreview ? false : true;

          ruleExecutionLogger.debug(`Starting Security Rule execution (interval: ${interval})`);

          await ruleExecutionLogger.logStatusChange({
            newStatus: RuleExecutionStatusEnum.running,
          });

          let result = createResultObject(state);
          let wroteWarningStatus = false;
          let warningMessage;
          let hasError = false;

          const primaryTimestamp = timestampOverride ?? TIMESTAMP;
          const secondaryTimestamp =
            primaryTimestamp !== TIMESTAMP && !timestampOverrideFallbackDisabled
              ? TIMESTAMP
              : undefined;

          // If we have a timestampOverride, we'll compute a runtime field that emits the override for each document if it exists,
          // otherwise it emits @timestamp. If we don't have a timestamp override we don't want to pay the cost of using a
          // runtime field, so we just use @timestamp directly.
          const { aggregatableTimestampField, timestampRuntimeMappings } =
            secondaryTimestamp && timestampOverride
              ? {
                  aggregatableTimestampField: TIMESTAMP_RUNTIME_FIELD,
                  timestampRuntimeMappings: buildTimestampRuntimeMapping({
                    timestampOverride,
                  }),
                }
              : {
                  aggregatableTimestampField: primaryTimestamp,
                  timestampRuntimeMappings: undefined,
                };

          /**
           * Data Views Logic
           * Use of data views is supported for all rules other than ML and Esql.
           * Rules can define both a data view and index pattern, but on execution:
           *  - Data view is used if it is defined
           *    - Rule exits early if data view defined is not found (ie: it's been deleted)
           *  - If no data view defined, falls to using existing index logic
           * Esql rules has index in query, which can be retrieved
           */
          if (isEsqlParams(params)) {
            inputIndex = getIndexListFromEsqlQuery(params.query);
          } else if (!isMachineLearningParams(params)) {
            try {
              const { index, runtimeMappings: dataViewRuntimeMappings } = await getInputIndex({
                index: params.index,
                services,
                version,
                logger,
                ruleId: params.ruleId,
                dataViewId: params.dataViewId,
              });

              inputIndex = index ?? [];
              runtimeMappings = dataViewRuntimeMappings;
            } catch (exc) {
              const errorMessage =
                exc instanceof DataViewError
                  ? `Data View not found ${exc}`
                  : `Check for indices to search failed ${exc}`;

              await ruleExecutionLogger.logStatusChange({
                newStatus: RuleExecutionStatusEnum.failed,
                message: errorMessage,
              });

              return { state: result.state };
            }
          }

          // check if rule has permissions to access given index pattern
          // move this collection of lines into a function in utils
          // so that we can use it in create rules route, bulk, etc.
          let skipExecution: boolean = false;
          try {
            if (!isMachineLearningParams(params)) {
              const privileges = await checkPrivilegesFromEsClient(esClient, inputIndex);

              const { wroteWarningMessage, warningStatusMessage: readIndexWarningMessage } =
                await hasReadIndexPrivileges({
                  privileges,
                  ruleExecutionLogger,
                  uiSettingsClient,
                });

              wroteWarningStatus = wroteWarningMessage;
              warningMessage = readIndexWarningMessage;

              if (!wroteWarningStatus) {
                const timestampFieldCaps = await withSecuritySpan('fieldCaps', () =>
                  services.scopedClusterClient.asCurrentUser.fieldCaps(
                    {
                      index: inputIndex,
                      fields: secondaryTimestamp
                        ? [primaryTimestamp, secondaryTimestamp]
                        : [primaryTimestamp],
                      include_unmapped: true,
                      runtime_mappings: runtimeMappings,
                      ignore_unavailable: true,
                    },
                    { meta: true }
                  )
                );

                const {
                  wroteWarningStatus: wroteWarningStatusResult,
                  foundNoIndices,
                  warningMessage: warningMissingTimestampFieldsMessage,
                } = await hasTimestampFields({
                  timestampField: primaryTimestamp,
                  timestampFieldCapsResponse: timestampFieldCaps,
                  inputIndices: inputIndex,
                  ruleExecutionLogger,
                });
                wroteWarningStatus = wroteWarningStatusResult;
                warningMessage = warningMissingTimestampFieldsMessage;
                skipExecution = foundNoIndices;
              }
            }
          } catch (exc) {
            await ruleExecutionLogger.logStatusChange({
              newStatus: RuleExecutionStatusEnum['partial failure'],
              message: `Check privileges failed to execute ${exc}`,
            });
            wroteWarningStatus = true;
          }

          const { tuples, remainingGap } = getRuleRangeTuples({
            startedAt,
            previousStartedAt,
            from,
            to,
            interval,
            maxSignals: maxSignals ?? DEFAULT_MAX_SIGNALS,
            ruleExecutionLogger,
          });

          if (remainingGap.asMilliseconds() > 0) {
            hasError = true;

            const gapDuration = `${remainingGap.humanize()} (${remainingGap.asMilliseconds()}ms)`;

            await ruleExecutionLogger.logStatusChange({
              newStatus: RuleExecutionStatusEnum.failed,
              message: `${gapDuration} were not queried between this rule execution and the last execution, so signals may have been missed. Consider increasing your look behind time or adding more Kibana instances`,
              metrics: { executionGap: remainingGap },
            });
          }

          if (!isMachineLearningParams(params) && !isEsqlParams(params)) {
            inputIndexFields = await getFieldsForWildcard({
              index: inputIndex,
              dataViews: services.dataViews,
              language: params.language,
              ruleExecutionLogger,
            });
          }

          try {
            const { listClient, exceptionsClient } = getListClient({
              esClient: services.scopedClusterClient.asCurrentUser,
              updatedByUser: rule.updatedBy,
              spaceId,
              lists,
              savedObjectClient: options.services.savedObjectsClient,
            });

            const exceptionItems = await getExceptions({
              client: exceptionsClient,
              lists: params.exceptionsList,
            });

            const bulkCreate = bulkCreateFactory(
              alertWithPersistence,
              refresh,
              ruleExecutionLogger,
              experimentalFeatures
            );

            const alertTimestampOverride = isPreview ? startedAt : undefined;
            const legacySignalFields: string[] = Object.keys(aadFieldConversion);
            const wrapHits = wrapHitsFactory({
              ignoreFields: [...ignoreFields, ...legacySignalFields],
              mergeStrategy,
              completeRule,
              spaceId,
              indicesToQuery: inputIndex,
              alertTimestampOverride,
              publicBaseUrl,
              ruleExecutionLogger,
            });

            const wrapSequences = wrapSequencesFactory({
              ruleExecutionLogger,
              ignoreFields: [...ignoreFields, ...legacySignalFields],
              mergeStrategy,
              completeRule,
              spaceId,
              publicBaseUrl,
              indicesToQuery: inputIndex,
              alertTimestampOverride,
            });

            const { filter: exceptionFilter, unprocessedExceptions } = await buildExceptionFilter({
              startedAt,
              alias: null,
              excludeExceptions: true,
              chunkSize: 10,
              lists: exceptionItems,
              listClient,
            });

            if (!skipExecution) {
              for (const tuple of tuples) {
                const runResult = await type.executor({
                  ...options,
                  services,
                  state: runState,
                  runOpts: {
                    completeRule,
                    inputIndex,
                    exceptionFilter,
                    unprocessedExceptions,
                    inputIndexFields,
                    runtimeMappings: {
                      ...runtimeMappings,
                      ...timestampRuntimeMappings,
                    },
                    searchAfterSize,
                    tuple,
                    bulkCreate,
                    wrapHits,
                    wrapSequences,
                    listClient,
                    ruleDataClient,
                    mergeStrategy,
                    primaryTimestamp,
                    secondaryTimestamp,
                    ruleExecutionLogger,
                    aggregatableTimestampField,
                    alertTimestampOverride,
                    alertWithSuppression,
                    refreshOnIndexingAlerts: refresh,
                    publicBaseUrl,
                    experimentalFeatures,
                  },
                });

                const createdSignals = result.createdSignals.concat(runResult.createdSignals);
                const warningMessages = result.warningMessages.concat(runResult.warningMessages);
                result = {
                  bulkCreateTimes: result.bulkCreateTimes.concat(runResult.bulkCreateTimes),
                  enrichmentTimes: result.enrichmentTimes.concat(runResult.enrichmentTimes),
                  createdSignals,
                  createdSignalsCount: createdSignals.length,
                  errors: result.errors.concat(runResult.errors),
                  lastLookbackDate: runResult.lastLookBackDate,
                  searchAfterTimes: result.searchAfterTimes.concat(runResult.searchAfterTimes),
                  state: runResult.state,
                  success: result.success && runResult.success,
                  warning: warningMessages.length > 0,
                  warningMessages,
                };
                runState = runResult.state;
              }
            } else {
              result = {
                bulkCreateTimes: [],
                enrichmentTimes: [],
                createdSignals: [],
                createdSignalsCount: 0,
                errors: [],
                searchAfterTimes: [],
                state,
                success: true,
                warning: false,
                warningMessages: [],
              };
            }

            if (result.warningMessages.length) {
              await ruleExecutionLogger.logStatusChange({
                newStatus: RuleExecutionStatusEnum['partial failure'],
                message: truncateList(result.warningMessages).join(),
                metrics: {
                  searchDurations: result.searchAfterTimes,
                  indexingDurations: result.bulkCreateTimes,
                  enrichmentDurations: result.enrichmentTimes,
                },
              });
            }

            const createdSignalsCount = result.createdSignals.length;

            if (result.success) {
              ruleExecutionLogger.debug('Security Rule execution completed');
              ruleExecutionLogger.debug(
                `Finished indexing ${createdSignalsCount} alerts into ${ruleDataClient.indexNameWithNamespace(
                  spaceId
                )} ${
                  !isEmpty(tuples)
                    ? `searched between date ranges ${JSON.stringify(tuples, null, 2)}`
                    : ''
                }`
              );

              if (!hasError && !wroteWarningStatus && !result.warning) {
                await ruleExecutionLogger.logStatusChange({
                  newStatus: RuleExecutionStatusEnum.succeeded,
                  message: 'Rule execution completed successfully',
                  metrics: {
                    searchDurations: result.searchAfterTimes,
                    indexingDurations: result.bulkCreateTimes,
                    enrichmentDurations: result.enrichmentTimes,
                  },
                });
              } else if (wroteWarningStatus && !hasError && !result.warning) {
                await ruleExecutionLogger.logStatusChange({
                  newStatus: RuleExecutionStatusEnum['partial failure'],
                  message: warningMessage,
                  metrics: {
                    searchDurations: result.searchAfterTimes,
                    indexingDurations: result.bulkCreateTimes,
                    enrichmentDurations: result.enrichmentTimes,
                  },
                });
              }
            } else {
              await ruleExecutionLogger.logStatusChange({
                newStatus: RuleExecutionStatusEnum.failed,
                message: `An error occurred during rule execution: message: "${truncateList(
                  result.errors
                ).join()}"`,
                metrics: {
                  searchDurations: result.searchAfterTimes,
                  indexingDurations: result.bulkCreateTimes,
                  enrichmentDurations: result.enrichmentTimes,
                },
              });
            }
          } catch (error) {
            const errorMessage = error.message ?? '(no error message given)';

            await ruleExecutionLogger.logStatusChange({
              newStatus: RuleExecutionStatusEnum.failed,
              message: `An error occurred during rule execution: message: "${errorMessage}"`,
              metrics: {
                searchDurations: result.searchAfterTimes,
                indexingDurations: result.bulkCreateTimes,
                enrichmentDurations: result.enrichmentTimes,
              },
            });
          }

          return { state: result.state };
        });
      },
      alerts: {
        context: 'security',
        mappings: {
          dynamic: false,
          fieldMap: securityRuleTypeFieldMap,
        },
        useEcs: true,
        useLegacyAlerts: true,
        isSpaceAware: true,
        secondaryAlias: config.signalsIndex,
        formatAlert: formatAlertForNotificationActions as unknown as FormatAlert<never>,
      },
    });
  };
