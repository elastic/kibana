/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import {
  GetViewInAppRelativeUrlFnOpts,
  AlertInstanceContext as AlertContext,
  RuleExecutorOptions,
  AlertsClientError,
} from '@kbn/alerting-plugin/server';
import { observabilityPaths } from '@kbn/observability-plugin/common';
import { ObservabilityUptimeAlert } from '@kbn/alerts-as-data-utils';
import { syntheticsRuleFieldMap } from '../../../common/rules/synthetics_rule_field_map';
import { SyntheticsPluginsSetupDependencies, SyntheticsServerSetup } from '../../types';
import { DOWN_LABEL, getMonitorAlertDocument, getMonitorSummary } from './message_utils';
import {
  SyntheticsCommonState,
  SyntheticsMonitorStatusAlertState,
} from '../../../common/runtime_types/alert_rules/common';
import { OverviewStatus } from '../../../common/runtime_types';
import { StatusRuleExecutor } from './status_rule_executor';
import { StatusRulePramsSchema, StatusRuleParams } from '../../../common/rules/status_rule';
import {
  MONITOR_STATUS,
  SYNTHETICS_ALERT_RULE_TYPES,
} from '../../../common/constants/synthetics_alerts';
import {
  setRecoveredAlertsContext,
  updateState,
  getAlertDetailsUrl,
  getViewInAppUrl,
  getRelativeViewInAppUrl,
  getFullViewInAppMessage,
  SyntheticsRuleTypeAlertDefinition,
} from '../common';
import { ALERT_DETAILS_URL, getActionVariables, VIEW_IN_APP_URL } from '../action_variables';
import { STATUS_RULE_NAME } from '../translations';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';

type MonitorStatusRuleTypeParams = StatusRuleParams;
type MonitorStatusActionGroups = ActionGroupIdsOf<typeof MONITOR_STATUS>;
type MonitorStatusRuleTypeState = SyntheticsCommonState;
type MonitorStatusAlertState = SyntheticsMonitorStatusAlertState;
type MonitorStatusAlertContext = AlertContext;
type MonitorStatusAlert = ObservabilityUptimeAlert;

export const registerSyntheticsStatusCheckRule = (
  server: SyntheticsServerSetup,
  plugins: SyntheticsPluginsSetupDependencies,
  syntheticsMonitorClient: SyntheticsMonitorClient
) => {
  if (!plugins.alerting) {
    throw new Error(
      'Cannot register the synthetics monitor status rule type. The alerting plugin needs to be enabled.'
    );
  }

  plugins.alerting.registerType({
    id: SYNTHETICS_ALERT_RULE_TYPES.MONITOR_STATUS,
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: 'uptime',
    name: STATUS_RULE_NAME,
    validate: {
      params: StatusRulePramsSchema,
    },
    defaultActionGroupId: MONITOR_STATUS.id,
    actionGroups: [MONITOR_STATUS],
    actionVariables: getActionVariables({ plugins }),
    isExportable: true,
    minimumLicenseRequired: 'basic',
    doesSetRecoveryContext: true,
    executor: async (
      options: RuleExecutorOptions<
        MonitorStatusRuleTypeParams,
        MonitorStatusRuleTypeState,
        MonitorStatusAlertState,
        MonitorStatusAlertContext,
        MonitorStatusActionGroups,
        MonitorStatusAlert
      >
    ) => {
      const { state: ruleState, params, services, spaceId, previousStartedAt, startedAt } = options;
      const { alertsClient, savedObjectsClient, scopedClusterClient, uiSettingsClient } = services;
      if (!alertsClient) {
        throw new AlertsClientError();
      }
      const { basePath } = server;
      const dateFormat = await uiSettingsClient.get('dateFormat');
      const timezone = await uiSettingsClient.get('dateFormat:tz');
      const tz = timezone === 'Browser' ? 'UTC' : timezone;

      const statusRule = new StatusRuleExecutor(
        previousStartedAt,
        params,
        savedObjectsClient,
        scopedClusterClient.asCurrentUser,
        server,
        syntheticsMonitorClient
      );

      const { downConfigs, staleDownConfigs, upConfigs } = await statusRule.getDownChecks(
        ruleState.meta?.downConfigs as OverviewStatus['downConfigs']
      );

      Object.entries(downConfigs).forEach(([idWithLocation, { ping, configId }]) => {
        const locationId = ping.observer.name ?? '';
        const alertId = idWithLocation;
        const monitorSummary = getMonitorSummary(
          ping,
          DOWN_LABEL,
          locationId,
          configId,
          dateFormat,
          tz
        );

        const { uuid, start } = alertsClient.report({
          id: alertId,
          actionGroup: MONITOR_STATUS.id,
        });
        const errorStartedAt = start ?? startedAt.toISOString();

        let relativeViewInAppUrl = '';
        if (monitorSummary.stateId) {
          relativeViewInAppUrl = getRelativeViewInAppUrl({
            configId,
            stateId: monitorSummary.stateId,
            locationId,
          });
        }

        const payload = getMonitorAlertDocument(monitorSummary);

        const context = {
          ...monitorSummary,
          idWithLocation,
          errorStartedAt,
          linkMessage: monitorSummary.stateId
            ? getFullViewInAppMessage(basePath, spaceId, relativeViewInAppUrl)
            : '',
          [VIEW_IN_APP_URL]: getViewInAppUrl(basePath, spaceId, relativeViewInAppUrl),
          [ALERT_DETAILS_URL]: getAlertDetailsUrl(basePath, spaceId, uuid),
        };

        alertsClient.setAlertData({
          id: alertId,
          payload,
          context,
        });
      });

      setRecoveredAlertsContext({
        alertsClient,
        basePath,
        spaceId,
        staleDownConfigs,
        upConfigs,
        dateFormat,
        tz,
      });

      return {
        state: updateState(ruleState, !isEmpty(downConfigs), { downConfigs }),
      };
    },
    alerts: SyntheticsRuleTypeAlertDefinition,
    fieldsForAAD: Object.keys(syntheticsRuleFieldMap),
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
};
