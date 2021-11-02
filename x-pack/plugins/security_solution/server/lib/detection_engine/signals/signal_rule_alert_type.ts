/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* eslint-disable complexity */

import { Logger } from 'src/core/server';
import isEmpty from 'lodash/isEmpty';

import * as t from 'io-ts';
import { validateNonExact, parseScheduleDates } from '@kbn/securitysolution-io-ts-utils';
import { SIGNALS_ID } from '@kbn/securitysolution-rules';

import { DEFAULT_SEARCH_AFTER_PAGE_SIZE, SERVER_APP_ID } from '../../../../common/constants';
import { isMlRule } from '../../../../common/machine_learning/helpers';
import {
  isThresholdRule,
  isEqlRule,
  isThreatMatchRule,
  isQueryRule,
} from '../../../../common/detection_engine/utils';
import { SetupPlugins } from '../../../plugin';
import { getInputIndex } from './get_input_output_index';
import { SignalRuleAlertTypeDefinition, ThresholdAlertState } from './types';
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
import {
  IRuleExecutionLogClient,
  RuleExecutionLogClient,
  truncateMessageList,
} from '../rule_execution_log';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { scheduleThrottledNotificationActions } from '../notifications/schedule_throttle_notification_actions';
import { IEventLogService } from '../../../../../event_log/server';

export const signalRulesAlertType = ({
  logger,
  eventsTelemetry,
  experimentalFeatures,
  version,
  ml,
  lists,
  config,
  eventLogService,
  indexNameOverride,
  ruleExecutionLogClientOverride,
  refreshOverride,
}: {
  logger: Logger;
  eventsTelemetry: TelemetryEventsSender | undefined;
  experimentalFeatures: ExperimentalFeatures;
  version: string;
  ml: SetupPlugins['ml'] | undefined;
  lists: SetupPlugins['lists'] | undefined;
  config: ConfigType;
  eventLogService: IEventLogService;
  indexNameOverride?: string;
  refreshOverride?: string;
  ruleExecutionLogClientOverride?: IRuleExecutionLogClient;
}): SignalRuleAlertTypeDefinition => {
  const { alertMergeStrategy: mergeStrategy, alertIgnoreFields: ignoreFields } = config;
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
      rule,
    }) {
      const { ruleId, maxSignals, meta, outputIndex, timestampOverride, type } = params;

      const searchAfterSize = Math.min(maxSignals, DEFAULT_SEARCH_AFTER_PAGE_SIZE);
      let hasError: boolean = false;
      let result = createSearchAfterReturnType();

      const ruleStatusClient = ruleExecutionLogClientOverride
        ? ruleExecutionLogClientOverride
        : new RuleExecutionLogClient({
            underlyingClient: config.ruleExecutionLog.underlyingClient,
            savedObjectsClient: services.savedObjectsClient,
            eventLogService,
          });

      const completeRule: CompleteRule<RuleParams> = {
        alertId,
        ruleConfig: rule,
        ruleParams: params,
      };

      const {
        actions,
        name,
        schedule: { interval },
        ruleTypeId,
      } = completeRule.ruleConfig;

      const refresh = refreshOverride ?? actions.length ? 'wait_for' : false;
      const buildRuleMessage = buildRuleMessageFactory({
        id: alertId,
        ruleId,
        name,
        index: indexNameOverride ?? outputIndex,
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
          const hasTimestampOverride = timestampOverride != null && !isEmpty(timestampOverride);
          const inputIndices = await getInputIndex({
            services,
            version,
            index,
            experimentalFeatures,
          });
          const privileges = await checkPrivileges(services, inputIndices);

          wroteWarningStatus = await hasReadIndexPrivileges({
            ...basicLogArguments,
            privileges,
            logger,
            buildRuleMessage,
            ruleStatusClient,
          });

          if (!wroteWarningStatus) {
            const timestampFieldCaps = await services.scopedClusterClient.asCurrentUser.fieldCaps({
              index,
              fields: hasTimestampOverride
                ? ['@timestamp', timestampOverride as string]
                : ['@timestamp'],
              include_unmapped: true,
            });
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
          ...basicLogArguments,
          newStatus: RuleExecutionStatus.failed,
          message: gapMessage,
          metrics: { executionGap: remainingGap },
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
          refresh,
          indexNameOverride
        );

        const wrapHits = wrapHitsFactory({
          completeRule,
          signalsIndex: indexNameOverride ?? params.outputIndex,
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
              buildRuleMessage(`Found ${result.createdSignalsCount} signals for notification.`)
            );

            if (completeRule.ruleConfig.throttle != null) {
              await scheduleThrottledNotificationActions({
                alertInstance: services.alertInstanceFactory(alertId),
                throttle: completeRule.ruleConfig.throttle,
                startedAt,
                id: alertId,
                kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
                  ?.kibana_siem_app_url,
                outputIndex: indexNameOverride ?? outputIndex,
                ruleId,
                signals: result.createdSignals,
                esClient: services.scopedClusterClient.asCurrentUser,
                notificationRuleParams,
                logger,
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
              `[+] Finished indexing ${result.createdSignalsCount} signals into ${
                indexNameOverride ?? outputIndex
              }`
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
                lastLookBackDate: result.lastLookBackDate?.toISOString(),
              },
            });
          }

          logger.debug(
            buildRuleMessage(
              `[+] Finished indexing ${result.createdSignalsCount}  ${
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
              outputIndex,
              ruleId,
              signals: result.createdSignals,
              esClient: services.scopedClusterClient.asCurrentUser,
              notificationRuleParams,
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
              lastLookBackDate: result.lastLookBackDate?.toISOString(),
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
            outputIndex,
            ruleId,
            signals: result.createdSignals,
            esClient: services.scopedClusterClient.asCurrentUser,
            notificationRuleParams,
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
            lastLookBackDate: result.lastLookBackDate?.toISOString(),
          },
        });
      }
    },
  };
};

const validateQueryRuleTypes = (completeRule: CompleteRule<RuleParams>) => {
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
  completeRule: CompleteRule<RuleParams>,
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
