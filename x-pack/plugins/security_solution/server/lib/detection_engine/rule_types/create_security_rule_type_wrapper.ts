/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';
import agent from 'elastic-apm-node';

import { createPersistenceRuleTypeWrapper } from '../../../../../rule_registry/server';
import { buildRuleMessageFactory } from './factories/build_rule_message_factory';
import {
  checkPrivilegesFromEsClient,
  getExceptions,
  getRuleRangeTuples,
  hasReadIndexPrivileges,
  hasTimestampFields,
  isMachineLearningParams,
} from '../signals/utils';
import { DEFAULT_MAX_SIGNALS, DEFAULT_SEARCH_AFTER_PAGE_SIZE } from '../../../../common/constants';
import { CreateSecurityRuleTypeWrapper } from './types';
import { getListClient } from './utils/get_list_client';
import {
  NotificationRuleTypeParams,
  scheduleNotificationActions,
} from '../notifications/schedule_notification_actions';
import { getNotificationResultsLink } from '../notifications/utils';
import { createResultObject } from './utils';
import { bulkCreateFactory, wrapHitsFactory, wrapSequencesFactory } from './factories';
import { truncateList } from '../rule_execution_log';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common';
import { scheduleThrottledNotificationActions } from '../notifications/schedule_throttle_notification_actions';
import aadFieldConversion from '../routes/index/signal_aad_mapping.json';
import { extractReferences, injectReferences } from '../signals/saved_object_references';
import { withSecuritySpan } from '../../../utils/with_security_span';

