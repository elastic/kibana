/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';

import { validateNonExact } from '@kbn/securitysolution-io-ts-utils';
import { SIGNALS_ID } from '@kbn/securitysolution-rules';

import { SERVER_APP_ID } from '../../../../common/constants';
import { SetupPlugins } from '../../../plugin';
import { SignalRuleAlertTypeDefinition } from './types';
import { TelemetryEventsSender } from '../../telemetry/sender';
import { ruleParams, RuleParams } from '../schemas/rule_schemas';
import { ConfigType } from '../../../config';
import { ExperimentalFeatures } from '../../../../common/experimental_features';
import { injectReferences, extractReferences } from './saved_object_references';
import { IRuleExecutionLogClient, RuleExecutionLogClient } from '../rule_execution_log';
import { RuleExecutionStatus } from '../../../../common/detection_engine/schemas/common/schemas';
import { scheduleThrottledNotificationActions } from '../notifications/schedule_throttle_notification_actions';
import { IEventLogService } from '../../../../../event_log/server';
import { siemRuleActionGroups } from './siem_rule_action_groups';

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
}): SignalRuleAlertTypeDefinition => ({
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
  async executor({ alertId, params, rule, services, spaceId, startedAt }) {
    const { meta, outputIndex, ruleId } = params;
    const { name: ruleName, ruleTypeId: ruleType, throttle } = rule;

    const ruleStatusClient = ruleExecutionLogClientOverride
      ? ruleExecutionLogClientOverride
      : new RuleExecutionLogClient({
          underlyingClient: config.ruleExecutionLog.underlyingClient,
          savedObjectsClient: services.savedObjectsClient,
          eventLogService,
          logger,
        });

    const message =
      'It looks like you forgot to disable the rule before upgrading. ' +
      'Please disable and reenable the rule to avoid further disruption of service.';
    logger.warn(message);

    await ruleStatusClient.logStatusChange({
      message,
      newStatus: RuleExecutionStatus.failed,
      ruleId: alertId,
      ruleType,
      ruleName,
      spaceId,
    });

    // NOTE: Since this is throttled we have to call it even on an error condition, otherwise it will "reset" the throttle and fire early
    if (throttle != null) {
      await scheduleThrottledNotificationActions({
        alertInstance: services.alertInstanceFactory(ruleId),
        throttle: throttle ?? '',
        startedAt,
        id: ruleId,
        kibanaSiemAppUrl: (meta as { kibana_siem_app_url?: string } | undefined)
          ?.kibana_siem_app_url,
        outputIndex,
        ruleId,
        signals: [],
        esClient: services.scopedClusterClient.asCurrentUser,
        notificationRuleParams: {
          ...params,
          id: alertId,
          name: ruleName,
        },
        logger,
      });
    }
  },
});
