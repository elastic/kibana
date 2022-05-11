/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Logger } from '@kbn/core/server';
import type {
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import { RuleType } from '@kbn/alerting-plugin/server';
import type { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/server';
import { PLUGIN, TRANSFORM_RULE_TYPE } from '../../../../common/constants';
import { transformHealthRuleParams, TransformHealthRuleParams } from './schema';
import { transformHealthServiceProvider } from './transform_health_service';

export interface BaseResponse {
  transform_id: string;
  description?: string;
}

export interface NotStartedTransformResponse extends BaseResponse {
  transform_state: string;
  node_name?: string;
}

export interface ErrorMessagesTransformResponse extends BaseResponse {
  error_messages: Array<{ message: string; timestamp: number; node_name?: string }>;
}

export type TransformHealthResult = NotStartedTransformResponse | ErrorMessagesTransformResponse;

export type TransformHealthAlertContext = {
  results: TransformHealthResult[];
  message: string;
} & AlertInstanceContext;

export const TRANSFORM_ISSUE = 'transform_issue';

export type TransformIssue = typeof TRANSFORM_ISSUE;

export const TRANSFORM_ISSUE_DETECTED: ActionGroup<TransformIssue> = {
  id: TRANSFORM_ISSUE,
  name: i18n.translate('xpack.transform.alertingRuleTypes.transformHealth.actionGroupName', {
    defaultMessage: 'Issue detected',
  }),
};

interface RegisterParams {
  logger: Logger;
  alerting: AlertingSetup;
}

export function registerTransformHealthRuleType(params: RegisterParams) {
  const { alerting } = params;
  alerting.registerType(getTransformHealthRuleType());
}

export function getTransformHealthRuleType(): RuleType<
  TransformHealthRuleParams,
  never,
  RuleTypeState,
  AlertInstanceState,
  TransformHealthAlertContext,
  TransformIssue
> {
  return {
    id: TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH,
    name: i18n.translate('xpack.transform.alertingRuleTypes.transformHealth.name', {
      defaultMessage: 'Transform health',
    }),
    actionGroups: [TRANSFORM_ISSUE_DETECTED],
    defaultActionGroupId: TRANSFORM_ISSUE,
    validate: { params: transformHealthRuleParams },
    actionVariables: {
      context: [
        {
          name: 'results',
          description: i18n.translate(
            'xpack.transform.alertTypes.transformHealth.alertContext.resultsDescription',
            {
              defaultMessage: 'Rule execution results',
            }
          ),
        },
        {
          name: 'message',
          description: i18n.translate(
            'xpack.transform.alertTypes.transformHealth.alertContext.messageDescription',
            {
              defaultMessage: 'Alert info message',
            }
          ),
        },
      ],
    },
    producer: 'stackAlerts',
    minimumLicenseRequired: PLUGIN.MINIMUM_LICENSE_REQUIRED,
    isExportable: true,
    async executor(options) {
      const {
        services: { scopedClusterClient, alertFactory },
        params,
      } = options;

      const transformHealthService = transformHealthServiceProvider(
        scopedClusterClient.asCurrentUser
      );

      const executionResult = await transformHealthService.getHealthChecksResults(params);

      if (executionResult.length > 0) {
        executionResult.forEach(({ name: alertInstanceName, context }) => {
          const alertInstance = alertFactory.create(alertInstanceName);
          alertInstance.scheduleActions(TRANSFORM_ISSUE, context);
        });
      }
    },
  };
}
