/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable complexity */

import { Logger, SavedObject } from 'src/core/server';
import isEmpty from 'lodash/isEmpty';
import { chain, tryCatch } from 'fp-ts/lib/TaskEither';
import { flow } from 'fp-ts/lib/function';

import * as t from 'io-ts';
import { validateNonExact, parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';
import { toError, toPromise } from '@kbn/securitysolution-list-api';

import {
  SIGNALS_ID,
  DEFAULT_SEARCH_AFTER_PAGE_SIZE,
  SERVER_APP_ID,
} from '../../../../common/constants';
import { isMlRule } from '../../../../common/machine_learning/helpers';
import {
  isThresholdRule,
  isEqlRule,
  isThreatMatchRule,
  isQueryRule,
} from '../../../../common/detection_engine/utils';
import { SetupPlugins } from '../../../plugin';
import { getInputIndex } from './get_input_output_index';
import { AlertAttributes, SignalRuleAlertTypeDefinition, ThresholdAlertState } from './types';
import {
  getListsClient,
  getExceptions,
  createSearchAfterReturnType,
  checkPrivileges,
  hasTimestampFields,
  hasReadIndexPrivileges,
  getRuleRangeTuples,
  isMachineLearningParams,
} from './utils';
import { siemRuleActionGroups } from './siem_rule_action_groups';
import {
  scheduleNotificationActions,
  NotificationRuleTypeParams,
} from '../notifications/schedule_notification_actions';
import { buildRuleMessageFactory } from './rule_messages';
import { getNotificationResultsLink } from '../notifications/utils';
import { TelemetryEventsSender } from '../../telemetry/sender';
import { eqlExecutor } from './executors/eql';
import { queryExecutor } from './executors/query';
import { threatMatchExecutor } from './executors/threat_match';
import { thresholdExecutor } from './executors/threshold';
import { mlExecutor } from './executors/ml';
import {
  eqlRuleParams,
  machineLearningRuleParams,
  queryRuleParams,
  threatRuleParams,
  thresholdRuleParams,
  ruleParams,
  RuleParams,
  savedQueryRuleParams,
  CompleteRule,
} from '../schemas/rule_schemas';
import { bulkCreateFactory } from './bulk_create_factory';
import { wrapHitsFactory } from './wrap_hits_factory';
import { wrapSequencesFactory } from './wrap_sequences_factory';
import { ConfigType } from '../../../config';
import { ExperimentalFeatures } from '../../../../common/experimental_features';
import { injectReferences, extractReferences } from './saved_object_references';
import { RuleExecutionLogClient } from '../rule_execution_log/rule_execution_log_client';
import { IRuleDataPluginService } from '../rule_execution_log/types';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { scheduleThrottledNotificationActions } from '../notifications/schedule_throttle_notification_actions';

export const signalRulesAlertType = ({
  logger,
  eventsTelemetry,
  experimentalFeatures,
  version,
  ml,
  lists,
  mergeStrategy,
  ignoreFields,
  ruleDataService,
}: {
  logger: Logger;
  eventsTelemetry?: TelemetryEventsSender;
  experimentalFeatures: ExperimentalFeatures;
  version: string;
  ml?: SetupPlugins['ml'];
  lists: SetupPlugins['lists'] | undefined;
  mergeStrategy: ConfigType['alertMergeStrategy'];
  ignoreFields: ConfigType['alertIgnoreFields'];
  ruleDataService: IRuleDataPluginService;
}): SignalRuleAlertTypeDefinition => {
  return {
    id: SIGNALS_ID,
    name: 'SIEM signal',
    actionGroups: siemRuleActionGroups,
    defaultActionGroupId: 'default',
    useSavedObjectReferences: {
      extractReferences: (params) => extractReferences({ logger, params }),
      injectReferences: (params, savedObjectReferences) =>
        injectReferences({ logger, params, savedObjectReferences }),
    },
    validate: {
      params: {
        validate: (object: unknown): RuleParams => {
          const [validated, errors] = validateNonExact(object, ruleParams);
          if (errors != null) {
            throw new Error(errors);
          }
          if (validated == null) {
            throw new Error('Validation of rule params failed');
          }
          return validated;
        },
      },
    },
    producer: SERVER_APP_ID,
    minimumLicenseRequired: 'basic',
    isExportable: false,
    async executor({
      previousStartedAt,
      startedAt,
      state,
      alertId,
      services,
      params,
      spaceId,
      updatedBy: updatedByUser,
    }) {
      const { ruleId, maxSignals, meta, outputIndex, timestampOverride, type } = params;

      const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);
      let hasError: boolean = false;
      let result = createSearchAfterReturnType();
      const ruleStatusClient = new RuleExecutionLogClient({
        ruleDataService,
        savedObjectsClient: services.savedObjectsClient,
      });

      const savedObject = await services.savedObjectsClient.get<AlertAttributes>('alert', alertId);
      // TODO: conversion below is broken, MUST FIX
      const completeRule = convertRuleSOtoCompleteRule(savedObject, alertId);

      const {
        actions,
        name,
        schedule: { interval },
      } = completeRule.ruleConfig;

      const refresh = actions.length ? 'wait_for' : false;
      const buildRuleMessage = buildRuleMessageFactory({
        id: alertId,
        ruleId,
        name,
        index: outputIndex,
      });

      logger.debug(buildRuleMessage('[+] Starting Signal Rule execution'));
      logger.debug(buildRuleMessage(`interval: ${interval}`));
      let wroteWarningStatus = false;
      await ruleStatusClient.logStatusChange({
        ruleId: alertId,
        newStatus: RuleExecutionStatus['going to run'],
        spaceId,
      });

      // check if rule has permissions to access given index pattern
      // move this collection of lines into a function in utils
      // so that we can use it in create rules route, bulk, etc.
      try {
        if (!isMachineLearningParams(params)) {
          const index = params.index;
          const hasTimestampOverride = timestampOverride != null && !isEmpty(timestampOverride);
          const inputIndices = await getInputIndex({
            services,
            version,
            index,
            experimentalFeatures,
          });
          const [privileges, timestampFieldCaps] = await Promise.all([
            checkPrivileges(services, inputIndices),
            services.scopedClusterClient.asCurrentUser.fieldCaps({
              index,
              fields: hasTimestampOverride
                ? ['@timestamp', timestampOverride as string]
                : ['@timestamp'],
              include_unmapped: true,
            }),
          ]);

          wroteWarningStatus = await flow(
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
            chain((wroteStatus) =>
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
            ),
            toPromise
          )();
        }
      } catch (exc) {
        logger.error(buildRuleMessage(`Check privileges failed to execute ${exc}`));
      }
      const { tuples, remainingGap } = getRuleRangeTuples({
        logger,
        previousStartedAt,
        from: params.from,
        to: params.to,
        interval,
        maxSignals,
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
          spaceId,
          ruleId: alertId,
          newStatus: RuleExecutionStatus.failed,
          message: gapMessage,
          metrics: { gap: gapString },
        });
      }
      try {
        const { listClient, exceptionsClient } = getListsClient({
          services,
          updatedByUser,
          spaceId,
          lists,
          savedObjectClient: services.savedObjectsClient,
        });
        const exceptionItems = await getExceptions({
          client: exceptionsClient,
          lists: params.exceptionsList ?? [],
        });

        const bulkCreate = bulkCreateFactory(
          logger,
          services.scopedClusterClient.asCurrentUser,
          buildRuleMessage,
          refresh
        );

        const wrapHits = wrapHitsFactory({
          completeRule,
          signalsIndex: params.outputIndex,
          mergeStrategy,
          ignoreFields,
        });

        const wrapSequences = wrapSequencesFactory({
          completeRule,
          signalsIndex: params.outputIndex,
          mergeStrategy,
          ignoreFields,
        });

        if (isMlRule(type)) {
          const mlRuleCompleteRule = asTypeSpecificCompleteRule(
            completeRule,
            machineLearningRuleParams
          );
          for (const tuple of tuples) {
            result = await mlExecutor({
              completeRule: mlRuleCompleteRule,
              tuple,
              ml,
              listClient,
              exceptionItems,
              services,
              logger,
              buildRuleMessage,
              bulkCreate,
              wrapHits,
            });
          }
        } else if (isThresholdRule(type)) {
          const thresholdCompleteRule = asTypeSpecificCompleteRule(
            completeRule,
            thresholdRuleParams
          );
          for (const tuple of tuples) {
            result = await thresholdExecutor({
              completeRule: thresholdCompleteRule,
              tuple,
              exceptionItems,
              experimentalFeatures,
              services,
              version,
              logger,
              buildRuleMessage,
              startedAt,
              state: state as ThresholdAlertState,
              bulkCreate,
              wrapHits,
            });
          }
        } else if (isThreatMatchRule(type)) {
          const threatCompleteRule = asTypeSpecificCompleteRule(completeRule, threatRuleParams);
          for (const tuple of tuples) {
            result = await threatMatchExecutor({
              completeRule: threatCompleteRule,
              tuple,
              listClient,
              exceptionItems,
              experimentalFeatures,
              services,
              version,
              searchAfterSize,
              logger,
              eventsTelemetry,
              buildRuleMessage,
              bulkCreate,
              wrapHits,
            });
          }
        } else if (isQueryRule(type)) {
          const queryCompleteRule = validateQueryRuleTypes(completeRule);
          for (const tuple of tuples) {
            result = await queryExecutor({
              completeRule: queryCompleteRule,
              tuple,
              listClient,
              exceptionItems,
              experimentalFeatures,
              services,
              version,
              searchAfterSize,
              logger,
              eventsTelemetry,
              buildRuleMessage,
              bulkCreate,
              wrapHits,
            });
          }
        } else if (isEqlRule(type)) {
          const eqlCompleteRule = asTypeSpecificCompleteRule(completeRule, eqlRuleParams);
          for (const tuple of tuples) {
            result = await eqlExecutor({
              completeRule: eqlCompleteRule,
              tuple,
              exceptionItems,
              experimentalFeatures,
              services,
              version,
              searchAfterSize,
              bulkCreate,
              logger,
              wrapHits,
              wrapSequences,
            });
          }
        } else {
          throw new Error(`unknown rule type ${type}`);
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
          if (actions.length) {
            const notificationRuleParams: NotificationRuleTypeParams = {
              ...params,
              name,
              id: savedObject.id,
            };

            const fromInMs = parseScheduleDates(`now-${interval}`)?.format('x');
            const toInMs = parseScheduleDates('now')?.format('x');
            const resultsLink = getNotificationResultsLink({
              from: fromInMs,
              to: toInMs,
              id: savedObject.id,
              kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
                ?.kibana_siem_app_url,
            });

            logger.info(
              buildRuleMessage(`Found ${result.createdSignalsCount} signals for notification.`)
            );

            if (savedObject.attributes.throttle != null) {
              await scheduleThrottledNotificationActions({
                alertInstance: services.alertInstanceFactory(alertId),
                throttle: savedObject.attributes.throttle,
                startedAt,
                id: savedObject.id,
                kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
                  ?.kibana_siem_app_url,
                outputIndex,
                ruleId,
                esClient: services.scopedClusterClient.asCurrentUser,
                notificationRuleParams,
              });
            } else if (result.createdSignalsCount) {
              const alertInstance = services.alertInstanceFactory(alertId);
              scheduleNotificationActions({
                alertInstance,
                signalsCount: result.createdSignalsCount,
                signals: result.createdSignals,
                resultsLink,
                ruleParams: notificationRuleParams,
              });
            }
          }

          logger.debug(buildRuleMessage('[+] Signal Rule execution completed.'));
          logger.debug(
            buildRuleMessage(
              `[+] Finished indexing ${result.createdSignalsCount} signals into ${outputIndex}`
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
                lastLookBackDate: result.lastLookBackDate?.toISOString(),
              },
            });
          }

          // adding this log line so we can get some information from cloud
          logger.info(
            buildRuleMessage(
              `[+] Finished indexing ${result.createdSignalsCount}  ${
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
              lastLookBackDate: result.lastLookBackDate?.toISOString(),
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
            lastLookBackDate: result.lastLookBackDate?.toISOString(),
          },
        });
      }
    },
  };
};

const validateQueryRuleTypes = (completeRule: CompleteRule) => {
  if (completeRule.ruleParams.type === 'query') {
    return asTypeSpecificCompleteRule(completeRule, queryRuleParams);
  } else {
    return asTypeSpecificCompleteRule(completeRule, savedQueryRuleParams);
  }
};

/**
 * This function takes a generic rule SavedObject and a type-specific schema for the rule params
 * and validates the SavedObject params against the schema. If they validate, it returns a SavedObject
 * where the params have been replaced with the validated params. This eliminates the need for logic that
 * checks if the required type specific fields actually exist on the SO and prevents rule executors from
 * accessing fields that only exist on other rule types.
 *
 * @param completeRule rule typed as an object with all fields from all different rule types
 * @param schema io-ts schema for the specific rule type the SavedObject claims to be
 */
export const asTypeSpecificCompleteRule = <T extends t.Mixed>(
  completeRule: CompleteRule,
  schema: T
) => {
  const [validated, errors] = validateNonExact(completeRule.ruleParams, schema);
  if (validated == null || errors != null) {
    throw new Error(`Rule attempted to execute with invalid params: ${errors}`);
  }
  return {
    ...completeRule,
    ruleParams: validated,
  };
};

// TODO this conversion is broken - MUST FIX
const convertRuleSOtoCompleteRule = (
  ruleSO: SavedObject<AlertAttributes>,
  alertId: string
): CompleteRule => {
  const {
    name,
    tags,
    // @ts-ignore
    consumer,
    enabled,
    schedule,
    actions,
    createdBy,
    updatedBy,
    createdAt,
    // @ts-ignore
    updatedAt,
    throttle,
    // @ts-ignore
    notifyWhen,
    params,
    // @ts-ignore
    producer,
    // @ts-ignore
    ruleTypeId,
    // @ts-ignore
    ruleTypeName,
  } = ruleSO.attributes;

  return {
    alertId,
    ruleParams: params,
    ruleConfig: {
      name,
      tags,
      consumer,
      enabled,
      schedule,
      // @ts-ignore
      actions,
      createdBy,
      updatedBy,
      // @ts-ignore
      createdAt,
      updatedAt,
      throttle,
      notifyWhen,
      producer,
      ruleTypeId,
      ruleTypeName,
    },
  };
};
