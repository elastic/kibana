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
import { validateNonExact } from '../../../../common/validate';
import { toError, toPromise } from '../../../../common/fp_utils';

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
import { parseScheduleDates } from '../../../../common/detection_engine/parse_schedule_dates';
import { SetupPlugins } from '../../../plugin';
import { getInputIndex } from './get_input_output_index';
import { AlertAttributes, SignalRuleAlertTypeDefinition } from './types';
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
import { ruleStatusServiceFactory } from './rule_status_service';
import { buildRuleMessageFactory } from './rule_messages';
import { ruleStatusSavedObjectsClientFactory } from './rule_status_saved_objects_client';
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
} from '../schemas/rule_schemas';

export const signalRulesAlertType = ({
  logger,
  eventsTelemetry,
  version,
  ml,
  lists,
}: {
  logger: Logger;
  eventsTelemetry: TelemetryEventsSender | undefined;
  version: string;
  ml: SetupPlugins['ml'];
  lists: SetupPlugins['lists'] | undefined;
}): SignalRuleAlertTypeDefinition => {
  return {
    id: SIGNALS_ID,
    name: 'SIEM signal',
    actionGroups: siemRuleActionGroups,
    defaultActionGroupId: 'default',
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
    async executor({
      previousStartedAt,
      startedAt,
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
      const ruleStatusClient = ruleStatusSavedObjectsClientFactory(services.savedObjectsClient);
      const ruleStatusService = await ruleStatusServiceFactory({
        alertId,
        ruleStatusClient,
      });

      const savedObject = await services.savedObjectsClient.get<AlertAttributes>('alert', alertId);
      const {
        actions,
        name,
        schedule: { interval },
      } = savedObject.attributes;
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
      await ruleStatusService.goingToRun();

      // check if rule has permissions to access given index pattern
      // move this collection of lines into a function in utils
      // so that we can use it in create rules route, bulk, etc.
      try {
        if (!isMachineLearningParams(params)) {
          const index = params.index;
          const hasTimestampOverride = timestampOverride != null && !isEmpty(timestampOverride);
          const inputIndices = await getInputIndex(services, version, index);
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
                  hasReadIndexPrivileges(privileges, logger, buildRuleMessage, ruleStatusService),
                toError
              ),
            chain((wroteStatus) =>
              tryCatch(
                () =>
                  hasTimestampFields(
                    wroteStatus,
                    hasTimestampOverride ? (timestampOverride as string) : '@timestamp',
                    name,
                    timestampFieldCaps,
                    inputIndices,
                    ruleStatusService,
                    logger,
                    buildRuleMessage
                  ),
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
      });
      if (remainingGap.asMilliseconds() > 0) {
        const gapString = remainingGap.humanize();
        const gapMessage = buildRuleMessage(
          `${gapString} (${remainingGap.asMilliseconds()}ms) were not queried between this rule execution and the last execution, so signals may have been missed.`,
          'Consider increasing your look behind time or adding more Kibana instances.'
        );
        logger.warn(gapMessage);
        hasError = true;
        await ruleStatusService.error(gapMessage, { gap: gapString });
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
        if (isMlRule(type)) {
          const mlRuleSO = asTypeSpecificSO(savedObject, machineLearningRuleParams);
          result = await mlExecutor({
            rule: mlRuleSO,
            ml,
            listClient,
            exceptionItems,
            ruleStatusService,
            services,
            logger,
            refresh,
            buildRuleMessage,
          });
        } else if (isThresholdRule(type)) {
          const thresholdRuleSO = asTypeSpecificSO(savedObject, thresholdRuleParams);
          result = await thresholdExecutor({
            rule: thresholdRuleSO,
            tuples,
            exceptionItems,
            ruleStatusService,
            services,
            version,
            logger,
            refresh,
            buildRuleMessage,
            startedAt,
          });
        } else if (isThreatMatchRule(type)) {
          const threatRuleSO = asTypeSpecificSO(savedObject, threatRuleParams);
          result = await threatMatchExecutor({
            rule: threatRuleSO,
            tuples,
            listClient,
            exceptionItems,
            services,
            version,
            searchAfterSize,
            logger,
            refresh,
            eventsTelemetry,
            buildRuleMessage,
          });
        } else if (isQueryRule(type)) {
          const queryRuleSO = validateQueryRuleTypes(savedObject);
          result = await queryExecutor({
            rule: queryRuleSO,
            tuples,
            listClient,
            exceptionItems,
            services,
            version,
            searchAfterSize,
            logger,
            refresh,
            eventsTelemetry,
            buildRuleMessage,
          });
        } else if (isEqlRule(type)) {
          const eqlRuleSO = asTypeSpecificSO(savedObject, eqlRuleParams);
          result = await eqlExecutor({
            rule: eqlRuleSO,
            exceptionItems,
            ruleStatusService,
            services,
            version,
            searchAfterSize,
            logger,
            refresh,
          });
        } else {
          throw new Error(`unknown rule type ${type}`);
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

            if (result.createdSignalsCount) {
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
            await ruleStatusService.success('succeeded', {
              bulkCreateTimeDurations: result.bulkCreateTimes,
              searchAfterTimeDurations: result.searchAfterTimes,
              lastLookBackDate: result.lastLookBackDate?.toISOString(),
            });
          }

          // adding this log line so we can get some information from cloud
          logger.info(
            buildRuleMessage(
              `[+] Finished indexing ${result.createdSignalsCount}  ${
                !isEmpty(result.totalToFromTuples)
                  ? `signals searched between date ranges ${JSON.stringify(
                      result.totalToFromTuples,
                      null,
                      2
                    )}`
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
          await ruleStatusService.error(errorMessage, {
            bulkCreateTimeDurations: result.bulkCreateTimes,
            searchAfterTimeDurations: result.searchAfterTimes,
            lastLookBackDate: result.lastLookBackDate?.toISOString(),
          });
        }
      } catch (error) {
        const errorMessage = error.message ?? '(no error message given)';
        const message = buildRuleMessage(
          'An error occurred during rule execution:',
          `message: "${errorMessage}"`
        );

        logger.error(message);
        await ruleStatusService.error(message, {
          bulkCreateTimeDurations: result.bulkCreateTimes,
          searchAfterTimeDurations: result.searchAfterTimes,
          lastLookBackDate: result.lastLookBackDate?.toISOString(),
        });
      }
    },
  };
};

const validateQueryRuleTypes = (ruleSO: SavedObject<AlertAttributes>) => {
  if (ruleSO.attributes.params.type === 'query') {
    return asTypeSpecificSO(ruleSO, queryRuleParams);
  } else {
    return asTypeSpecificSO(ruleSO, savedQueryRuleParams);
  }
};

/**
 * This function takes a generic rule SavedObject and a type-specific schema for the rule params
 * and validates the SavedObject params against the schema. If they validate, it returns a SavedObject
 * where the params have been replaced with the validated params. This eliminates the need for logic that
 * checks if the required type specific fields actually exist on the SO and prevents rule executors from
 * accessing fields that only exist on other rule types.
 *
 * @param ruleSO SavedObject typed as an object with all fields from all different rule types
 * @param schema io-ts schema for the specific rule type the SavedObject claims to be
 */
export const asTypeSpecificSO = <T extends t.Mixed>(
  ruleSO: SavedObject<AlertAttributes>,
  schema: T
) => {
  const [validated, errors] = validateNonExact(ruleSO.attributes.params, schema);
  if (validated == null || errors != null) {
    throw new Error(`Rule attempted to execute with invalid params: ${errors}`);
  }
  return {
    ...ruleSO,
    attributes: {
      ...ruleSO.attributes,
      params: validated,
    },
  };
};
