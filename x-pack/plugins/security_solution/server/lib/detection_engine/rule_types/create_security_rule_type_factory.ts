/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { flow } from 'fp-ts/lib/function';
import { Either, chain, fold, tryCatch } from 'fp-ts/lib/Either';

import { TIMESTAMP } from '@kbn/rule-data-utils';
import { parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';
import { ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { toError } from '@kbn/securitysolution-list-api';

import { createPersistenceRuleTypeFactory } from '../../../../../rule_registry/server';
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
import { CreateSecurityRuleTypeFactory } from './types';
import { getListClient } from './utils/get_list_client';
import {
  NotificationRuleTypeParams,
  scheduleNotificationActions,
} from '../notifications/schedule_notification_actions';
import { getNotificationResultsLink } from '../notifications/utils';
import { createResultObject } from './utils';
import { bulkCreateFactory, wrapHitsFactory, wrapSequencesFactory } from './factories';
import { RuleExecutionLogClient } from '../rule_execution_log/rule_execution_log_client';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { scheduleThrottledNotificationActions } from '../notifications/schedule_throttle_notification_actions';

/* eslint-disable complexity */
export const createSecurityRuleTypeFactory: CreateSecurityRuleTypeFactory =
  ({ lists, logger, mergeStrategy, ignoreFields, ruleDataClient, ruleDataService }) =>
  (type) => {
    const persistenceRuleType = createPersistenceRuleTypeFactory({ ruleDataClient, logger });
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
        } = options;
        let runState = state;
        const { from, maxSignals, meta, ruleId, timestampOverride, to } = params;
        const { alertWithPersistence, savedObjectsClient, scopedClusterClient } = services;
        const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);

        const esClient = scopedClusterClient.asCurrentUser;

        const ruleStatusClient = new RuleExecutionLogClient({
          savedObjectsClient,
          ruleDataService,
        });
        const ruleSO = await savedObjectsClient.get('alert', alertId);

        const {
          actions,
          name,
          schedule: { interval },
        } = ruleSO.attributes;
        const refresh = actions.length ? 'wait_for' : false;

        const buildRuleMessage = buildRuleMessageFactory({
          id: alertId,
          ruleId,
          name,
          index: ruleDataClient.indexName,
        });

        logger.debug(buildRuleMessage('[+] Starting Signal Rule execution'));
        logger.debug(buildRuleMessage(`interval: ${interval}`));

        let wroteWarningStatus = false;
        await ruleStatusClient.logStatusChange({
          spaceId,
          ruleId: alertId,
          newStatus: RuleExecutionStatus['going to run'],
        });

        let result = createResultObject(state);

        // check if rule has permissions to access given index pattern
        // move this collection of lines into a function in utils
        // so that we can use it in create rules route, bulk, etc.
        try {
          if (!isMachineLearningParams(params)) {
            const index = params.index;
            const hasTimestampOverride = !!timestampOverride;

            const inputIndices = params.index ?? [];

            const [privileges, timestampFieldCaps] = await Promise.all([
              checkPrivilegesFromEsClient(esClient, inputIndices),
              esClient.fieldCaps({
                index: index ?? ['*'],
                fields: hasTimestampOverride
                  ? [TIMESTAMP, timestampOverride as string]
                  : [TIMESTAMP],
                include_unmapped: true,
              }),
            ]);

            fold<Error, Promise<boolean>, void>(
              async (error: Error) => logger.error(buildRuleMessage(error.message)),
              async (status: Promise<boolean>) => (wroteWarningStatus = await status)
            )(
              flow(
                () =>
                  tryCatch(
                    () =>
                      hasReadIndexPrivileges({
                        spaceId,
                        ruleId: alertId,
                        privileges,
                        logger,
                        buildRuleMessage,
                        ruleStatusClient,
                      }),
                    toError
                  ),
                chain((wroteStatus: unknown) =>
                  tryCatch(
                    () =>
                      hasTimestampFields({
                        spaceId,
                        ruleId: alertId,
                        wroteStatus: wroteStatus as boolean,
                        timestampField: hasTimestampOverride
                          ? (timestampOverride as string)
                          : '@timestamp',
                        ruleName: name,
                        timestampFieldCapsResponse: timestampFieldCaps,
                        inputIndices,
                        ruleStatusClient,
                        logger,
                        buildRuleMessage,
                      }),
                    toError
                  )
                )
              )() as Either<Error, Promise<boolean>>
            );
          }
        } catch (exc) {
          logger.error(buildRuleMessage(`Check privileges failed to execute ${exc}`));
        }
        let hasError = false;
        const { tuples, remainingGap } = getRuleRangeTuples({
          logger,
          previousStartedAt,
          from: from as string,
          to: to as string,
          interval,
          maxSignals: DEFAULT_MAX_SIGNALS,
          buildRuleMessage,
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
            spaceId,
            ruleId: alertId,
            newStatus: RuleExecutionStatus.failed,
            message: gapMessage,
            metrics: { gap: gapString },
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

          const wrapHits = wrapHitsFactory({
            logger,
            ignoreFields,
            mergeStrategy,
            ruleSO,
            spaceId,
          });

          const wrapSequences = wrapSequencesFactory({
            logger,
            ignoreFields,
            mergeStrategy,
            ruleSO,
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
                rule: ruleSO,
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
              lastLookbackDate: runResult.lastLookbackDate,
              searchAfterTimes: result.searchAfterTimes.concat(runResult.searchAfterTimes),
              state: runState,
              success: result.success && runResult.success,
              warning: warningMessages.length > 0,
              warningMessages,
            };
            runState = runResult.state;
          }

          if (result.warningMessages.length) {
            const warningMessage = buildRuleMessage(result.warningMessages.join());
            await ruleStatusClient.logStatusChange({
              spaceId,
              ruleId: alertId,
              newStatus: RuleExecutionStatus['partial failure'],
              message: warningMessage,
            });
          }

          if (result.success) {
            const createdSignalsCount = result.createdSignals.length;

            if (actions.length) {
              const notificationRuleParams: NotificationRuleTypeParams = {
                ...params,
                name: name as string,
                id: ruleSO.id as string,
              } as unknown as NotificationRuleTypeParams;

              const fromInMs = parseScheduleDates(`now-${interval}`)?.format('x');
              const toInMs = parseScheduleDates('now')?.format('x');
              const resultsLink = getNotificationResultsLink({
                from: fromInMs,
                to: toInMs,
                id: ruleSO.id,
                kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
                  ?.kibana_siem_app_url,
              });

              logger.info(
                buildRuleMessage(`Found ${createdSignalsCount} signals for notification.`)
              );

              if (ruleSO.attributes.throttle != null) {
                await scheduleThrottledNotificationActions({
                  alertInstance: services.alertInstanceFactory(alertId),
                  throttle: ruleSO.attributes.throttle,
                  startedAt,
                  id: ruleSO.id,
                  kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
                    ?.kibana_siem_app_url,
                  outputIndex: ruleDataClient.indexName,
                  ruleId,
                  esClient: services.scopedClusterClient.asCurrentUser,
                  notificationRuleParams,
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
                spaceId,
                ruleId: alertId,
                newStatus: RuleExecutionStatus.succeeded,
                message: 'succeeded',
                metrics: {
                  bulkCreateTimeDurations: result.bulkCreateTimes,
                  searchAfterTimeDurations: result.searchAfterTimes,
                  lastLookBackDate: result.lastLookbackDate?.toISOString(),
                },
              });
            }

            // adding this log line so we can get some information from cloud
            logger.info(
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
              result.errors.join()
            );
            logger.error(errorMessage);
            await ruleStatusClient.logStatusChange({
              spaceId,
              ruleId: alertId,
              newStatus: RuleExecutionStatus.failed,
              message: errorMessage,
              metrics: {
                bulkCreateTimeDurations: result.bulkCreateTimes,
                searchAfterTimeDurations: result.searchAfterTimes,
                lastLookBackDate: result.lastLookbackDate?.toISOString(),
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
          await ruleStatusClient.logStatusChange({
            spaceId,
            ruleId: alertId,
            newStatus: RuleExecutionStatus.failed,
            message,
            metrics: {
              bulkCreateTimeDurations: result.bulkCreateTimes,
              searchAfterTimeDurations: result.searchAfterTimes,
              lastLookBackDate: result.lastLookbackDate?.toISOString(),
            },
          });
        }

        return result.state;
      },
    });
  };
