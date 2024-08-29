/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import { GetViewInAppRelativeUrlFnOpts, AlertsClientError } from '@kbn/alerting-plugin/server';
import { observabilityPaths } from '@kbn/observability-plugin/common';
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

      const {
        isLocationBased,
        isTimeWindow,
        isChecksBased,
        downThreshold,
        numberOfLocations,
        numberOfChecks,
      } = getConditionType(params.condition);

      if (isLocationBased) {
        handleLocationBasedAlert({
          downConfigsById: getConfigsByIds(downConfigs),
          locationsThreshold: numberOfLocations,
          downThreshold,
          statusRule,
        });
      } else {
        handleDownMonitorThresholdAlert({
          groupBy: params?.condition?.groupBy ?? 'locationId',
          downConfigsById: getConfigsByIds(downConfigs),
          downConfigs,
          downThreshold,
          isCustomRule,
          statusRule,
          isTimeWindow,
          isChecksBased,
        });
      }

      setRecoveredAlertsContext({
        alertsClient,
        basePath,
        spaceId,
        staleDownConfigs,
        upConfigs,
        dateFormat,
        tz,
        numberOfChecks,
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

const getConfigsByIds = (downConfigs: StatusConfigs): Map<string, AlertStatusMetaDataCodec[]> => {
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

const handleLocationBasedAlert = ({
  downConfigsById,
  locationsThreshold,
  downThreshold,
  statusRule,
}: {
  downConfigsById: Map<string, AlertStatusMetaDataCodec[]>;
  locationsThreshold: number;
  downThreshold: number;
  statusRule: StatusRuleExecutor;
}) => {
  // for location based we need to make sure, monitor is down for the threshold for all locations
  // lets build a map of monitors for each location
  for (const [configId, configs] of downConfigsById) {
    const matchingLocationsWithDownThreshold = configs.filter(
      (config) => config.checks.downWithinXChecks >= downThreshold // 2
    );
    if (matchingLocationsWithDownThreshold.length < locationsThreshold) {
      continue;
    }
    const monitorSummary = statusRule.getLocationBasedDownSummary({
      statusConfigs: configs,
      downThreshold,
    });
    const alertId = `${configId}_locations_based`;
    statusRule.scheduleAlert({
      idWithLocation: `${configId}-${configs[0].locationId}`,
      alertId,
      monitorSummary,
      statusConfig: configs[0],
      downThreshold,
    });
  }
};

const handleDownMonitorThresholdAlert = ({
  groupBy,
  downConfigs,
  downConfigsById,
  downThreshold,
  isCustomRule,
  isTimeWindow,
  isChecksBased,
  statusRule,
}: {
  groupBy: string;
  downConfigsById: Map<string, AlertStatusMetaDataCodec[]>;
  downConfigs: StatusConfigs;
  downThreshold: number;
  isCustomRule: boolean;
  isTimeWindow?: boolean;
  isChecksBased?: boolean;
  statusRule: StatusRuleExecutor;
}) => {
  const groupByLocation = groupBy === 'locationId';
  if (groupByLocation) {
    Object.entries(downConfigs).forEach(([idWithLocation, statusConfig]) => {
      const { checks } = statusConfig;
      const isTimeWindowConditionMet = isTimeWindow && checks.down >= downThreshold;
      const isChecksConditionMet = isChecksBased && checks.downWithinXChecks >= downThreshold;
      if (isTimeWindowConditionMet || isChecksConditionMet) {
        const alertId = isCustomRule ? `${idWithLocation}_custom` : idWithLocation;
        const monitorSummary = statusRule.getMonitorDownSummary({
          statusConfig,
          downThreshold,
        });

        return statusRule.scheduleAlert({
          idWithLocation,
          alertId,
          monitorSummary,
          statusConfig,
          downThreshold,
        });
      }
    });
  } else {
    for (const [configId, configs] of downConfigsById) {
      const totalDownChecks = configs.reduce((acc, { checks }) => acc + checks.down, 0);
      const totalDownChecksWithinXChecks = configs.reduce(
        (acc, { checks }) => acc + checks.downWithinXChecks,
        0
      );
      const isTimeWindowConditionMet = isTimeWindow && totalDownChecks >= downThreshold;
      const isChecksConditionMet = isChecksBased && totalDownChecksWithinXChecks >= downThreshold;

      if (isTimeWindowConditionMet || isChecksConditionMet) {
        const alertId = configId;
        const monitorSummary = statusRule.getUngroupedDownSummary({
          statusConfigs: configs,
          downThreshold,
        });
        return statusRule.scheduleAlert({
          idWithLocation: configId,
          alertId,
          monitorSummary,
          statusConfig: configs[0],
          downThreshold,
        });
      }
    }
  }
};
