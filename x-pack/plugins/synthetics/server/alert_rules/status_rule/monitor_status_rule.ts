/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { isEmpty } from 'lodash';
import { ActionGroupIdsOf } from '@kbn/alerting-plugin/common';
import { createLifecycleRuleTypeFactory, IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import { DOWN_LABEL, getMonitorAlertDocument, getMonitorSummary } from './message_utils';
import {
  SyntheticsCommonState,
  SyntheticsMonitorStatusAlertState,
} from '../../../common/runtime_types/alert_rules/common';
import { UptimeCorePluginsSetup, UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { OverviewStatus } from '../../../common/runtime_types';
import { StatusRuleExecutor } from './status_rule_executor';
import { StatusRulePramsSchema } from '../../../common/rules/status_rule';
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
} from '../common';
import { getActionVariables } from '../action_variables';
import { STATUS_RULE_NAME } from '../translations';
import {
  ALERT_DETAILS_URL,
  VIEW_IN_APP_URL,
} from '../../legacy_uptime/lib/alerts/action_variables';
import { UMServerLibs } from '../../legacy_uptime/uptime_server';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { UptimeRuleTypeAlertDefinition } from '../../legacy_uptime/lib/alerts/common';

export type ActionGroupIds = ActionGroupIdsOf<typeof MONITOR_STATUS>;

export const registerSyntheticsStatusCheckRule = (
  server: UptimeServerSetup,
  libs: UMServerLibs,
  plugins: UptimeCorePluginsSetup,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  ruleDataClient: IRuleDataClient
) => {
  const createLifecycleRuleType = createLifecycleRuleTypeFactory({
    ruleDataClient,
    logger: server.logger,
  });

  return createLifecycleRuleType({
    id: SYNTHETICS_ALERT_RULE_TYPES.MONITOR_STATUS,
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
    async executor({ state, params, services, spaceId, previousStartedAt }) {
      const ruleState = state as SyntheticsCommonState;

      const { basePath } = server;
      const {
        alertFactory,
        getAlertUuid,
        savedObjectsClient,
        scopedClusterClient,
        alertWithLifecycle,
        uiSettingsClient,
      } = services;

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
        const locationId = statusRule.getLocationId(ping.observer?.geo?.name!) ?? '';
        const alertId = idWithLocation;
        const monitorSummary = getMonitorSummary(
          ping,
          DOWN_LABEL,
          locationId,
          configId,
          dateFormat,
          tz
        );

        const alert = alertWithLifecycle({
          id: alertId,
          fields: getMonitorAlertDocument(monitorSummary),
        });
        const alertUuid = getAlertUuid(alertId);
        const alertState = alert.getState() as SyntheticsMonitorStatusAlertState;
        const errorStartedAt: string = alertState.errorStartedAt || ping['@timestamp'];

        let relativeViewInAppUrl = '';
        if (monitorSummary.stateId) {
          relativeViewInAppUrl = getRelativeViewInAppUrl({
            configId,
            stateId: monitorSummary.stateId,
            locationId,
          });
        }

        const context = {
          ...monitorSummary,
          errorStartedAt,
          linkMessage: monitorSummary.stateId
            ? getFullViewInAppMessage(basePath, spaceId, relativeViewInAppUrl)
            : '',
          [VIEW_IN_APP_URL]: getViewInAppUrl(basePath, spaceId, relativeViewInAppUrl),
        };

        alert.replaceState({
          ...updateState(ruleState, true),
          ...context,
          idWithLocation,
        });

        alert.scheduleActions(MONITOR_STATUS.id, {
          ...context,
          [ALERT_DETAILS_URL]: getAlertDetailsUrl(basePath, spaceId, alertUuid),
        });
      });

      setRecoveredAlertsContext({
        alertFactory,
        basePath,
        getAlertUuid,
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
    alerts: UptimeRuleTypeAlertDefinition,
  });
};
