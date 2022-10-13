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
import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';

import { buildExceptionFilter } from '@kbn/lists-plugin/server/services/exception_lists';
import {
  checkPrivilegesFromEsClient,
  getExceptions,
  getRuleRangeTuples,
  hasReadIndexPrivileges,
  hasTimestampFields,
  isMachineLearningParams,
} from '../signals/utils';
import { DEFAULT_MAX_SIGNALS, DEFAULT_SEARCH_AFTER_PAGE_SIZE } from '../../../../common/constants';
import type { CreateSecurityRuleTypeWrapper } from './types';
import { getListClient } from './utils/get_list_client';
// eslint-disable-next-line no-restricted-imports
import type { NotificationRuleTypeParams } from '../rule_actions_legacy';
// eslint-disable-next-line no-restricted-imports
import {
  scheduleNotificationActions,
  scheduleThrottledNotificationActions,
  getNotificationResultsLink,
} from '../rule_actions_legacy';
import { createResultObject } from './utils';
import { bulkCreateFactory, wrapHitsFactory, wrapSequencesFactory } from './factories';
import { RuleExecutionStatus } from '../../../../common/detection_engine/rule_monitoring';
import { truncateList } from '../rule_monitoring';
import aadFieldConversion from '../routes/index/signal_aad_mapping.json';
import { extractReferences, injectReferences } from '../signals/saved_object_references';
import { withSecuritySpan } from '../../../utils/with_security_span';
import { getInputIndex, DataViewError } from '../signals/get_input_output_index';
import { TIMESTAMP_RUNTIME_FIELD } from './constants';
import { buildTimestampRuntimeMapping } from './utils/build_timestamp_runtime_mapping';

