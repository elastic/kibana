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

      const { isTimeWindow, downThreshold, numberOfLocations, numberOfChecks } = getConditionType(
        params.condition
      );

      handleDownMonitorThresholdAlert({
        groupBy: params?.condition?.groupBy ?? 'locationId',
        downConfigsById: getConfigsByIds(downConfigs),
        downConfigs,
        downThreshold,
        numberOfLocations,
        isCustomRule,
        statusRule,
        isTimeWindow,
      });

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

const getDoesMonitorMeetLocationThreshold = ({
  matchesByLocation,
  locationsThreshold,
  downThreshold,
  useTimeWindow,
}: {
  matchesByLocation: AlertStatusMetaDataCodec[];
  locationsThreshold: number;
  downThreshold: number;
  useTimeWindow: boolean;
}) => {
  // for location based we need to make sure, monitor is down for the threshold for all locations
  const getMatchingLocationsWithDownThresholdWithXChecks = (
    matches: AlertStatusMetaDataCodec[]
  ) => {
    return matches.filter((config) => config.checks.downWithinXChecks >= downThreshold);
  };
  const getMatchingLocationsWithDownThresholdWithinTimeWindow = (
    matches: AlertStatusMetaDataCodec[]
  ) => {
    return matches.filter((config) => config.checks.down >= downThreshold);
  };
  if (useTimeWindow) {
    const matchingLocationsWithDownThreshold =
      getMatchingLocationsWithDownThresholdWithinTimeWindow(matchesByLocation);
    return matchingLocationsWithDownThreshold.length >= locationsThreshold;
  } else {
    const matchingLocationsWithDownThreshold =
      getMatchingLocationsWithDownThresholdWithXChecks(matchesByLocation);
    return matchingLocationsWithDownThreshold.length >= locationsThreshold;
  }
};

const handleDownMonitorThresholdAlert = ({
  groupBy,
  downConfigs,
  downConfigsById,
  downThreshold,
  numberOfLocations,
  isCustomRule,
  isTimeWindow,
  statusRule,
}: {
  groupBy: string;
  downConfigsById: Map<string, AlertStatusMetaDataCodec[]>;
  downConfigs: StatusConfigs;
  downThreshold: number;
  numberOfLocations: number;
  isCustomRule: boolean;
  isTimeWindow?: boolean;
  statusRule: StatusRuleExecutor;
}) => {
  const groupByLocation = groupBy === 'locationId';
  if (groupByLocation) {
    Object.entries(downConfigs).forEach(([idWithLocation, statusConfig]) => {
      const doesMonitorMeetLocationThreshold = getDoesMonitorMeetLocationThreshold({
        matchesByLocation: [statusConfig],
        locationsThreshold: numberOfLocations,
        downThreshold,
        useTimeWindow: isTimeWindow || false,
      });
      if (doesMonitorMeetLocationThreshold) {
        const alertId = isCustomRule ? `${idWithLocation}_custom` : idWithLocation;
        const monitorSummary = statusRule.getMonitorDownSummary({
          statusConfig,
          downThreshold,
          numberOfLocations,
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
      const doesMonitorMeetLocationThreshold = getDoesMonitorMeetLocationThreshold({
        matchesByLocation: configs,
        locationsThreshold: numberOfLocations,
        downThreshold,
        useTimeWindow: isTimeWindow || false,
      });

      if (doesMonitorMeetLocationThreshold) {
        const alertId = configId;
        const monitorSummary = statusRule.getUngroupedDownSummary({
          statusConfigs: configs,
          downThreshold,
          numberOfLocations,
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
