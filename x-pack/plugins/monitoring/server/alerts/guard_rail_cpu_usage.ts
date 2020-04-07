/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import {
  ALERT_GUARD_RAIL_TYPE_CPU_USAGE,
  INDEX_PATTERN_ELASTICSEARCH,
  MONITORING_CONFIG_ALERT_GUARD_RAIL_THRESHOLD,
  MONITORING_CONFIG_ALERT_GUARD_RAIL_THROTTLE,
} from '../../common/constants';
import { AlertType } from '../../../alerting/server';
import { executeActions, getUiMessage } from '../lib/alerts/guard_rail_cpu_usage.lib';
import {
  AlertCommonExecutorOptions,
  AlertCommonState,
  AlertCreationParameters,
  AlertCpuUsagePerClusterState,
  AlertCommonCluster,
} from './types';
import { getPreparedAlert } from '../lib/alerts/get_prepared_alert';
import { fetchCpuUsageNodeStats } from '../lib/alerts/fetch_cpu_usage_node_stats';

const DEFAULT_THRESHOLD = 90;
const DEFAULT_THROTTLE = '10m';

export const getGuardRailCpuUsage = (creationParams: AlertCreationParameters): AlertType => {
  const { getUiSettingsService, monitoringCluster, getLogger, config } = creationParams;
  const logger = getLogger(ALERT_GUARD_RAIL_TYPE_CPU_USAGE);
  return {
    id: ALERT_GUARD_RAIL_TYPE_CPU_USAGE,
    name: 'Monitoring Alert - Guard Rail',
    actionGroups: [
      {
        id: 'default',
        name: i18n.translate('xpack.monitoring.alerts.guardRail.actionGroups.default', {
          defaultMessage: 'Default',
        }),
      },
    ],
    defaultActionGroupId: 'default',
    async executor({
      services,
      params,
      state,
    }: AlertCommonExecutorOptions): Promise<AlertCommonState> {
      logger.debug(
        `Firing alert with params: ${JSON.stringify(params)} and state: ${JSON.stringify(state)}`
      );

      const preparedAlert = await getPreparedAlert(
        ALERT_GUARD_RAIL_TYPE_CPU_USAGE,
        getUiSettingsService,
        monitoringCluster,
        logger,
        config.ui.ccs.enabled,
        INDEX_PATTERN_ELASTICSEARCH,
        services
      );

      if (!preparedAlert) {
        return state;
      }

      const { emailAddress, callCluster, indexPattern, clusters, dateFormat } = preparedAlert;

      const stats = await fetchCpuUsageNodeStats(callCluster, indexPattern, clusters);
      if (stats.length === 0) {
        logger.warn(`No data found for cpu usage alert.`);
        return state;
      }

      const result: AlertCommonState = { ...state };
      const defaultAlertState: AlertCpuUsagePerClusterState = {
        cpuUsage: 0,
        ui: {
          isFiring: false,
          message: null,
          severity: 0,
          resolvedMS: 0,
          triggeredMS: 0,
          lastCheckedMS: 0,
        },
      };

      const uiSettings = (await getUiSettingsService()).asScopedToClient(
        services.savedObjectsClient
      );

      let configuredThrottle = await uiSettings.get<string>(
        MONITORING_CONFIG_ALERT_GUARD_RAIL_THROTTLE
      );
      if (!configuredThrottle) {
        configuredThrottle = DEFAULT_THROTTLE;
      }
      let configuredThreshold = await uiSettings.get<number>(
        MONITORING_CONFIG_ALERT_GUARD_RAIL_THRESHOLD
      );
      if (isNaN(configuredThreshold)) {
        configuredThreshold = DEFAULT_THRESHOLD;
      }

      logger.debug(`Using ${configuredThreshold} threshold`);

      for (const stat of stats) {
        const alertState: AlertCpuUsagePerClusterState =
          (state[stat.clusterUuid] as AlertCpuUsagePerClusterState) || defaultAlertState;
        const cluster = clusters.find(
          (c: AlertCommonCluster) => c.clusterUuid === stat.clusterUuid
        );
        if (!cluster) {
          logger.warn(`Unable to find cluster for clusterUuid='${stat.clusterUuid}'`);
          continue;
        }

        let cpuUsage = 0;
        if (config.ui.container.elasticsearch.enabled) {
          cpuUsage =
            (stat.containerUsage / (stat.containerPeriods * stat.containerQuota * 1000)) * 100;
        } else {
          cpuUsage = stat.cpuUsage;
        }

        const ui = alertState.ui;
        let triggered = ui.triggeredMS;
        let resolved = ui.resolvedMS;
        let message = ui.message || {};
        let lastCpuUsage = alertState.cpuUsage;
        let severity = ui.severity;
        let isFiring = ui.isFiring;
        const instance = services.alertInstanceFactory(ALERT_GUARD_RAIL_TYPE_CPU_USAGE);

        if (cpuUsage > configuredThreshold) {
          logger.debug(
            `Cpu usage (${cpuUsage}%) is over the configured threshold of ${configuredThreshold}%`
          );
          executeActions(
            instance,
            cluster,
            config,
            stat.nodeName,
            cpuUsage,
            dateFormat,
            emailAddress
          );
          lastCpuUsage = cpuUsage;
          triggered = moment().valueOf();
          message = getUiMessage(cpuUsage, stat.nodeName, triggered);
          severity = 2001;
          resolved = 0;
          isFiring = true;
        } else if (cpuUsage < configuredThreshold && isFiring) {
          logger.debug(
            `Cpu usage (${cpuUsage}%) is under the configured threshold of ${configuredThreshold}%`
          );
          executeActions(
            instance,
            cluster,
            config,
            stat.nodeName,
            cpuUsage,
            dateFormat,
            emailAddress,
            true
          );
          lastCpuUsage = cpuUsage;
          isFiring = false;
          resolved = moment().valueOf();
          message = getUiMessage(cpuUsage, stat.nodeName, resolved, true);
        }

        result[stat.clusterUuid] = {
          cpuUsage: lastCpuUsage,
          ui: {
            message,
            isFiring,
            severity,
            resolvedMS: resolved,
            triggeredMS: triggered,
            lastCheckedMS: moment().valueOf(),
          },
        } as AlertCpuUsagePerClusterState;
      }

      return result;
    },
  };
};
