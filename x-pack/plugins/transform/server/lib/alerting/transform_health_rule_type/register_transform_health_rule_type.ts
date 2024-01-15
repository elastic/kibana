/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Logger, DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type {
  ActionGroup,
  AlertInstanceContext,
  AlertInstanceState,
  RecoveredActionGroupId,
  RuleTypeState,
} from '@kbn/alerting-plugin/common';
import { AlertsClientError, DEFAULT_AAD_CONFIG, RuleType } from '@kbn/alerting-plugin/server';
import type { PluginSetupContract as AlertingSetup } from '@kbn/alerting-plugin/server';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/server';
import type { DefaultAlert } from '@kbn/alerts-as-data-utils';
import { ALERT_REASON } from '@kbn/rule-data-utils';
import { PLUGIN, type TransformHealth, TRANSFORM_RULE_TYPE } from '../../../../common/constants';
import { transformHealthRuleParams, TransformHealthRuleParams } from './schema';
import { transformHealthServiceProvider } from './transform_health_service';

export interface BaseTransformAlertResponse {
  transform_id: string;
  description?: string;
  health_status: TransformHealth;
  issues?: Array<{ issue: string; details?: string; count: number; first_occurrence?: string }>;
}

export interface TransformStateReportResponse extends BaseTransformAlertResponse {
  transform_state: string;
  node_name?: string;
}

export interface ErrorMessagesTransformResponse extends BaseTransformAlertResponse {
  error_messages: Array<{ message: string; timestamp: number; node_name?: string }>;
}

export type TransformHealthResult = TransformStateReportResponse | ErrorMessagesTransformResponse;

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
  getFieldFormatsStart: () => FieldFormatsStart;
}

export function registerTransformHealthRuleType(params: RegisterParams) {
  const { alerting } = params;
  alerting.registerType(getTransformHealthRuleType(params.getFieldFormatsStart));
}

export function getTransformHealthRuleType(
  getFieldFormatsStart: () => FieldFormatsStart
): RuleType<
  TransformHealthRuleParams,
  never,
  RuleTypeState,
  AlertInstanceState,
  TransformHealthAlertContext,
  TransformIssue,
  RecoveredActionGroupId,
  DefaultAlert
> {
  return {
    id: TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH,
    name: i18n.translate('xpack.transform.alertingRuleTypes.transformHealth.name', {
      defaultMessage: 'Transform health',
    }),
    actionGroups: [TRANSFORM_ISSUE_DETECTED],
    defaultActionGroupId: TRANSFORM_ISSUE,
    validate: { params: transformHealthRuleParams },
    schemas: {
      params: {
        type: 'config-schema',
        schema: transformHealthRuleParams,
      },
    },
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
    category: DEFAULT_APP_CATEGORIES.management.id,
    producer: 'stackAlerts',
    minimumLicenseRequired: PLUGIN.MINIMUM_LICENSE_REQUIRED,
    isExportable: true,
    doesSetRecoveryContext: true,
    alerts: DEFAULT_AAD_CONFIG,
    async executor(options) {
      const {
        services: { scopedClusterClient, alertsClient, uiSettingsClient },
        params,
      } = options;

      if (!alertsClient) {
        throw new AlertsClientError();
      }

      const fieldFormatsRegistry = await getFieldFormatsStart().fieldFormatServiceFactory(
        uiSettingsClient
      );

      const transformHealthService = transformHealthServiceProvider({
        esClient: scopedClusterClient.asCurrentUser,
        fieldFormatsRegistry,
      });

      const executionResult = await transformHealthService.getHealthChecksResults(params);

      const unhealthyTests = executionResult.filter(({ isHealthy }) => !isHealthy);

      if (unhealthyTests.length > 0) {
        unhealthyTests.forEach(({ name: alertInstanceName, context }) => {
          alertsClient.report({
            id: alertInstanceName,
            actionGroup: TRANSFORM_ISSUE,
            context,
            payload: {
              [ALERT_REASON]: context.message,
            },
          });
        });
      }

      // Set context for recovered alerts
      for (const recoveredAlert of alertsClient.getRecoveredAlerts()) {
        const recoveredAlertId = recoveredAlert.alert.getId();
        const testResult = executionResult.find((v) => v.name === recoveredAlertId);
        if (testResult) {
          alertsClient.setAlertData({
            id: recoveredAlertId,
            context: testResult.context,
            payload: {
              [ALERT_REASON]: testResult.context.message,
            },
          });
        }
      }

      return { state: {} };
    },
  };
}