/* eslint-disable complexity */
export const createSecurityRuleTypeWrapper: CreateSecurityRuleTypeWrapper =
  ({ lists, logger, config, ruleDataClient, ruleExecutionLoggerFactory, version }) =>
  (type) => {
    const { alertIgnoreFields: ignoreFields, alertMergeStrategy: mergeStrategy } = config;
    const persistenceRuleType = createPersistenceRuleTypeWrapper({ ruleDataClient, logger });
    return persistenceRuleType({
      ...type,
      cancelAlertsOnRuleTimeout: false,
      useSavedObjectReferences: {
        extractReferences: (params) => extractReferences({ logger, params }),
        injectReferences: (params, savedObjectReferences) =>
          injectReferences({ logger, params, savedObjectReferences }),
      },
      async executor(options) {
        agent.setTransactionName(`${options.rule.ruleTypeId} execution`);
        return withSecuritySpan('securityRuleTypeExecutor', async () => {
          const {
            alertId,
            executionId,
            params,
            previousStartedAt,
            startedAt,
            services,
            spaceId,
            state,
            updatedBy: updatedByUser,
            rule,
          } = options;
          let runState = state;
          let inputIndex: string[] = [];
          let runtimeMappings: estypes.MappingRuntimeFields | undefined;
          const {
            from,
            maxSignals,
            meta,
            ruleId,
            timestampOverride,
            timestampOverrideFallbackDisabled,
            to,
          } = params;
          const {
            alertWithPersistence,
            savedObjectsClient,
            scopedClusterClient,
            uiSettingsClient,
          } = services;
          const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);

          const esClient = scopedClusterClient.asCurrentUser;

          const ruleExecutionLogger = await ruleExecutionLoggerFactory({
            savedObjectsClient,
            context: {
              executionId,
              ruleId: alertId,
              ruleUuid: params.ruleId,
              ruleName: rule.name,
              ruleType: rule.ruleTypeId,
              spaceId,
            },
          });

          const completeRule = {
            ruleConfig: rule,
            ruleParams: params,
            alertId,
          };

          const {
            actions,
            name,
            schedule: { interval },
          } = completeRule.ruleConfig;

          const refresh = actions.length ? 'wait_for' : false;

          ruleExecutionLogger.debug('[+] Starting Signal Rule execution');
          ruleExecutionLogger.debug(`interval: ${interval}`);

          await ruleExecutionLogger.logStatusChange({
            newStatus: RuleExecutionStatus.running,
          });

          let result = createResultObject(state);
          let wroteWarningStatus = false;
          let hasError = false;

          const notificationRuleParams: NotificationRuleTypeParams = {
            ...params,
            name,
            id: alertId,
          };

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
           * Use of data views is supported for all rules other than ML.
           * Rules can define both a data view and index pattern, but on execution:
           *  - Data view is used if it is defined
           *    - Rule exits early if data view defined is not found (ie: it's been deleted)
           *  - If no data view defined, falls to using existing index logic
           */
          if (!isMachineLearningParams(params)) {
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
                newStatus: RuleExecutionStatus.failed,
                message: errorMessage,
              });

              return result.state;
            }
          }

          // check if rule has permissions to access given index pattern
          // move this collection of lines into a function in utils
          // so that we can use it in create rules route, bulk, etc.
          let skipExecution: boolean = false;
          try {
            if (!isMachineLearningParams(params)) {
              const privileges = await checkPrivilegesFromEsClient(esClient, inputIndex);

              wroteWarningStatus = await hasReadIndexPrivileges({
                privileges,
                ruleExecutionLogger,
                uiSettingsClient,
              });

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

                const { wroteWarningStatus: wroteWarningStatusResult, foundNoIndices } =
                  await hasTimestampFields({
                    timestampField: primaryTimestamp,
                    timestampFieldCapsResponse: timestampFieldCaps,
                    inputIndices: inputIndex,
                    ruleExecutionLogger,
                  });
                wroteWarningStatus = wroteWarningStatusResult;
                skipExecution = foundNoIndices;
              }
            }
          } catch (exc) {
            await ruleExecutionLogger.logStatusChange({
              newStatus: RuleExecutionStatus['partial failure'],
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
              newStatus: RuleExecutionStatus.failed,
              message: `${gapDuration} were not queried between this rule execution and the last execution, so signals may have been missed. Consider increasing your look behind time or adding more Kibana instances`,
              metrics: { executionGap: remainingGap },
            });
          }

          try {
            const { listClient, exceptionsClient } = getListClient({
              esClient: services.scopedClusterClient.asCurrentUser,
              updatedByUser,
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
              ruleExecutionLogger
            );

            const legacySignalFields: string[] = Object.keys(aadFieldConversion);
            const wrapHits = wrapHitsFactory({
              ignoreFields: [...ignoreFields, ...legacySignalFields],
              mergeStrategy,
              completeRule,
              spaceId,
              indicesToQuery: inputIndex,
            });

            const wrapSequences = wrapSequencesFactory({
              logger,
              ignoreFields: [...ignoreFields, ...legacySignalFields],
              mergeStrategy,
              completeRule,
              spaceId,
              indicesToQuery: inputIndex,
            });

            const { filter: exceptionFilter, unprocessedExceptions } = await buildExceptionFilter({
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
                    ruleDataReader: ruleDataClient.getReader({ namespace: options.spaceId }),
                    mergeStrategy,
                    primaryTimestamp,
                    secondaryTimestamp,
                    ruleExecutionLogger,
                    aggregatableTimestampField,
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
                newStatus: RuleExecutionStatus['partial failure'],
                message: truncateList(result.warningMessages).join(),
              });
            }

            const createdSignalsCount = result.createdSignals.length;

            if (actions.length) {
              const fromInMs = parseScheduleDates(`now-${interval}`)?.format('x');
              const toInMs = parseScheduleDates('now')?.format('x');
              const resultsLink = getNotificationResultsLink({
                from: fromInMs,
                to: toInMs,
                id: alertId,
                kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
                  ?.kibana_siem_app_url,
              });

              ruleExecutionLogger.debug(`Found ${createdSignalsCount} signals for notification.`);

              if (completeRule.ruleConfig.throttle != null) {
                // NOTE: Since this is throttled we have to call it even on an error condition, otherwise it will "reset" the throttle and fire early
                await scheduleThrottledNotificationActions({
                  alertInstance: services.alertFactory.create(alertId),
                  throttle: completeRule.ruleConfig.throttle ?? '',
                  startedAt,
                  id: alertId,
                  kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
                    ?.kibana_siem_app_url,
                  outputIndex: ruleDataClient.indexNameWithNamespace(spaceId),
                  ruleId,
                  esClient: services.scopedClusterClient.asCurrentUser,
                  notificationRuleParams,
                  signals: result.createdSignals,
                  logger,
                });
              } else if (createdSignalsCount) {
                const alertInstance = services.alertFactory.create(alertId);
                scheduleNotificationActions({
                  alertInstance,
                  signalsCount: createdSignalsCount,
                  signals: result.createdSignals,
                  resultsLink,
                  ruleParams: notificationRuleParams,
                });
              }
            }

            if (result.success) {
              ruleExecutionLogger.debug('[+] Signal Rule execution completed.');
              ruleExecutionLogger.debug(
                `[+] Finished indexing ${createdSignalsCount} signals into ${ruleDataClient.indexNameWithNamespace(
                  spaceId
                )}`
              );

              if (!hasError && !wroteWarningStatus && !result.warning) {
                await ruleExecutionLogger.logStatusChange({
                  newStatus: RuleExecutionStatus.succeeded,
                  message: 'Rule execution completed successfully',
                  metrics: {
                    searchDurations: result.searchAfterTimes,
                    indexingDurations: result.bulkCreateTimes,
                    enrichmentDurations: result.enrichmentTimes,
                  },
                });
              }

              ruleExecutionLogger.debug(
                `[+] Finished indexing ${createdSignalsCount} ${
                  !isEmpty(tuples)
                    ? `signals searched between date ranges ${JSON.stringify(tuples, null, 2)}`
                    : ''
                }`
              );
            } else {
              await ruleExecutionLogger.logStatusChange({
                newStatus: RuleExecutionStatus.failed,
                message: `Bulk Indexing of signals failed: ${truncateList(result.errors).join()}`,
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
              newStatus: RuleExecutionStatus.failed,
              message: `An error occurred during rule execution: message: "${errorMessage}"`,
              metrics: {
                searchDurations: result.searchAfterTimes,
                indexingDurations: result.bulkCreateTimes,
                enrichmentDurations: result.enrichmentTimes,
              },
            });

            // NOTE: Since this is throttled we have to call it even on an error condition, otherwise it will "reset" the throttle and fire early
            if (actions.length && completeRule.ruleConfig.throttle != null) {
              await scheduleThrottledNotificationActions({
                alertInstance: services.alertFactory.create(alertId),
                throttle: completeRule.ruleConfig.throttle ?? '',
                startedAt,
                id: completeRule.alertId,
                kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
                  ?.kibana_siem_app_url,
                outputIndex: ruleDataClient.indexNameWithNamespace(spaceId),
                ruleId,
                esClient: services.scopedClusterClient.asCurrentUser,
                notificationRuleParams,
                signals: result.createdSignals,
                logger,
              });
            }
          }

          return result.state;
        });
      },
    });
  };
