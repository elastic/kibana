/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';

import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';
import { ListArray } from '@kbn/securitysolution-io-ts-list-types';

import { createPersistenceRuleTypeWrapper } from '../../../../../rule_registry/server';
import { buildRuleMessageFactory } from './factories/build_rule_message_factory';
import {
  checkPrivilegesFromEsClient,
  getExceptions,
  getRuleRangeTuples,
  hasReadIndexPrivileges,
  hasTimestampFields,
  isEqlParams,
  isQueryParams,
  isSavedQueryParams,
  isThreatParams,
  isThresholdParams,
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
import { RuleExecutionLogClient, truncateMessageList } from '../rule_execution_log';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { scheduleThrottledNotificationActions } from '../notifications/schedule_throttle_notification_actions';
import aadFieldConversion from '../routes/index/signal_aad_mapping.json';

/* eslint-disable complexity */
export const createSecurityRuleTypeWrapper: CreateSecurityRuleTypeWrapper =
  ({ lists, logger, config, ruleDataClient, eventLogService }) =>
  (type) => {
    const { alertIgnoreFields: ignoreFields, alertMergeStrategy: mergeStrategy } = config;
    const persistenceRuleType = createPersistenceRuleTypeWrapper({ ruleDataClient, logger });
    return persistenceRuleType({
      ...type,
      async executor(options) {
        const {
          alertId,
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
        const { alertWithPersistence, savedObjectsClient, scopedClusterClient } = services;
        const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);

        const esClient = scopedClusterClient.asCurrentUser;

        const ruleStatusClient = new RuleExecutionLogClient({
          underlyingClient: config.ruleExecutionLog.underlyingClient,
          savedObjectsClient,
          eventLogService,
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
          ruleTypeId,
        } = completeRule.ruleConfig;

        const refresh = actions.length ? 'wait_for' : false;

        const buildRuleMessage = buildRuleMessageFactory({
          id: alertId,
          ruleId,
          name,
          index: spaceId,
        });

        logger.debug(buildRuleMessage('[+] Starting Signal Rule execution'));
        logger.debug(buildRuleMessage(`interval: ${interval}`));

        let wroteWarningStatus = false;
        const basicLogArguments = {
          spaceId,
          ruleId: alertId,
          ruleName: name,
          ruleType: ruleTypeId,
        };
        await ruleStatusClient.logStatusChange({
          ...basicLogArguments,
          newStatus: RuleExecutionStatus['going to run'],
        });

        let result = createResultObject(state);

        const notificationRuleParams: NotificationRuleTypeParams = {
          ...params,
          name,
          id: alertId,
        } as unknown as NotificationRuleTypeParams;

        // check if rule has permissions to access given index pattern
        // move this collection of lines into a function in utils
        // so that we can use it in create rules route, bulk, etc.
        try {
          // Typescript 4.1.3 can't figure out that `!isMachineLearningParams(params)` also excludes the only rule type
          // of rule params that doesn't include `params.index`, but Typescript 4.3.5 does compute the stricter type correctly.
          // When we update Typescript to >= 4.3.5, we can replace this logic with `!isMachineLearningParams(params)` again.
          if (
            isEqlParams(params) ||
            isThresholdParams(params) ||
            isQueryParams(params) ||
            isSavedQueryParams(params) ||
            isThreatParams(params)
          ) {
            const index = params.index;
            const hasTimestampOverride = !!timestampOverride;

            const inputIndices = params.index ?? [];

            const privileges = await checkPrivilegesFromEsClient(esClient, inputIndices);

            wroteWarningStatus = await hasReadIndexPrivileges({
              ...basicLogArguments,
              privileges,
              logger,
              buildRuleMessage,
              ruleStatusClient,
            });

            if (!wroteWarningStatus) {
              const timestampFieldCaps = await services.scopedClusterClient.asCurrentUser.fieldCaps(
                {
                  index,
                  fields: hasTimestampOverride
                    ? ['@timestamp', timestampOverride as string]
                    : ['@timestamp'],
                  include_unmapped: true,
                }
              );
              wroteWarningStatus = await hasTimestampFields({
                ...basicLogArguments,
                timestampField: hasTimestampOverride ? (timestampOverride as string) : '@timestamp',
                timestampFieldCapsResponse: timestampFieldCaps,
                inputIndices,
                ruleStatusClient,
                logger,
                buildRuleMessage,
              });
            }
          }
        } catch (exc) {
          const errorMessage = buildRuleMessage(`Check privileges failed to execute ${exc}`);
          logger.error(errorMessage);
          await ruleStatusClient.logStatusChange({
            ...basicLogArguments,
            message: errorMessage,
            newStatus: RuleExecutionStatus['partial failure'],
          });
          wroteWarningStatus = true;
        }
        let hasError = false;
        const { tuples, remainingGap } = getRuleRangeTuples({
          logger,
          previousStartedAt,
          from: from as string,
          to: to as string,
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
          await ruleStatusClient.logStatusChange({
            ...basicLogArguments,
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
            lists: (params.exceptionsList as ListArray) ?? [],
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
              state: runState,
              success: result.success && runResult.success,
              warning: warningMessages.length > 0,
              warningMessages,
            };
            runState = runResult.state;
          }

          if (result.warningMessages.length) {
            const warningMessage = buildRuleMessage(
              truncateMessageList(result.warningMessages).join()
            );
            await ruleStatusClient.logStatusChange({
              ...basicLogArguments,
              newStatus: RuleExecutionStatus['partial failure'],
              message: warningMessage,
            });
          }

          if (result.success) {
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
                await scheduleThrottledNotificationActions({
                  alertInstance: services.alertInstanceFactory(alertId),
                  throttle: completeRule.ruleConfig.throttle ?? '',
                  startedAt,
                  id: alertId,
                  kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
                    ?.kibana_siem_app_url,
                  outputIndex: ruleDataClient.indexName,
                  ruleId,
                  esClient: services.scopedClusterClient.asCurrentUser,
                  notificationRuleParams,
                  signals: result.createdSignals,
                  logger,
                });
              } else if (createdSignalsCount) {
                const alertInstance = services.alertInstanceFactory(alertId);
                scheduleNotificationActions({
                  alertInstance,
                  signalsCount: createdSignalsCount,
                  signals: result.createdSignals,
                  resultsLink,
                  ruleParams: notificationRuleParams,
                });
              }
            }

            logger.debug(buildRuleMessage('[+] Signal Rule execution completed.'));
            logger.debug(
              buildRuleMessage(
                `[+] Finished indexing ${createdSignalsCount} signals into ${ruleDataClient.indexName}`
              )
            );

            if (!hasError && !wroteWarningStatus && !result.warning) {
              await ruleStatusClient.logStatusChange({
                ...basicLogArguments,
                newStatus: RuleExecutionStatus.succeeded,
                message: 'succeeded',
                metrics: {
                  indexingDurations: result.bulkCreateTimes,
                  searchDurations: result.searchAfterTimes,
                  lastLookBackDate: result.lastLookbackDate?.toISOString(),
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
            // NOTE: Since this is throttled we have to call it even on an error condition, otherwise it will "reset" the throttle and fire early
            if (completeRule.ruleConfig.throttle != null) {
              await scheduleThrottledNotificationActions({
                alertInstance: services.alertInstanceFactory(alertId),
                throttle: completeRule.ruleConfig.throttle ?? '',
                startedAt,
                id: completeRule.alertId,
                kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
                  ?.kibana_siem_app_url,
                outputIndex: ruleDataClient.indexName,
                ruleId,
                esClient: services.scopedClusterClient.asCurrentUser,
                notificationRuleParams,
                signals: result.createdSignals,
                logger,
              });
            }
            const errorMessage = buildRuleMessage(
              'Bulk Indexing of signals failed:',
              truncateMessageList(result.errors).join()
            );
            logger.error(errorMessage);
            await ruleStatusClient.logStatusChange({
              ...basicLogArguments,
              newStatus: RuleExecutionStatus.failed,
              message: errorMessage,
              metrics: {
                indexingDurations: result.bulkCreateTimes,
                searchDurations: result.searchAfterTimes,
                lastLookBackDate: result.lastLookbackDate?.toISOString(),
              },
            });
          }
        } catch (error) {
          // NOTE: Since this is throttled we have to call it even on an error condition, otherwise it will "reset" the throttle and fire early
          if (completeRule.ruleConfig.throttle != null) {
            await scheduleThrottledNotificationActions({
              alertInstance: services.alertInstanceFactory(alertId),
              throttle: completeRule.ruleConfig.throttle ?? '',
              startedAt,
              id: completeRule.alertId,
              kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
                ?.kibana_siem_app_url,
              outputIndex: ruleDataClient.indexName,
              ruleId,
              esClient: services.scopedClusterClient.asCurrentUser,
              notificationRuleParams,
              signals: result.createdSignals,
              logger,
            });
          }

          const errorMessage = error.message ?? '(no error message given)';
          const message = buildRuleMessage(
            'An error occurred during rule execution:',
            `message: "${errorMessage}"`
          );

          logger.error(message);
          await ruleStatusClient.logStatusChange({
            ...basicLogArguments,
            newStatus: RuleExecutionStatus.failed,
            message,
            metrics: {
              indexingDurations: result.bulkCreateTimes,
              searchDurations: result.searchAfterTimes,
              lastLookBackDate: result.lastLookbackDate?.toISOString(),
            },
          });
        }

        return result.state;
      },
    });
  };
