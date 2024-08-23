/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import { PluginSetupContract } from '@kbn/alerting-plugin/server';
import {
  GetViewInAppRelativeUrlFnOpts,
  AlertsClientError,
  IRuleTypeAlerts,
} from '@kbn/alerting-plugin/server';
import { observabilityPaths } from '@kbn/observability-plugin/common';
import { ObservabilityUptimeAlert } from '@kbn/alerts-as-data-utils';
import { StatusRuleExecutorOptions } from './types';
import { AlertStatusMetaDataCodec, StatusConfigs } from './queries/query_monitor_status_alert';
import { syntheticsRuleFieldMap } from '../../../common/rules/synthetics_rule_field_map';
import { SyntheticsPluginsSetupDependencies, SyntheticsServerSetup } from '../../types';
import { StatusRuleExecutor } from './status_rule_executor';
import { getConditionType, StatusRulePramsSchema } from '../../../common/rules/status_rule';
import {
  MONITOR_STATUS,
  SYNTHETICS_ALERT_RULE_TYPES,
} from '../../../common/constants/synthetics_alerts';
import {
  setRecoveredAlertsContext,
  updateState,
  SyntheticsRuleTypeAlertDefinition,
} from '../common';
import { getActionVariables } from '../action_variables';
import { STATUS_RULE_NAME } from '../translations';
import { SyntheticsMonitorClient } from '../../synthetics_service/synthetics_monitor/synthetics_monitor_client';

type MonitorStatusAlert = ObservabilityUptimeAlert;

export const registerSyntheticsStatusCheckRule = (
  server: SyntheticsServerSetup,
  plugins: SyntheticsPluginsSetupDependencies,
  syntheticsMonitorClient: SyntheticsMonitorClient,
  alerting: PluginSetupContract
) => {
  if (!alerting) {
    throw new Error(
      'Cannot register the synthetics monitor status rule type. The alerting plugin needs to be enabled.'
    );
  }

  alerting.registerType({
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
    executor: async (options: StatusRuleExecutorOptions) => {
      const { state: ruleState, params, services, spaceId, previousStartedAt } = options;
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
        syntheticsMonitorClient,
        options
      );

      const { downConfigs, staleDownConfigs, upConfigs } = await statusRule.getDownChecks(
        ruleState.meta?.downConfigs as StatusConfigs
      );

      const isCustomRule = !isEmpty(params);

      const { isLocationBased, downThreshold, numberOfLocations } = getConditionType(
        params.condition
      );

      const getConfigsByIds = () => {
        const downConfigsById = new Map<string, AlertStatusMetaDataCodec[]>();
        Object.entries(downConfigs).forEach(([_, config]) => {
          const { configId } = config;
          if (!downConfigsById.has(configId)) {
            downConfigsById.set(configId, []);
          }
          downConfigsById.get(configId)?.push(config);
        });
        return downConfigsById;
      };

      if (isLocationBased) {
        // for location based we need to make sure ,monitor is down for the threshold for all locations
        // lets build a map of monitors for each location
        const downConfigsById = getConfigsByIds();
        for (const [configId, configs] of downConfigsById) {
          const locationThreshold = numberOfLocations;
          const matchingLocations = configs.length;
          if (matchingLocations >= locationThreshold) {
            // make sure all locations are matching down threshold as well
            const matchingLocationsWithDownThreshold = configs.filter(
              (config) => config.checks.down >= downThreshold
            );
            if (matchingLocationsWithDownThreshold.length >= locationThreshold) {
              const monitorSummary = statusRule.getLocationBasedDownSummary({
                statusConfigs: configs,
                downThreshold: locationThreshold,
                noOfLocations: numberOfLocations,
              });
              const alertId = `${configId}_locations_based`;
              statusRule.scheduleAlert({
                idWithLocation: `${configId}-${configs[0].locationId}`,
                alertId,
                monitorSummary,
                statusConfig: configs[0],
                downThreshold: locationThreshold,
              });
            }
          }
        }
      } else {
        const groupByLocation = Boolean(params.condition?.groupBy === 'locationId');
        if (groupByLocation) {
          Object.entries(downConfigs).forEach(([idWithLocation, statusConfig]) => {
            const { checks } = statusConfig;
            if (checks.down >= downThreshold) {
              const alertId = isCustomRule ? `${idWithLocation}_custom` : idWithLocation;
              const monitorSummary = statusRule.getMonitorDownSummary({
                statusConfig,
                downThreshold,
              });

              statusRule.scheduleAlert({
                idWithLocation,
                alertId,
                monitorSummary,
                statusConfig,
                downThreshold,
              });
            }
          });
        } else {
          const downConfigsById = getConfigsByIds();
          for (const [configId, configs] of downConfigsById) {
            const totalDownChecks = configs.reduce((acc, { checks }) => acc + checks.down, 0);
            if (totalDownChecks >= downThreshold) {
              const alertId = configId;
              const monitorSummary = statusRule.getUngroupedDownSummary({
                statusConfigs: configs,
                downThreshold,
              });
              statusRule.scheduleAlert({
                idWithLocation: configId,
                alertId,
                monitorSummary,
                statusConfig: configs[0],
                downThreshold,
              });
            }
          }
        }
      }

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
    alerts: {
      ...SyntheticsRuleTypeAlertDefinition,
      shouldWrite: true,
    } as IRuleTypeAlerts<MonitorStatusAlert>,
    fieldsForAAD: Object.keys(syntheticsRuleFieldMap),
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  });
};