/* eslint-disable complexity */
export const createSecurityRuleTypeWrapper: CreateSecurityRuleTypeWrapper =
  ({ lists, logger, config, ruleDataClient, eventLogService, ruleExecutionLoggerFactory }) =>
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
        return withSecuritySpan('scurityRuleTypeExecutor', async () => {
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
          const { from, maxSignals, meta, ruleId, timestampOverride, to } = params;
          const {
            alertWithPersistence,
            savedObjectsClient,
            scopedClusterClient,
            uiSettingsClient,
          } = services;
          const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);

          const esClient = scopedClusterClient.asCurrentUser;

          const ruleExecutionLogger = ruleExecutionLoggerFactory(
            savedObjectsClient,
            eventLogService,
            logger,
            {
              executionId,
              ruleId: alertId,
              ruleName: rule.name,
              ruleType: rule.ruleTypeId,
              spaceId,
            }
          );

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

          const buildRuleMessage = buildRuleMessageFactory({
            id: alertId,
            executionId,
            ruleId,
            name,
            index: spaceId,
          });

          logger.debug(buildRuleMessage('[+] Starting Signal Rule execution'));
          logger.debug(buildRuleMessage(`interval: ${interval}`));

          let wroteWarningStatus = false;

          await ruleExecutionLogger.logStatusChange({
            newStatus: RuleExecutionStatus.running,
          });

          let result = createResultObject(state);

          const notificationRuleParams: NotificationRuleTypeParams = {
            ...params,
            name,
            id: alertId,
          };

          // check if rule has permissions to access given index pattern
          // move this collection of lines into a function in utils
          // so that we can use it in create rules route, bulk, etc.
          try {
            if (!isMachineLearningParams(params)) {
              const index = params.index;
              const hasTimestampOverride = !!timestampOverride;

              const inputIndices = params.index ?? [];

              const privileges = await checkPrivilegesFromEsClient(esClient, inputIndices);

              wroteWarningStatus = await hasReadIndexPrivileges({
                privileges,
                logger,
                buildRuleMessage,
                ruleExecutionLogger,
                uiSettingsClient,
              });

              if (!wroteWarningStatus) {
                const timestampFieldCaps = await withSecuritySpan('fieldCaps', () =>
                  services.scopedClusterClient.asCurrentUser.fieldCaps(
                    {
                      index,
                      fields: hasTimestampOverride
                        ? ['@timestamp', timestampOverride]
                        : ['@timestamp'],
                      include_unmapped: true,
                    },
                    { meta: true }
                  )
                );
                wroteWarningStatus = await hasTimestampFields({
                  timestampField: hasTimestampOverride ? timestampOverride : '@timestamp',
                  timestampFieldCapsResponse: timestampFieldCaps,
                  inputIndices,
                  ruleExecutionLogger,
                  logger,
                  buildRuleMessage,
                });
              }
            }
          } catch (exc) {
            const errorMessage = buildRuleMessage(`Check privileges failed to execute ${exc}`);
            logger.warn(errorMessage);
            await ruleExecutionLogger.logStatusChange({
              newStatus: RuleExecutionStatus['partial failure'],
              message: errorMessage,
            });
            wroteWarningStatus = true;
          }
          let hasError = false;
          const { tuples, remainingGap } = getRuleRangeTuples({
            logger,
            previousStartedAt,
            from,
            to,
            interval,
            maxSignals: maxSignals ?? DEFAULT_MAX_SIGNALS,
            buildRuleMessage,
            startedAt,
          });

          if (remainingGap.asMilliseconds() > 0) {
            const gapString = remainingGap.humanize();
            const gapMessage = buildRuleMessage(
              `${gapString} (${remainingGap.asMilliseconds()}ms) were not queried between this rule execution and the last execution, so signals may have been missed.`,
              'Consider increasing your look behind time or adding more Kibana instances.'
            );
            logger.warn(gapMessage);
            hasError = true;
            await ruleExecutionLogger.logStatusChange({
              newStatus: RuleExecutionStatus.failed,
              message: gapMessage,
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
              logger,
              alertWithPersistence,
              buildRuleMessage,
              refresh
            );

            const legacySignalFields: string[] = Object.keys(aadFieldConversion);
            const wrapHits = wrapHitsFactory({
              ignoreFields: [...ignoreFields, ...legacySignalFields],
              mergeStrategy,
              completeRule,
              spaceId,
            });

            const wrapSequences = wrapSequencesFactory({
              logger,
              ignoreFields: [...ignoreFields, ...legacySignalFields],
              mergeStrategy,
              completeRule,
              spaceId,
            });

            for (const tuple of tuples) {
              const runResult = await type.executor({
                ...options,
                services,
                state: runState,
                runOpts: {
                  buildRuleMessage,
                  bulkCreate,
                  exceptionItems,
                  listClient,
                  completeRule,
                  searchAfterSize,
                  tuple,
                  wrapHits,
                  wrapSequences,
                  ruleDataReader: ruleDataClient.getReader({ namespace: options.spaceId }),
                },
              });

              const createdSignals = result.createdSignals.concat(runResult.createdSignals);
              const warningMessages = result.warningMessages.concat(runResult.warningMessages);
              result = {
                bulkCreateTimes: result.bulkCreateTimes.concat(runResult.bulkCreateTimes),
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

            if (result.warningMessages.length) {
              const warningMessage = buildRuleMessage(truncateList(result.warningMessages).join());
              await ruleExecutionLogger.logStatusChange({
                newStatus: RuleExecutionStatus['partial failure'],
                message: warningMessage,
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

              logger.debug(
                buildRuleMessage(`Found ${createdSignalsCount} signals for notification.`)
              );

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
              logger.debug(buildRuleMessage('[+] Signal Rule execution completed.'));
              logger.debug(
                buildRuleMessage(
                  `[+] Finished indexing ${createdSignalsCount} signals into ${ruleDataClient.indexNameWithNamespace(
                    spaceId
                  )}`
                )
              );

              if (!hasError && !wroteWarningStatus && !result.warning) {
                await ruleExecutionLogger.logStatusChange({
                  newStatus: RuleExecutionStatus.succeeded,
                  message: 'succeeded',
                  metrics: {
                    searchDurations: result.searchAfterTimes,
                    indexingDurations: result.bulkCreateTimes,
                  },
                });
              }

              logger.debug(
                buildRuleMessage(
                  `[+] Finished indexing ${createdSignalsCount} ${
                    !isEmpty(tuples)
                      ? `signals searched between date ranges ${JSON.stringify(tuples, null, 2)}`
                      : ''
                  }`
                )
              );
            } else {
              const errorMessage = buildRuleMessage(
                'Bulk Indexing of signals failed:',
                truncateList(result.errors).join()
              );
              logger.error(errorMessage);
              await ruleExecutionLogger.logStatusChange({
                newStatus: RuleExecutionStatus.failed,
                message: errorMessage,
                metrics: {
                  searchDurations: result.searchAfterTimes,
                  indexingDurations: result.bulkCreateTimes,
                },
              });
            }
          } catch (error) {
            const errorMessage = error.message ?? '(no error message given)';
            const message = buildRuleMessage(
              'An error occurred during rule execution:',
              `message: "${errorMessage}"`
            );

            logger.error(message);
            await ruleExecutionLogger.logStatusChange({
              newStatus: RuleExecutionStatus.failed,
              message,
              metrics: {
                searchDurations: result.searchAfterTimes,
                indexingDurations: result.bulkCreateTimes,
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
