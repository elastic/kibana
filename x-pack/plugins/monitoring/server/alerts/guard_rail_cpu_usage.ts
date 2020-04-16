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
} from '../../common/constants';
import { AlertType, AlertExecutorOptions } from '../../../alerting/server';
import { executeActions, getUiMessage, getThreshold } from '../lib/alerts/guard_rail_cpu_usage.lib';
import { AlertCreationParameters, AlertCpuUsageState, AlertCluster } from './types';
import { getPreparedAlert } from '../lib/alerts/get_prepared_alert';
import { fetchCpuUsageNodeStats } from '../lib/alerts/fetch_cpu_usage_node_stats';

export const getGuardRailCpuUsage = (creationParams: AlertCreationParameters): AlertType => {
  const { getUiSettingsService, monitoringCluster, getLogger, config, kibanaUrl } = creationParams;
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
    async executor({ services, params, state }: AlertExecutorOptions): Promise<void> {
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
        return;
      }

      const { emailAddress, callCluster, indexPattern, clusters } = preparedAlert;

      const stats = await fetchCpuUsageNodeStats(callCluster, indexPattern, clusters);
      if (stats.length === 0) {
        logger.warn(`No data found for cpu usage alert.`);
        return;
      }

      const defaultAlertState: AlertCpuUsageState = {
        cpuUsage: 0,
        nodeId: '',
        nodeName: '',
        cluster: {
          clusterUuid: '',
          clusterName: '',
        },
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

      const threshold = await getThreshold(uiSettings);

      logger.debug(`Using ${threshold} threshold`);

      for (const stat of stats) {
        const cluster = clusters.find((c: AlertCluster) => c.clusterUuid === stat.clusterUuid);
        if (!cluster) {
          logger.warn(`Unable to find cluster for clusterUuid='${stat.clusterUuid}'`);
          continue;
        }

        const instance = services.alertInstanceFactory(
          `${ALERT_GUARD_RAIL_TYPE_CPU_USAGE}:${stat.clusterUuid}:${stat.nodeId}`
        );
        const alertState: AlertCpuUsageState = {
          ...defaultAlertState,
          ...instance.getState(),
          cluster,
          nodeId: stat.nodeId,
          nodeName: stat.nodeName,
        };

        let cpuUsage = 0;
        if (config.ui.container.elasticsearch.enabled) {
          cpuUsage =
            (stat.containerUsage / (stat.containerPeriods * stat.containerQuota * 1000)) * 100;
        } else {
          cpuUsage = stat.cpuUsage;
        }

        let shouldExecuteActions = false;
        if (cpuUsage > threshold) {
          logger.debug(
            `Cpu usage (${cpuUsage}%) is over the configured threshold of ${threshold}%`
          );
          alertState.cpuUsage = cpuUsage;
          alertState.ui.triggeredMS = +new Date();
          alertState.ui.message = getUiMessage(alertState, stat);
          alertState.ui.severity = 2001;
          alertState.ui.resolvedMS = 0;
          alertState.ui.isFiring = true;
          shouldExecuteActions = true;
        } else if (cpuUsage < threshold && alertState.ui.isFiring) {
          logger.debug(
            `Cpu usage (${cpuUsage}%) is under the configured threshold of ${threshold}%`
          );
          alertState.cpuUsage = cpuUsage;
          alertState.ui.isFiring = false;
          alertState.ui.resolvedMS = moment().valueOf();
          alertState.ui.message = getUiMessage(alertState, stat);
          shouldExecuteActions = true;
        }

        instance.replaceState(alertState);
        if (shouldExecuteActions) {
          executeActions(instance, alertState, stat, cluster, kibanaUrl, config, emailAddress);
        }
      }
    },
  };
};
